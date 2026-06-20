'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Target,
  Pause,
  Megaphone,
  ArrowRight,
  Wind,
  Lightbulb,
  Scissors,
  Volume2,
  Play,
  Flag,
  Briefcase,
  ListOrdered,
  Smile,
  Brain,
  Quote,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import type { ItemCoaching } from '@/lib/ai/coaching';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const LABEL_ICON: Record<string, LucideIcon> = {
  'break it down': Scissors,
  stress: Volume2,
  'sound tip': Volume2,
  'try this': Play,
  purpose: Flag,
  'pause here': Pause,
  emphasise: Megaphone,
  'continue with': ArrowRight,
  'what comes next': ArrowRight,
  'natural flow': Wind,
  'pro tip': Lightbulb,
  'upgrade it': Sparkles,
  situation: Briefcase,
  structure: ListOrdered,
  tone: Smile,
  'plan first': Brain,
  'example starter': Quote,
  'for you': Target,
};

function iconFor(label: string): LucideIcon {
  return LABEL_ICON[label.toLowerCase().trim()] ?? Sparkles;
}

function Skeleton() {
  return (
    <div className="mt-3 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-primary-50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-16 animate-pulse rounded-full bg-primary-50" />
            <div
              className="h-2.5 animate-pulse rounded-full bg-primary-50"
              style={{ width: `${85 - i * 10}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CoachingCard({
  text,
  category,
  fallbackHint,
  initialCoaching,
}: {
  text: string;
  category: string;
  fallbackHint?: string;
  /** When provided, render this directly and skip the fetch (preview / SSR pre-load). */
  initialCoaching?: ItemCoaching;
}) {
  const [coaching, setCoaching] = useState<ItemCoaching | null>(initialCoaching ?? null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialCoaching) return;
    let active = true;
    setCoaching(null);
    setFailed(false);
    fetch('/api/practice/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, category }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ItemCoaching) => active && setCoaching(data))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [text, category, initialCoaching]);

  // Robustly find the stressed syllable, even if the model returns the whole word.
  const stressedSyl = coaching
    ? (coaching.stress.split(/[^a-zA-Z]+/).find((t) => t.length > 1 && t === t.toUpperCase()) ??
        coaching.stress).toUpperCase()
    : '';

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-charcoal">How to nail this</h3>
      </div>

      {!coaching && !failed && <Skeleton />}

      {failed && (
        <p className="mt-3 text-sm text-charcoal/70">
          {fallbackHint ?? 'Say it slowly first, then again at a natural, confident pace.'}
        </p>
      )}

      {coaching && (
        <div className="mt-4 space-y-3">
          {coaching.syllables.length > 0 && (
            <div className="rounded-xl bg-cream py-3 text-center text-xl font-bold tracking-wide">
              {coaching.syllables.map((syl, i) => (
                <span key={i}>
                  <span
                    className={
                      syl.toUpperCase() === stressedSyl ? 'text-primary-600' : 'text-charcoal/55'
                    }
                  >
                    {syl}
                  </span>
                  {i < coaching.syllables.length - 1 && <span className="text-charcoal/25">·</span>}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between rounded-lg border border-charcoal/10 bg-charcoal/2 px-3 py-2.5 text-left hover:bg-charcoal/5 transition-colors"
          >
            <span className="text-sm font-semibold text-charcoal">Tips ({coaching.tips.length})</span>
            <ChevronDown
              className={cn('h-4 w-4 text-charcoal/40 transition-transform', expanded && 'rotate-180')}
            />
          </button>

          {expanded && (
            <ul className="space-y-3">
              {coaching.tips.map((tip, i) => {
                const forYou = tip.label.toLowerCase().trim() === 'for you';
                const Icon = forYou ? Target : iconFor(tip.label);
                return (
                  <li
                    key={i}
                    className={cn('flex gap-3', forYou && 'rounded-xl bg-primary-50 p-3')}
                  >
                    <Icon
                      className={cn('mt-0.5 h-4 w-4 shrink-0', forYou ? 'text-primary-600' : 'text-charcoal/35')}
                    />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-[11px] font-bold uppercase tracking-wide',
                          forYou ? 'text-primary-600' : 'text-charcoal/45',
                        )}
                      >
                        {tip.label}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-charcoal/80">{tip.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
