'use client';

import { useState } from 'react';
import { X, Check, Sparkles, Crown } from 'lucide-react';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const UPGRADE_REASONS = [
  'Hit my daily limit',
  'Want the realistic voice',
  'More practice',
  'More games',
  'Just exploring',
];

type Step = 'offer' | 'survey' | 'done';

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('offer');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  if (!open) return null;

  function handleClose() {
    onClose();
    // Reset for next open.
    setTimeout(() => {
      setStep('offer');
      setReason('');
      setNote('');
    }, 200);
  }

  function submitSurvey() {
    void track('upgrade_reason', { reason: reason || 'unspecified', note: note.trim() || undefined });
    setStep('done');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
      onClick={handleClose}
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
            <h2 className="text-lg font-bold text-charcoal">
              {step === 'done' ? 'Thanks!' : 'Go Premium'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="shrink-0 text-charcoal/40 hover:text-charcoal/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'offer' && (
          <>
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

            <Button size="full" className="mt-4 w-full" onClick={() => setStep('survey')}>
              Start my free month
            </Button>
          </>
        )}

        {step === 'survey' && (
          <>
            <p className="mt-4 text-sm font-medium text-charcoal">What made you want to upgrade?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {UPGRADE_REASONS.map((r) => (
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
              placeholder="Tell us more (optional)"
              className="mt-3 w-full resize-none rounded-2xl border border-primary-100 bg-white p-3 text-sm text-charcoal outline-none placeholder:text-charcoal/35 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
            <Button size="full" className="mt-4 w-full" disabled={!reason} onClick={submitSurvey}>
              Continue
            </Button>
          </>
        )}

        {step === 'done' && (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-600">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-3 text-base font-semibold text-charcoal">Premium is coming soon</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-charcoal/60">
              Thanks for telling us. We are building it now, and you will be the first to know when it
              launches.
            </p>
            <Button size="full" className="mt-4 w-full" onClick={handleClose}>
              Keep practising
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
