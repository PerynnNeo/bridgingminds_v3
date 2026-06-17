import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** current_period_end lives top-level on older API versions and on the item on newer ones. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stripe webhook: the single source of truth for subscription state. Signature
 * is verified, then state is written with the service-role client (bypasses RLS).
 * A browser can never call this to grant itself Premium.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Billing not configured.' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  if (!sig) return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const writeFromSubscription = async (sub: Stripe.Subscription, fallbackUserId?: string) => {
      let userId = sub.metadata?.userId || fallbackUserId || null;
      if (!userId) {
        // Recover the user from an existing record keyed by the subscription id
        // (covers subscription events whose metadata is missing).
        const { data: existing } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle();
        userId = existing?.user_id ?? null;
      }
      if (!userId || !UUID_RE.test(userId)) return;
      const status = sub.status;
      const premium = status === 'active' || status === 'trialing';
      await admin.from('subscriptions').upsert(
        {
          user_id: userId,
          plan: premium ? 'premium' : 'free',
          status,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
          current_period_end: periodEnd(sub),
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId || undefined;
        if (session.subscription) {
          const subId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          // Make sure the subscription carries userId so later events resolve it.
          if (!sub.metadata?.userId && userId) {
            await stripe.subscriptions.update(sub.id, { metadata: { userId } });
          }
          await writeFromSubscription(sub, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await writeFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[billing/webhook]', err);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}
