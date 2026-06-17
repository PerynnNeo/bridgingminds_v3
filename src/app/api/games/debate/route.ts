import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, computeMetrics } from '@/lib/ai/transcribe';
import { generateDebateCounterpoint, generateDebateFeedback } from '@/lib/ai/game';
import { updateDailyMetrics } from '@/lib/metrics/dashboard';
import { getPlanLimits } from '@/lib/billing/plan';
import {
  parseVisualMetrics,
  hasEnoughVisualData,
  saveVisualAnalysis,
  getVisualBaseline,
} from '@/lib/vision/server';
import { generateVisualFeedback, type VisualFeedbackResult } from '@/lib/ai/visual';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const audio = form.get('audio');
  const phase = String(form.get('phase') ?? '');
  const topic = String(form.get('topic') ?? '').trim();
  const userSide = String(form.get('side') ?? 'agree') === 'disagree' ? 'disagree' : 'agree';
  const difficultyRaw = String(form.get('difficulty') ?? 'medium');
  const difficulty = difficultyRaw === 'easy' || difficultyRaw === 'hard' ? difficultyRaw : 'medium';
  const cameraEnabled = String(form.get('camera_enabled') ?? '') === 'true';
  const visualMetrics = parseVisualMetrics(form.get('visual_metrics'));
  if (!(audio instanceof File) || !topic || (phase !== 'argument' && phase !== 'rebuttal')) {
    return NextResponse.json({ error: 'A recording is required.' }, { status: 400 });
  }

  // Daily debate limit is checked when starting a new debate (the argument turn).
  if (phase === 'argument') {
    const { plan, limits } = await getPlanLimits(supabase, user.id);
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('game_type', 'debate')
      .gte('created_at', `${today}T00:00:00.000Z`);
    if ((count ?? 0) >= limits.debateSessionsPerDay) {
      return NextResponse.json(
        plan === 'free'
          ? { error: 'That is your free debate for today. Upgrade to Premium for more.', upgrade: true }
          : { error: "You have reached today's debate limit. Come back tomorrow." },
        { status: 429 },
      );
    }
  }

  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const path = `${user.id}/games/${randomUUID()}.webm`;
    await supabase.storage
      .from('recordings')
      .upload(path, buf, { contentType: audio.type || 'audio/webm', upsert: true })
      .then(
        () => {},
        () => {},
      );

    const transcript = await transcribeAudio(buf);

    if (phase === 'argument') {
      const { counterpoint } = await generateDebateCounterpoint({
        topic,
        userSide,
        argumentTranscript: transcript.text,
        difficulty,
      });
      return NextResponse.json({ transcript: transcript.text, counterpoint });
    }

    // rebuttal
    const argumentTranscript = String(form.get('argument_transcript') ?? '');
    const counterpoint = String(form.get('counterpoint') ?? '');
    const metrics = computeMetrics(transcript);
    const feedback = await generateDebateFeedback({
      topic,
      userSide,
      argumentTranscript,
      counterpoint,
      rebuttalTranscript: transcript.text,
      metrics,
    });

    let visual: VisualFeedbackResult | null = null;
    if (cameraEnabled && visualMetrics && hasEnoughVisualData(visualMetrics)) {
      try {
        const baseline = await getVisualBaseline(supabase, user.id);
        visual = await generateVisualFeedback({
          activityType: 'debate',
          context: topic,
          metrics: visualMetrics,
          speechSummary: feedback.feedback,
          baseline: baseline ?? undefined,
        });
      } catch {
        // Visual feedback is a bonus, never fail the debate over it.
      }
    }

    const { data: sessionRow } = await supabase
      .from('game_sessions')
      .insert({
        user_id: user.id,
        game_type: 'debate',
        mode: 'solo_ai',
        prompt: topic,
        transcript: `${argumentTranscript}\n\n[Rebuttal] ${transcript.text}`,
        audio_path: path,
        clarity_score: feedback.clarityScore,
        pacing_score: feedback.pacingScore,
        structure_score: feedback.structureScore,
        confidence_score: feedback.confidenceScore,
        feedback: feedback.feedback,
        camera_enabled: cameraEnabled,
        visual_metrics: visualMetrics ? (visualMetrics as unknown as Json) : null,
        combined_feedback: visual ? (visual as unknown as Json) : null,
      })
      .select('id')
      .single();

    await updateDailyMetrics(supabase, user.id);

    if (cameraEnabled && visualMetrics) {
      await saveVisualAnalysis(supabase, {
        userId: user.id,
        activityType: 'debate',
        activityId: sessionRow?.id ?? null,
        metrics: visualMetrics,
        feedbackSummary: visual?.improvement,
      });
    }

    return NextResponse.json({ transcript: transcript.text, feedback, visual });
  } catch (err) {
    console.error('[games/debate]', err);
    return NextResponse.json({ error: 'We could not process that. Please try again.' }, { status: 500 });
  }
}
