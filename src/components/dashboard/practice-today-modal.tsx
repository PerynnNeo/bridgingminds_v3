'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEEN_KEY = 'bm_practice_modal_seen';

/** Returning-user "what would you like to practise today?" prompt (UX doc §3). */
export function PracticeTodayModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(SEEN_KEY)) {
      setOpen(true);
    }
  }, []);

  function close() {
    if (typeof window !== 'undefined') sessionStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md animate-fade-in-up rounded-3xl bg-white p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-charcoal">
            What would you like to practise today?
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 text-charcoal/40 hover:text-charcoal/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <Button className="w-full justify-between" onClick={() => go('/practice')}>
            Continue my plan
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between" onClick={() => go('/games')}>
            Try daily question
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between" onClick={() => go('/games')}>
            Start debate game
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
