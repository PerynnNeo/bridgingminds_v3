'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface StepGuideItem {
  title?: string;
  body: string;
}

export function StepGuide({
  steps,
  onComplete,
  showDismiss = true,
}: {
  steps: StepGuideItem[];
  onComplete?: () => void;
  showDismiss?: boolean;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const first = i === 0;

  return (
    <div className="relative space-y-4 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/50 to-white p-6">
      {showDismiss && (
        <button
          type="button"
          onClick={onComplete}
          aria-label="Dismiss tips"
          className="absolute right-4 top-4 text-charcoal/40 hover:text-charcoal/70"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {step.title && <h3 className="text-sm font-semibold text-charcoal">{step.title}</h3>}
      <p className="text-sm text-charcoal/70">{step.body}</p>

      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex gap-1">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1 rounded-full transition-all',
                idx === i ? 'w-4 bg-primary-500' : 'w-1 bg-primary-100',
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!first && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setI((n) => n - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {last ? (
            <Button size="sm" onClick={onComplete}>
              Got it
            </Button>
          ) : (
            <Button size="sm" onClick={() => setI((n) => n + 1)} className="gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
