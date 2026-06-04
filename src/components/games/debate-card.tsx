'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Bot, Users, X, ChevronRight, Gauge } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Opponent = 'ai' | 'human';
type Difficulty = 'easy' | 'medium' | 'hard';

const ACCENT = { bg: '#e7f0fa', fg: '#3f7cb8' };

export function DebateCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState<Opponent>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  function start() {
    const mode = opponent === 'human' ? 'human' : 'ai';
    router.push(`/games/debate?mode=${mode}&difficulty=${difficulty}`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <Card className="bg-gradient-to-br from-[#eef4fb] to-white transition-transform active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundColor: ACCENT.bg, color: ACCENT.fg }}
            >
              <Swords className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-charcoal">Debate Game</h2>
              <p className="text-sm text-charcoal/55">Argue a topic vs an AI or a friend</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-charcoal/30" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-charcoal/60">
              <Bot className="h-3.5 w-3.5" style={{ color: ACCENT.fg }} />
              vs AI
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-charcoal/60">
              <Users className="h-3.5 w-3.5" style={{ color: ACCENT.fg }} />
              vs Friend
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-charcoal/60">
              <Gauge className="h-3.5 w-3.5" style={{ color: ACCENT.fg }} />
              3 levels
            </span>
          </div>
        </Card>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md animate-fade-in-up rounded-3xl bg-white p-5 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-charcoal">Set up your debate</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 text-charcoal/40 hover:text-charcoal/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-charcoal/45">
              Opponent
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'ai', icon: Bot, title: 'vs AI', sub: 'Available anytime' },
                  { key: 'human', icon: Users, title: 'vs Human', sub: 'Pass the phone' },
                ] as const
              ).map((o) => {
                const selected = opponent === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setOpponent(o.key)}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-primary-100 bg-white',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-lg',
                        selected ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-600',
                      )}
                    >
                      <o.icon className="h-4 w-4" />
                    </span>
                    <p className="mt-2 text-sm font-semibold text-charcoal">{o.title}</p>
                    <p className="text-xs text-charcoal/50">{o.sub}</p>
                  </button>
                );
              })}
            </div>

            {opponent === 'ai' && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  Difficulty
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-cream p-1">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        'rounded-lg py-2 text-sm font-medium capitalize transition-colors',
                        difficulty === d
                          ? 'bg-white text-charcoal shadow-card'
                          : 'text-charcoal/50',
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Button size="full" className="mt-5 w-full" onClick={start}>
              Start debate
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
