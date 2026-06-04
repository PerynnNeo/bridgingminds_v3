import { cn } from '@/lib/utils';

interface Bar {
  label: string;
  /** 0–100 */
  value: number;
}

/** Simple horizontal bar chart for 0–100 speech scores. Colour encodes level. */
export function MetricBars({ bars, className }: { bars: Bar[]; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {bars.map((b) => {
        const v = Math.max(0, Math.min(100, Math.round(b.value)));
        const color = v >= 75 ? 'bg-primary-500' : v >= 50 ? 'bg-sage' : 'bg-warning';
        return (
          <div key={b.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-charcoal/70">{b.label}</span>
              <span className="font-semibold tabular-nums text-charcoal">{v}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-50">
              <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
