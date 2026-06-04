'use client';

import { useEffect, useState } from 'react';
import { Home, Dumbbell, Gamepad2, User, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const TOUR_DONE_KEY = 'bm_tour_done';

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Home,
    title: 'Your home hub',
    body: 'See your speech scores, streak, and what to focus on next, all in one place.',
  },
  {
    icon: Dumbbell,
    title: 'Practice',
    body: 'Personalised words and phrases with coaching tips. Listen, record, and get instant feedback.',
  },
  {
    icon: Gamepad2,
    title: 'Games',
    body: 'Debate an AI or a friend, or spin the wheel for a daily question, speaking practice that’s actually fun.',
  },
  {
    icon: User,
    title: 'Profile',
    body: 'Manage your consent settings and retake the voice onboarding whenever you like.',
  },
];

export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(TOUR_DONE_KEY)) {
      setOpen(true);
      // Don't also pop the "what to practise" modal on the very first visit.
      sessionStorage.setItem('bm_practice_modal_seen', '1');
    }
  }, []);

  function close() {
    if (typeof window !== 'undefined') localStorage.setItem(TOUR_DONE_KEY, '1');
    setOpen(false);
  }

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
      <div className="w-full max-w-sm animate-fade-in-up rounded-3xl bg-white p-6 text-center shadow-soft">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            aria-label="Skip tutorial"
            className="text-charcoal/40 hover:text-charcoal/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <step.icon className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-charcoal">{step.title}</h2>
        <p className="mt-2 text-sm text-charcoal/65">{step.body}</p>

        <div className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all',
                idx === i ? 'w-5 bg-primary-500' : 'w-1.5 bg-primary-100',
              )}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {i > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setI((n) => n - 1)}>
              Back
            </Button>
          )}
          {last ? (
            <Button className="flex-1" onClick={close}>
              Let’s go
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setI((n) => n + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
