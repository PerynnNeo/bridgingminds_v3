import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, computeMetrics } from '@/lib/ai/transcribe';
import { generateDailyQuestionFeedback } from '@/lib/ai/game';
import { updateDailyMetrics } from '@/lib/metrics/dashboard';
import { USAGE_LIMITS, OVER_LIMIT_MESSAGE } from '@/config/limits';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DAILY_LIMIT = USAGE_LIMITS.dailyQuestion.mainPerDay + USAGE_LIMITS.dailyQuestion.retries;

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
  const question = String(form.get('question') ?? '').trim();
  if (!(audio instanceof File) || !question) {
    return NextResponse.json({ error: 'A recording is required.' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from('game_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('game_type', 'daily_question')
    .gte('created_at', `${today}T00:00:00.000Z`);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: OVER_LIMIT_MESSAGE }, { status: 429 });
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
    const metrics = computeMetrics(transcript);
    const feedback = await generateDailyQuestionFeedback({
      question,
      transcript: transcript.text,
      metrics,
      fillerWordCount: transcript.fillerWordCount,
    });

    await supabase.from('game_sessions').insert({
      user_id: user.id,
      game_type: 'daily_question',
      mode: 'solo_prompt',
      prompt: question,
      transcript: transcript.text,
      audio_path: path,
      clarity_score: feedback.clarityScore,
      pacing_score: feedback.pacingScore,
      structure_score: feedback.structureScore,
      confidence_score: feedback.confidenceScore,
      feedback: feedback.feedback,
    });

    await updateDailyMetrics(supabase, user.id);

    return NextResponse.json(feedback);
  } catch (err) {
    console.error('[games/daily]', err);
    const message = err instanceof Error ? err.message : 'Scoring failed.';
    return NextResponse.json({ error: `We couldn't score that. ${message}` }, { status: 500 });
  }
}
