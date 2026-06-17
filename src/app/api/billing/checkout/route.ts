import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, isBillingConfigured, TRIAL_DAYS } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

/** Start a Premium subscription (1-month trial, card required) via Stripe Checkout. */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!isBillingConfigured() || !stripe) {
    return NextResponse.json({ error: 'Billing is not set up yet.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });

  // Reuse an existing Stripe customer if the user already has one.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sub?.status === 'active' || sub?.status === 'trialing') {
    return NextResponse.json({ error: 'You are already on Premium.' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { userId: user.id },
      },
      client_reference_id: user.id,
      metadata: { userId: user.id },
      ...(sub?.stripe_customer_id
        ? { customer: sub.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      allow_promotion_codes: true,
      success_url: `${origin}/profile?upgraded=1`,
      cancel_url: `${origin}/profile`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[billing/checkout]', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }
}
