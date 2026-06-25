import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateItemCoaching } from '@/lib/ai/coaching';
import { getCategory } from '@/lib/practice/library';
import type { SpeechProfileRow } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });

  let body: { text?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  const category = body.category ?? '';
  if (!text || !getCategory(category)) {
    return NextResponse.json({ error: 'Missing item.' }, { status: 400 });
  }

  try {
    const { data: profiles } = await supabase
      .from('speech_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    const profile = (profiles?.[0] ?? null) as SpeechProfileRow | null;

    const coaching = await generateItemCoaching({ category, text, profile, supabase });
    return NextResponse.json(coaching);
  } catch (err) {
    console.error('[practice/coaching]', err);
    return NextResponse.json({ error: 'Could not generate coaching.' }, { status: 500 });
  }
}
