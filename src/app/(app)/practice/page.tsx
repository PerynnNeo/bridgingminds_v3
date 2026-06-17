import Link from 'next/link';
import { Volume2, Megaphone, Rocket, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPlanLimits, PLAN_LIMITS } from '@/lib/billing/plan';
import { PRACTICE_CATEGORIES, getLibraryItems, type CategoryIcon } from '@/lib/practice/library';

export const dynamic = 'force-dynamic';

const ICONS: Record<CategoryIcon, typeof Volume2> = {
  pronunciation: Volume2,
  presentation: Megaphone,
  pitch: Rocket,
  thinking: Zap,
};

/** Soft per-category accent tints (calm, on-brand, but visually distinct). */
const ACCENT: Record<CategoryIcon, { bg: string; fg: string }> = {
  pronunciation: { bg: '#e6f4ec', fg: '#2f7553' },
  presentation: { bg: '#e7f0fa', fg: '#3f7cb8' },
  pitch: { bg: '#fbf0db', fg: '#bd8231' },
  thinking: { bg: '#efeafb', fg: '#7a63c2' },
};

function chipLabel(slug: string, personalized: boolean): string {
  if (personalized) return 'Personalised';
  const n = getLibraryItems(slug as CategoryIcon).length;
  return slug === 'thinking' ? `${n} prompts` : `${n} phrases`;
}

function GoalRing({ value, max }: { value: number; max: number }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-primary-50" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary-500"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <span className="absolute text-base font-bold tabular-nums text-charcoal">{value}</span>
    </div>
  );
}

export default async function PracticePage() {
  let usedToday = 0;
  let limit = PLAN_LIMITS.free.practiceAttemptsPerDay;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('practice_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`);
      usedToday = count ?? 0;
      limit = (await getPlanLimits(supabase, user.id)).limits.practiceAttemptsPerDay;
    }
  }

  const microcopy =
    usedToday === 0
      ? 'Record your first practice of the day.'
      : usedToday >= limit
        ? 'All done for today, brilliant work!'
        : `${usedToday} done so far. ${limit - usedToday} more to go today.`;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">Practice</h1>
        <p className="mt-1 text-sm text-charcoal/60">Pick an area to work on.</p>
      </header>

      <Card className="flex items-center gap-4 bg-gradient-to-br from-primary-50 to-white">
        <GoalRing value={usedToday} max={limit} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-charcoal">Today&rsquo;s practice</p>
          <p className="mt-0.5 text-xs text-charcoal/55">{microcopy}</p>
        </div>
      </Card>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Choose a focus</p>
        <div className="grid grid-cols-2 gap-3">
          {PRACTICE_CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.icon];
            const a = ACCENT[cat.icon];
            return (
              <Link key={cat.slug} href={`/practice/${cat.slug}`} className="block h-full">
                <div className="flex h-full min-h-[148px] flex-col rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.98]">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ backgroundColor: a.bg, color: a.fg }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 text-sm font-semibold leading-snug text-charcoal">{cat.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-charcoal/55">{cat.short}</p>
                  <span className="mt-auto inline-flex w-fit items-center rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-charcoal/55">
                    {chipLabel(cat.slug, cat.personalized)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
