import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, computeMetrics } from '@/lib/ai/transcribe';
import { generateOnboardingAnalysis } from '@/lib/ai/analyze';
import { analyzeReading } from '@/lib/onboarding/reading';
import { updateDailyMetrics } from '@/lib/metrics/dashboard';
import { READING_PASSAGE } from '@/lib/onboarding/content';
import {
  parseVisualMetrics,
  averageMetrics,
  hasEnoughVisualData,
  saveVisualAnalysis,
} from '@/lib/vision/server';
import { generateVisualBaseline } from '@/lib/ai/visual';
import type { VisualMetrics } from '@/lib/vision/types';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const reading = form.get('reading');
  const rapid = form.get('rapid');
  const rapidPrompt = String(form.get('rapid_prompt') ?? '');
  const readingText = String(form.get('reading_text') ?? READING_PASSAGE);
  const cameraEnabled = String(form.get('camera_enabled') ?? '') === 'true';
  const readingVisual = parseVisualMetrics(form.get('reading_visual'));
  const rapidVisual = parseVisualMetrics(form.get('rapid_visual'));

  if (!(reading instanceof File) || !(rapid instanceof File)) {
    return NextResponse.json({ error: 'Both recordings are required.' }, { status: 400 });
  }

  try {
    const readingBuf = Buffer.from(await reading.arrayBuffer());
    const rapidBuf = Buffer.from(await rapid.arrayBuffer());

    // Store recordings privately (best-effort, analysis proceeds even if this fails).
    const folder = `${user.id}/onboarding/${randomUUID()}`;
    const readingPath = `${folder}/reading.webm`;
    const rapidPath = `${folder}/rapid.webm`;
    await Promise.allSettled([
      supabase.storage.from('recordings').upload(readingPath, readingBuf, {
        contentType: reading.type || 'audio/webm',
        upsert: true,
      }),
      supabase.storage.from('recordings').upload(rapidPath, rapidBuf, {
        contentType: rapid.type || 'audio/webm',
        upsert: true,
      }),
    ]);

    // Transcribe both recordings in parallel.
    const [readingT, rapidT] = await Promise.all([
      transcribeAudio(readingBuf),
      transcribeAudio(rapidBuf),
    ]);

    const readingMetrics = computeMetrics(readingT);
    const rapidMetrics = computeMetrics(rapidT);

    // Deterministic reading fidelity (reliably catches skipped / mixed-up words).
    const readingFidelity = analyzeReading(readingText, readingT.text);

    // Generate the speech profile + personalised plan (Claude Opus, adaptive thinking).
    const { profile, plan } = await generateOnboardingAnalysis({
      readingTranscript: readingT.text,
      rapidAnswerTranscript: rapidT.text,
      readingMetrics,
      rapidMetrics,
      expectedReadingText: readingText,
      rapidPrompt,
      fillerWords: { reading: readingT.fillerWords, rapid: rapidT.fillerWords },
      reading: {
        coverage: readingFidelity.coverage,
        skipped: readingFidelity.skipped,
        substitutions: readingFidelity.substitutions,
      },
    });
    profile.readingAccuracy = readingFidelity.accuracy;

    // Visual delivery baseline (optional, only when the camera was used).
    const clips = [readingVisual, rapidVisual].filter((m): m is VisualMetrics => m !== null);
    const baseline = cameraEnabled ? averageMetrics(clips) : null;
    let visualSummary: string | null = null;
    let visualResponse: { summary: string; metrics: VisualMetrics } | null = null;
    if (baseline && hasEnoughVisualData(baseline)) {
      try {
        const vb = await generateVisualBaseline({
          metrics: baseline,
          speechSummary: profile.generatedSummary,
        });
        visualSummary = vb.summary;
        visualResponse = { summary: vb.summary, metrics: baseline };
      } catch {
        // Visual baseline is a bonus, never fail onboarding over it.
      }
    }

    // Persist everything.
    const { data: obSession } = await supabase
      .from('onboarding_sessions')
      .insert({
        user_id: user.id,
        reading_audio_path: readingPath,
        rapid_answer_audio_path: rapidPath,
        reading_transcript: readingT.text,
        rapid_answer_transcript: rapidT.text,
        analysis_status: 'completed',
        camera_enabled: cameraEnabled,
        visual_metrics: baseline ? (baseline as unknown as Json) : null,
      })
      .select('id')
      .single();

    await supabase.from('speech_profiles').insert({
      user_id: user.id,
      pacing_score: profile.pacingScore,
      clarity_score: profile.clarityScore,
      fluency_score: profile.fluencyScore,
      filler_word_rate: profile.fillerWordRate,
      pause_pattern_summary: profile.pausePatternSummary,
      common_mispronunciations: profile.commonMispronunciations,
      confidence_cues: profile.confidenceCues,
      strengths: profile.strengths,
      focus_areas: profile.focusAreas,
      generated_summary: profile.generatedSummary,
      reading_accuracy_score: readingFidelity.accuracy,
      on_topic_score: profile.onTopicScore ?? null,
      visual_metrics: baseline ? (baseline as unknown as Json) : null,
      visual_summary: visualSummary,
    });

    const { data: planRow } = await supabase
      .from('practice_plans')
      .insert({
        user_id: user.id,
        plan_title: plan.planTitle,
        plan_summary: plan.planSummary,
        focus_area: plan.focusArea,
        difficulty: plan.difficulty,
        active: true,
      })
      .select('id')
      .single();

    if (planRow && plan.items.length > 0) {
      await supabase.from('practice_items').insert(
        plan.items.map((item) => ({
          plan_id: planRow.id,
          user_id: user.id,
          item_type: item.itemType,
          text: item.text,
          target_skill: item.targetSkill,
          difficulty: item.difficulty,
        })),
      );
    }

    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);

    // Seed the first progress-metrics row so the dashboard has a baseline.
    await updateDailyMetrics(supabase, user.id);

    // Record per-clip visual metrics for dashboard history (best-effort).
    if (cameraEnabled) {
      const activityId = obSession?.id ?? null;
      if (readingVisual)
        await saveVisualAnalysis(supabase, {
          userId: user.id,
          activityType: 'onboarding',
          activityId,
          metrics: readingVisual,
        });
      if (rapidVisual)
        await saveVisualAnalysis(supabase, {
          userId: user.id,
          activityType: 'onboarding',
          activityId,
          metrics: rapidVisual,
        });
    }

    return NextResponse.json({ profile, plan, visual: visualResponse });
  } catch (err) {
    console.error('[onboarding/analyze]', err);
    // Record the failed attempt (best-effort) so it's visible in the DB.
    await supabase
      .from('onboarding_sessions')
      .insert({ user_id: user.id, analysis_status: 'failed' })
      .then(
        () => {},
        () => {},
      );
    return NextResponse.json(
      { error: 'We could not finish your analysis. Please try again.' },
      { status: 500 },
    );
  }
}
