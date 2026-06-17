import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

/** Open the Stripe customer portal so the user can manage or cancel their plan. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Billing unavailable.' }, { status: 503 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription to manage.' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/profile`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal]', err);
    return NextResponse.json({ error: 'Could not open the billing portal.' }, { status: 500 });
  }
}
