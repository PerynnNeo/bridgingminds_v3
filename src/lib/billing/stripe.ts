import 'server-only';
import Stripe from 'stripe';

let instance: Stripe | null = null;

/** Stripe client, or null when billing is not configured (then everyone is on Free). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!instance) instance = new Stripe(key);
  return instance;
}

/** True once the Stripe secret key and the monthly price id are both set. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export const PREMIUM_PRICE_SGD = 10;
export const TRIAL_DAYS = 30;
