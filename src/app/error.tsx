'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where a Sentry/analytics report would go (see DEPLOY.md).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-6 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-danger/15 text-danger">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Something went wrong</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-charcoal/60">
          That was a hiccup on our end, not you. Please try again.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary-500 px-5 text-base font-medium text-white shadow-soft transition-colors hover:bg-primary-600"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </main>
  );
}
