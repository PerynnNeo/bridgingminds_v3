import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getFounderMetrics, type FounderMetrics } from '@/lib/metrics/founder';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Metrics', robots: { index: false, follow: false } };

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="text-2xl font-bold tabular-nums text-charcoal">{value}</div>
      <div className="mt-0.5 text-xs text-charcoal/55">{label}</div>
      {sub && <div className="text-[11px] text-charcoal/40">{sub}</div>}
    </div>
  );
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-charcoal/70">{label}</span>
        <span className="font-semibold text-charcoal">
          {value} <span className="font-normal text-charcoal/40">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-50">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReasonList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal/45">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-charcoal/75">{r.label}</span>
              <span className="font-semibold tabular-nums text-charcoal">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function MetricsPage() {
  if (!isSupabaseConfigured()) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') notFound();

  let metrics: FounderMetrics | null = null;
  let error = '';
  try {
    metrics = await getFounderMetrics();
  } catch {
    error = 'Set SUPABASE_SERVICE_ROLE_KEY to read cross-user metrics.';
  }

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold text-charcoal">Metrics</h1>
          <p className="mt-1 text-sm text-charcoal/60">Private founder view.</p>
        </header>

        {error && (
          <Card>
            <p className="text-sm text-danger">{error}</p>
          </Card>
        )}

        {metrics && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Users" value={metrics.users} />
              <Stat label="Active (7 days)" value={metrics.activeLast7} />
              <Stat label="Hours in app" value={metrics.totalHours} />
              <Stat
                label="Avg session"
                value={`${metrics.avgSessionMin}m`}
                sub={`${metrics.sessionCount} sessions`}
              />
            </section>

            <Card>
              <CardTitle>Activation funnel</CardTitle>
              <div className="mt-3 space-y-2.5">
                <FunnelRow label="Signed up" value={metrics.users} total={metrics.users} />
                <FunnelRow label="Completed onboarding" value={metrics.onboarded} total={metrics.users} />
                <FunnelRow label="Practised" value={metrics.practicedUsers} total={metrics.users} />
                <FunnelRow label="Played a game" value={metrics.gamedUsers} total={metrics.users} />
              </div>
            </Card>

            <section className="grid gap-3 sm:grid-cols-2">
              <ReasonList title="Why they came back" rows={metrics.loginReasons} />
              <ReasonList title="Why they wanted Premium" rows={metrics.upgradeReasons} />
            </section>

            <Card>
              <CardTitle>Feature usage</CardTitle>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Practice attempts', value: metrics.practiceAttempts },
                  { label: 'Debates', value: metrics.debates },
                  { label: 'Daily questions', value: metrics.dailyQuestions },
                  { label: 'Camera clips', value: metrics.cameraClips },
                ].map((f) => (
                  <div key={f.label} className="rounded-2xl bg-cream p-3 text-center">
                    <div className="text-xl font-bold tabular-nums text-charcoal">{f.value}</div>
                    <div className="text-[11px] text-charcoal/55">{f.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
