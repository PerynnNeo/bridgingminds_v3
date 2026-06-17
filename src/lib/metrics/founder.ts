import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

export interface FounderMetrics {
  users: number;
  onboarded: number;
  practicedUsers: number;
  gamedUsers: number;
  activeLast7: number;
  totalHours: number;
  avgSessionMin: number;
  sessionCount: number;
  practiceAttempts: number;
  debates: number;
  dailyQuestions: number;
  cameraClips: number;
  loginReasons: { label: string; count: number }[];
  upgradeReasons: { label: string; count: number }[];
}

function tally(rows: { properties: Json | null }[], key = 'reason') {
  const m = new Map<string, number>();
  for (const r of rows) {
    const props =
      r.properties && typeof r.properties === 'object' && !Array.isArray(r.properties)
        ? (r.properties as Record<string, unknown>)
        : {};
    const v = props[key];
    const label = typeof v === 'string' && v ? v : 'unspecified';
    m.set(label, (m.get(label) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/** Aggregate product metrics across all users (service-role; founder page only). */
export async function getFounderMetrics(): Promise<FounderMetrics> {
  const db = createAdminClient();

  const [{ count: users }, { count: onboarded }, { count: practiceAttempts }, paRes, gsRes, sessRes, loginRes, upgradeRes] =
    await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }),
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
      db.from('practice_attempts').select('*', { count: 'exact', head: true }),
      db.from('practice_attempts').select('user_id, camera_enabled').limit(20000),
      db.from('game_sessions').select('user_id, game_type, camera_enabled').limit(20000),
      db.from('usage_sessions').select('user_id, started_at, last_seen_at').limit(20000),
      db.from('analytics_events').select('properties').eq('event', 'login_reason').limit(20000),
      db.from('analytics_events').select('properties').eq('event', 'upgrade_reason').limit(20000),
    ]);

  const pa = paRes.data ?? [];
  const gs = gsRes.data ?? [];
  const sessions = sessRes.data ?? [];

  const practicedUsers = new Set(pa.map((r) => r.user_id)).size;
  const gamedUsers = new Set(gs.map((r) => r.user_id)).size;
  const debates = gs.filter((r) => r.game_type === 'debate').length;
  const dailyQuestions = gs.filter((r) => r.game_type === 'daily_question').length;
  const cameraClips =
    pa.filter((r) => r.camera_enabled).length + gs.filter((r) => r.camera_enabled).length;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const active = new Set<string>();
  let totalMs = 0;
  for (const s of sessions) {
    const start = new Date(s.started_at).getTime();
    const last = new Date(s.last_seen_at).getTime();
    totalMs += Math.max(0, last - start);
    if (last >= weekAgo) active.add(s.user_id);
  }

  return {
    users: users ?? 0,
    onboarded: onboarded ?? 0,
    practicedUsers,
    gamedUsers,
    activeLast7: active.size,
    totalHours: Math.round((totalMs / 3_600_000) * 10) / 10,
    avgSessionMin: sessions.length ? Math.round((totalMs / sessions.length / 60_000) * 10) / 10 : 0,
    sessionCount: sessions.length,
    practiceAttempts: practiceAttempts ?? 0,
    debates,
    dailyQuestions,
    cameraClips,
    loginReasons: tally(loginRes.data ?? []),
    upgradeReasons: tally(upgradeRes.data ?? []),
  };
}
