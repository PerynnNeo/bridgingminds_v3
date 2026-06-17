'use client';

import { useState } from 'react';
import { X, Check, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FREE = [
  '3 practice sessions a day',
  '1 daily question and 1 debate a day',
  'Camera delivery feedback',
  'Standard debate voice',
];

const PREMIUM = [
  'Up to 60 practice sessions a day',
  '30 daily questions and 20 debates a day',
  'Camera delivery feedback',
  'Realistic AI debate voice',
  'Cancel anytime',
];

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function startTrial() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Could not start checkout. Please try again.');
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-3xl bg-white p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-500 text-white">
              <Crown className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-charcoal">Go Premium</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-charcoal/40 hover:text-charcoal/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free trial offer */}
        <div className="mt-4 rounded-2xl border-2 border-primary-300 bg-primary-50 p-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            1 month free
          </span>
          <p className="mt-2 text-sm text-charcoal/75">
            Try Premium free for a month, then <strong className="text-charcoal">SGD 10/month</strong>.
            Cancel anytime.
          </p>
        </div>

        {/* Free vs Premium */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-cream p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">Free</p>
            <ul className="mt-2 space-y-1.5">
              {FREE.map((f) => (
                <li key={f} className="flex gap-1.5 text-xs leading-snug text-charcoal/65">
                  <span className="text-charcoal/30">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary-200 bg-white p-3 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Premium</p>
            <ul className="mt-2 space-y-1.5">
              {PREMIUM.map((f) => (
                <li key={f} className="flex gap-1.5 text-xs leading-snug text-charcoal/80">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}

        <Button size="full" className="mt-4 w-full" disabled={loading} onClick={startTrial}>
          {loading ? 'Starting…' : 'Start my free month'}
        </Button>
        <p className="mt-2 text-center text-[11px] text-charcoal/40">
          No charge today. Cancel anytime before your trial ends.
        </p>
      </div>
    </div>
  );
}
