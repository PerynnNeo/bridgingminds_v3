import { Loader2, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Centered loading state with optional step labels (used by the analysis screen). */
export function LoadingState({
  title = 'Loading…',
  steps,
  className,
}: {
  title?: string;
  steps?: string[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12 text-center', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="text-base font-medium text-charcoal">{title}</p>
      {steps && steps.length > 0 && (
        <ul className="space-y-1 text-sm text-charcoal/60">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Friendly empty state. */
export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <Inbox className="h-8 w-8 text-charcoal/30" />
      <p className="text-base font-medium text-charcoal">{title}</p>
      {description && <p className="max-w-xs text-sm text-charcoal/55">{description}</p>}
    </div>
  );
}

/** Graceful error state with optional retry (spec §13.2 graceful error handling). */
export function ErrorState({
  title = 'Something went wrong',
  description = "Let's try that again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <AlertCircle className="h-8 w-8 text-danger" />
      <div>
        <p className="text-base font-medium text-charcoal">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-charcoal/55">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
