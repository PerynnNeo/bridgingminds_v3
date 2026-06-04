import Link from 'next/link';
import { Disc3, ChevronRight, Timer, Mic, Flame, Gamepad2, Award, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DebateCard } from '@/components/games/debate-card';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getGameStats } from '@/lib/games/stats';
import { formatScore } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DAILY_ACCENT = { bg: '#fbf0db', fg: '#bd8231' };

function StatCard({ icon: Icon, value, label }: { icon: typeof Flame; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-card">
      <Icon className="mx-auto h-4 w-4 text-primary-500" />
      <div className="mt-1.5 text-xl font-bold tabular-nums text-charcoal">{value}</div>
      <div className="text-[11px] text-charcoal/50">{label}</div>
    </div>
  );
}

function HubPill({ icon: Icon, color, children }: { icon: typeof Timer; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-charcoal/60">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      {children}
    </span>
  );
}

export default async function GamesPage() {
  let stats = { streak: 0, played: 0, bestScore: null as number | null };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) stats = await getGameStats(supabase, user.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">Games</h1>
        <p className="mt-1 text-sm text-charcoal/60">Practice speaking in a fun, low-pressure way.</p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={Flame} value={stats.streak} label="Day streak" />
        <StatCard icon={Gamepad2} value={stats.played} label="Games played" />
        <StatCard icon={Award} value={formatScore(stats.bestScore)} label="Best score" />
      </div>

      <div className="space-y-3">
        <DebateCard />

        <Link href="/games/daily" className="block">
          <Card className="bg-gradient-to-br from-[#fdf6ea] to-white transition-transform active:scale-[0.99]">
            <div className="flex items-center gap-4">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                style={{ backgroundColor: DAILY_ACCENT.bg, color: DAILY_ACCENT.fg }}
              >
                <Disc3 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-charcoal">Daily Question</h2>
                <p className="text-sm text-charcoal/55">Spin the wheel and answer on the spot</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-charcoal/30" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <HubPill icon={Timer} color={DAILY_ACCENT.fg}>
                30s to think
              </HubPill>
              <HubPill icon={Mic} color={DAILY_ACCENT.fg}>
                1 min to talk
              </HubPill>
              {stats.streak > 0 ? (
                <HubPill icon={Flame} color={DAILY_ACCENT.fg}>
                  {stats.streak}-day streak
                </HubPill>
              ) : (
                <HubPill icon={Sparkles} color={DAILY_ACCENT.fg}>
                  New every day
                </HubPill>
              )}
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
