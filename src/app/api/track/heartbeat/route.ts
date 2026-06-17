import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refresh a usage session's last-seen time (time-in-app tracking). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false }, { status: 400 });

  // Insert on first beat (started_at defaults to now), refresh last_seen after.
  await supabase
    .from('usage_sessions')
    .upsert({ id, user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'id' });

  return NextResponse.json({ ok: true });
}
