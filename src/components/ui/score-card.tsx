import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn, formatScore } from '@/lib/utils';

type Trend = 'up' | 'down' | 'steady';

interface ScoreCardProps {
  label: string;
  /** 0–100 score, or null when not yet available. */
  score?: number | null;
  trend?: Trend;
  /** Short, plain-language hint, e.g. "Focus on 'th' sounds". */
  hint?: string;
  className?: string;
}

const trendConfig: Record<Trend, { icon: typeof TrendingUp; label: string; tone: string }> = {
  up: { icon: TrendingUp, label: 'Improving', tone: 'text-primary-600 bg-primary-50' },
  down: { icon: TrendingDown, label: 'Needs focus', tone: 'text-danger bg-danger/10' },
  steady: { icon: Minus, label: 'Steady', tone: 'text-info bg-info/10' },
};

/** Simple speech-metric card (spec §6.2.2), intentionally not a complex chart. */
export function ScoreCard({ label, score, trend, hint, className }: ScoreCardProps) {
  const t = trend ? trendConfig[trend] : null;
  return (
    <div className={cn('rounded-2xl bg-white p-4 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-charcoal/70">{label}</span>
        {t && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              t.tone,
            )}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </span>
        )}
      </div>
      <div className="mt-2 text-3xl font-bold text-charcoal">{formatScore(score)}</div>
      {hint && <p className="mt-1 text-xs text-charcoal/55">{hint}</p>}
    </div>
  );
}
