import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, computeMetrics } from '@/lib/ai/transcribe';
import { generateDebateCounterpoint, generateDebateFeedback } from '@/lib/ai/game';
import { updateDailyMetrics } from '@/lib/metrics/dashboard';
import { USAGE_LIMITS, OVER_LIMIT_MESSAGE } from '@/config/limits';

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
  if (!(audio instanceof File) || !topic || (phase !== 'argument' && phase !== 'rebuttal')) {
    return NextResponse.json({ error: 'A recording is required.' }, { status: 400 });
  }

  // Daily debate limit is checked when starting a new debate (the argument turn).
  if (phase === 'argument') {
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('game_type', 'debate')
      .gte('created_at', `${today}T00:00:00.000Z`);
    if ((count ?? 0) >= USAGE_LIMITS.debateSessionsPerDay) {
      return NextResponse.json({ error: OVER_LIMIT_MESSAGE }, { status: 429 });
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

    await supabase.from('game_sessions').insert({
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
    });

    await updateDailyMetrics(supabase, user.id);

    return NextResponse.json({ transcript: transcript.text, feedback });
  } catch (err) {
    console.error('[games/debate]', err);
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return NextResponse.json({ error: `We couldn't process that. ${message}` }, { status: 500 });
  }
}
