import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Client = SupabaseClient<Database>;

export type Plan = 'free' | 'premium';

export interface PlanLimits {
  practiceAttemptsPerDay: number;
  dailyQuestionPerDay: number;
  debateSessionsPerDay: number;
  /** Realistic ElevenLabs debate voice (Premium perk; Free uses the browser voice). */
  realisticVoice: boolean;
}

/** Free gets every feature, but small daily caps. Premium lifts them + the realistic voice. */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    practiceAttemptsPerDay: 3,
    dailyQuestionPerDay: 1,
    debateSessionsPerDay: 1,
    realisticVoice: false,
  },
  premium: {
    practiceAttemptsPerDay: 60,
    dailyQuestionPerDay: 30,
    debateSessionsPerDay: 20,
    realisticVoice: true,
  },
};

/** Stripe subscription statuses that grant Premium access. */
const PREMIUM_STATUSES = new Set(['active', 'trialing']);

/** The user's effective plan, from their subscription row (defaults to free). */
export async function getUserPlan(supabase: Client, userId: string): Promise<Plan> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.status && PREMIUM_STATUSES.has(data.status) ? 'premium' : 'free';
}

export async function getPlanLimits(
  supabase: Client,
  userId: string,
): Promise<{ plan: Plan; limits: PlanLimits }> {
  const plan = await getUserPlan(supabase, userId);
  return { plan, limits: PLAN_LIMITS[plan] };
}
