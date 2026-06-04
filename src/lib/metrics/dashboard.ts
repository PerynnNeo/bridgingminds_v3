import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SpeechProfileRow, PracticePlan, ProgressMetric } from '@/types/database';

type Client = SupabaseClient<Database>;

export type TrendDirection = 'up' | 'down' | 'steady';

export interface DashboardData {
  profile: SpeechProfileRow | null;
  plan: PracticePlan | null;
  firstItemText: string | null;
  streak: number;
  totalRecordings: number;
  phrasesPractised: number;
  mostImprovedSkill: string | null;
  trends: {
    clarity?: TrendDirection;
    pacing?: TrendDirection;
    filler?: TrendDirection;
  };
  motivationalLine: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Length of the most recent run of consecutive active days. */
export function computeStreak(isoTimestamps: string[]): number {
  const days = [...new Set(isoTimestamps.map((t) => t.slice(0, 10)))].sort().reverse();
  if (days.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    if (Math.round((prev - cur) / 86_400_000) === 1) streak++;
    else break;
  }
  return streak;
}

/** A change of more than ±2 points counts as a real trend (avoids noise). */
function trendDir(
  first: number | null | undefined,
  last: number | null | undefined,
  lowerIsBetter = false,
): TrendDirection | undefined {
  if (first == null || last == null) return undefined;
  const delta = last - first;
  const threshold = 2;
  if (lowerIsBetter) {
    if (delta < -threshold) return 'up';
    if (delta > threshold) return 'down';
    return 'steady';
  }
  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'steady';
}

function avg(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

async function activeDates(supabase: Client, userId: string): Promise<string[]> {
  const [{ data: ob }, { data: pa }, { data: gs }] = await Promise.all([
    supabase.from('onboarding_sessions').select('created_at').eq('user_id', userId),
    supabase.from('practice_attempts').select('created_at').eq('user_id', userId),
    supabase.from('game_sessions').select('created_at').eq('user_id', userId),
  ]);
  return [...(ob ?? []), ...(pa ?? []), ...(gs ?? [])].map((r) => r.created_at);
}

/**
 * Upsert today's progress_metrics row from the day's data (or the onboarding
 * baseline if there are no attempts yet). Idempotent, safe to call on load and
 * after every practice attempt / game (spec D7).
 */
export async function updateDailyMetrics(supabase: Client, userId: string): Promise<void> {
  const today = todayUtc();

  const [{ data: attempts }, { data: profiles }, dates] = await Promise.all([
    supabase
      .from('practice_attempts')
      .select('clarity_score, pacing_score, pronunciation_score')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`),
    supabase
      .from('speech_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1),
    activeDates(supabase, userId),
  ]);

  const profile = profiles?.[0] ?? null;
  const nums = (key: 'clarity_score' | 'pacing_score' | 'pronunciation_score') =>
    (attempts ?? []).map((a) => a[key]).filter((n): n is number => n != null);

  const avgClarity = avg(nums('clarity_score')) ?? profile?.clarity_score ?? null;
  const avgPacing = avg(nums('pacing_score')) ?? profile?.pacing_score ?? null;
  const avgPronunciation = avg(nums('pronunciation_score')) ?? profile?.fluency_score ?? null;
  const fillerRate = profile?.filler_word_rate ?? null;

  const streak = computeStreak(dates);
  const totalRecordings = dates.length;

  await supabase.from('progress_metrics').upsert(
    {
      user_id: userId,
      date: today,
      total_recordings: totalRecordings,
      avg_clarity_score: avgClarity,
      avg_pacing_score: avgPacing,
      avg_pronunciation_score: avgPronunciation,
      filler_word_rate: fillerRate,
      streak_count: streak,
    },
    { onConflict: 'user_id,date' },
  );
}

function mostImproved(first: ProgressMetric, last: ProgressMetric): string | null {
  const deltas: { label: string; delta: number }[] = [];
  if (first.avg_clarity_score != null && last.avg_clarity_score != null)
    deltas.push({ label: 'Clarity', delta: last.avg_clarity_score - first.avg_clarity_score });
  if (first.avg_pacing_score != null && last.avg_pacing_score != null)
    deltas.push({ label: 'Pacing', delta: last.avg_pacing_score - first.avg_pacing_score });
  if (first.avg_pronunciation_score != null && last.avg_pronunciation_score != null)
    deltas.push({ label: 'Fluency', delta: last.avg_pronunciation_score - first.avg_pronunciation_score });
  if (first.filler_word_rate != null && last.filler_word_rate != null)
    deltas.push({ label: 'Filler words', delta: first.filler_word_rate - last.filler_word_rate });

  const best = deltas.sort((a, b) => b.delta - a.delta)[0];
  return best && best.delta > 2 ? best.label : null;
}

export async function getDashboardData(supabase: Client, userId: string): Promise<DashboardData> {
  const [
    { data: profiles },
    { data: plans },
    { data: items },
    { data: metrics },
    { count: attemptCount },
    dates,
  ] = await Promise.all([
    supabase
      .from('speech_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('practice_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('practice_items')
      .select('text')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('progress_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    supabase
      .from('practice_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    activeDates(supabase, userId),
  ]);

  const profile = profiles?.[0] ?? null;
  const plan = plans?.[0] ?? null;
  const history = metrics ?? [];
  const first = history[0];
  const last = history[history.length - 1];

  const trends =
    history.length >= 2
      ? {
          clarity: trendDir(first.avg_clarity_score, last.avg_clarity_score),
          pacing: trendDir(first.avg_pacing_score, last.avg_pacing_score),
          filler: trendDir(first.filler_word_rate, last.filler_word_rate, true),
        }
      : {};

  const mostImprovedSkill = history.length >= 2 ? mostImproved(first, last) : null;

  let motivationalLine = 'Let’s build your speaking confidence today.';
  if (trends.pacing === 'up') motivationalLine = 'Your pacing improved this week, keep it up!';
  else if (trends.clarity === 'up') motivationalLine = 'Your clarity is on the rise this week!';
  else if (trends.filler === 'up') motivationalLine = 'Fewer filler words this week, nice work!';

  return {
    profile,
    plan,
    firstItemText: items?.[0]?.text ?? null,
    streak: computeStreak(dates),
    totalRecordings: dates.length,
    phrasesPractised: attemptCount ?? 0,
    mostImprovedSkill,
    trends,
    motivationalLine,
  };
}
