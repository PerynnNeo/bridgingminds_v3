import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/transcribe';
import { generateFriendDebateFeedback } from '@/lib/ai/game';
import { updateDailyMetrics } from '@/lib/metrics/dashboard';
import { getPlanLimits } from '@/lib/billing/plan';

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

  const audio1 = form.get('audio1');
  const audio2 = form.get('audio2');
  const topic = String(form.get('topic') ?? '').trim();
  if (!(audio1 instanceof File) || !(audio2 instanceof File) || !topic) {
    return NextResponse.json({ error: 'Both players need to record.' }, { status: 400 });
  }

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

  try {
    const [buf1, buf2] = [
      Buffer.from(await audio1.arrayBuffer()),
      Buffer.from(await audio2.arrayBuffer()),
    ];
    const path = `${user.id}/games/${randomUUID()}.webm`;
    await supabase.storage
      .from('recordings')
      .upload(path, buf1, { contentType: audio1.type || 'audio/webm', upsert: true })
      .then(
        () => {},
        () => {},
      );

    const [t1, t2] = await Promise.all([transcribeAudio(buf1), transcribeAudio(buf2)]);
    const result = await generateFriendDebateFeedback({
      topic,
      player1Transcript: t1.text,
      player2Transcript: t2.text,
    });

    await supabase.from('game_sessions').insert({
      user_id: user.id,
      game_type: 'debate',
      mode: 'friend_same_device',
      prompt: topic,
      transcript: `[Player 1] ${t1.text}\n\n[Player 2] ${t2.text}`,
      audio_path: path,
      feedback: result.comparison,
    });

    await updateDailyMetrics(supabase, user.id);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[games/debate/friend]', err);
    return NextResponse.json({ error: 'We could not process that. Please try again.' }, { status: 500 });
  }
}
