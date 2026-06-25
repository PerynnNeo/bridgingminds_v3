import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, computeMetrics } from '@/lib/ai/transcribe';
import { generateAttemptFeedback } from '@/lib/ai/feedback';
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
export const maxDuration = 120;

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
  const text = String(form.get('text') ?? '').trim();
  const targetSkill = String(form.get('target_skill') ?? '').trim() || undefined;
  const category = String(form.get('category') ?? '').trim();
  const rawItemId = form.get('item_id');
  const cameraEnabled = String(form.get('camera_enabled') ?? '') === 'true';
  const visualMetrics = parseVisualMetrics(form.get('visual_metrics'));
  if (!(audio instanceof File) || !text) {
    return NextResponse.json({ error: 'A recording is required.' }, { status: 400 });
  }

  // Plan-aware daily usage limit.
  const { plan, limits } = await getPlanLimits(supabase, user.id);
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from('practice_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00.000Z`);
  if ((count ?? 0) >= limits.practiceAttemptsPerDay) {
    return NextResponse.json(
      plan === 'free'
        ? {
            error: 'You have used your free practice for today. Upgrade to Premium for much more.',
            upgrade: true,
          }
        : { error: "You have reached today's practice limit. Come back tomorrow." },
      { status: 429 },
    );
  }

  // Link a personalised DB item when one was provided (RLS verifies ownership).
  let practiceItemId: string | null = null;
  if (rawItemId) {
    const { data: item } = await supabase
      .from('practice_items')
      .select('id')
      .eq('id', String(rawItemId))
      .maybeSingle();
    practiceItemId = item?.id ?? null;
  }

  try {
    const buf = Buffer.from(await audio.arrayBuffer());
    const path = `${user.id}/practice/${randomUUID()}.webm`;
    await supabase.storage
      .from('recordings')
      .upload(path, buf, { contentType: audio.type || 'audio/webm', upsert: true })
      .then(
        () => {},
        () => {},
      );

    const transcript = await transcribeAudio(buf);
    const metrics = computeMetrics(transcript);
    const feedback = await generateAttemptFeedback({
      targetText: text,
      transcript: transcript.text,
      metrics,
      fillerWordCount: transcript.fillerWordCount,
      targetSkill,
      assessRelevance: category === 'thinking',
    });

    // Did they improve vs their last attempt? (spec: post-recording feedback)
    const { data: prevRows } = await supabase
      .from('practice_attempts')
      .select('clarity_score, pacing_score, pronunciation_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const prev = prevRows?.[0];
    let improved: boolean | null = null;
    if (
      prev &&
      prev.clarity_score != null &&
      prev.pacing_score != null &&
      prev.pronunciation_score != null
    ) {
      const prevAvg = (prev.clarity_score + prev.pacing_score + prev.pronunciation_score) / 3;
      const curAvg = (feedback.clarityScore + feedback.pacingScore + feedback.pronunciationScore) / 3;
      improved = curAvg > prevAvg + 1;
    }

    // Visual delivery feedback (only when the camera was used for this attempt).
    let visual: VisualFeedbackResult | null = null;
    if (cameraEnabled && visualMetrics && hasEnoughVisualData(visualMetrics)) {
      try {
        const baseline = await getVisualBaseline(supabase, user.id);
        visual = await generateVisualFeedback({
          activityType: 'practice',
          context: text,
          metrics: visualMetrics,
          speechSummary: feedback.feedback,
          baseline: baseline ?? undefined,
        });
      } catch {
        // Visual feedback is a bonus, never fail the attempt over it.
      }
    }

    const { data: attemptRow } = await supabase
      .from('practice_attempts')
      .insert({
        user_id: user.id,
        practice_item_id: practiceItemId,
        audio_path: path,
        transcript: transcript.text,
        clarity_score: feedback.clarityScore,
        pacing_score: feedback.pacingScore,
        pronunciation_score: feedback.pronunciationScore,
        filler_word_count: transcript.fillerWordCount,
        feedback: feedback.feedback,
        camera_enabled: cameraEnabled,
        visual_metrics: visualMetrics ? (visualMetrics as unknown as Json) : null,
        combined_feedback: visual ? (visual as unknown as Json) : null,
      })
      .select('id')
      .single();

    // Reflect the new attempt on the dashboard (spec P8 / D7).
    await updateDailyMetrics(supabase, user.id);

    // Record visual metrics for dashboard history (best-effort).
    if (cameraEnabled && visualMetrics) {
      await saveVisualAnalysis(supabase, {
        userId: user.id,
        activityType: 'practice',
        activityId: attemptRow?.id ?? null,
        metrics: visualMetrics,
        feedbackSummary: visual?.improvement,
      });
    }

    return NextResponse.json({ ...feedback, improved, visual });
  } catch (err) {
    console.error('[practice/attempt]', err);
    return NextResponse.json(
      { error: 'We could not score that attempt. Please try again.' },
      { status: 500 },
    );
  }
}
