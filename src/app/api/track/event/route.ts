import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';

/** Log a product-analytics event for the signed-in user (best-effort). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { event?: string; properties?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = String(body.event ?? '').trim().slice(0, 64);
  if (!event) return NextResponse.json({ ok: false }, { status: 400 });

  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event,
    properties: (body.properties ?? null) as Json,
  });

  return NextResponse.json({ ok: true });
}
