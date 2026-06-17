'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'bm_login_reason_asked';
const REASONS = ['Exam coming up', 'Interview prep', 'A presentation', 'Building the habit', 'Just curious'];

export function LoginReasonModal() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // Show shortly after landing so it doesn't fight the first paint.
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  function close() {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function submit() {
    void track('login_reason', { reason: reason || 'unspecified', note: note.trim() || undefined });
    close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center">
      <div className="w-full max-w-md animate-fade-in-up rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-charcoal">What brings you back today?</h2>
        <p className="mt-1 text-sm text-charcoal/60">One tap helps us make practice more useful for you.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                reason === r
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-primary-100 text-charcoal/70',
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Anything specific? (optional)"
          className="mt-3 w-full resize-none rounded-2xl border border-primary-100 bg-white p-3 text-sm text-charcoal outline-none placeholder:text-charcoal/35 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm font-medium text-charcoal/45">
            Skip
          </button>
          <Button size="sm" disabled={!reason} onClick={submit}>
            Start practising
          </Button>
        </div>
      </div>
    </div>
  );
}
