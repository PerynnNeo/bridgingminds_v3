import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { computeStreak } from '@/lib/metrics/dashboard';

type Client = SupabaseClient<Database>;

export interface DailyStats {
  /** Consecutive days the user has answered a daily question. */
  streak: number;
  /** Average overall score across daily answers (null if none yet). */
  avgScore: number | null;
  /** Best overall score (null if none yet). */
  bestScore: number | null;
  /** How many daily questions answered in total. */
  played: number;
}

const EMPTY: DailyStats = { streak: 0, avgScore: null, bestScore: null, played: 0 };

/** Average of the four delivery sub-scores for one game session. */
function overall(row: {
  clarity_score: number | null;
  pacing_score: number | null;
  structure_score: number | null;
  confidence_score: number | null;
}): number | null {
  const parts = [row.clarity_score, row.pacing_score, row.structure_score, row.confidence_score].filter(
    (n): n is number => n != null,
  );
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export interface GameStats {
  /** Consecutive days the user has played any game. */
  streak: number;
  /** Total games played (debate + daily question). */
  played: number;
  /** Best overall score across all games (null if none yet). */
  bestScore: number | null;
}

/** Aggregate stats across every game, for the Games hub header. */
export async function getGameStats(supabase: Client, userId: string): Promise<GameStats> {
  const { data } = await supabase
    .from('game_sessions')
    .select('clarity_score, pacing_score, structure_score, confidence_score, created_at')
    .eq('user_id', userId);

  const rows = data ?? [];
  const scores = rows.map(overall).filter((n): n is number => n != null);
  return {
    streak: computeStreak(rows.map((r) => r.created_at)),
    played: rows.length,
    bestScore: scores.length ? Math.max(...scores) : null,
  };
}

/** Streak / average / best for the daily-question game (spec: progress motivation). */
export async function getDailyStats(supabase: Client, userId: string): Promise<DailyStats> {
  const { data } = await supabase
    .from('game_sessions')
    .select('clarity_score, pacing_score, structure_score, confidence_score, created_at')
    .eq('user_id', userId)
    .eq('game_type', 'daily_question');

  const rows = data ?? [];
  if (rows.length === 0) return EMPTY;

  const scores = rows.map(overall).filter((n): n is number => n != null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const bestScore = scores.length ? Math.max(...scores) : null;

  return {
    streak: computeStreak(rows.map((r) => r.created_at)),
    avgScore,
    bestScore,
    played: rows.length,
  };
}
