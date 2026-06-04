import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DebateGame } from '@/components/games/debate-game';
import { DEBATE_TOPICS } from '@/lib/games/topics';

export const dynamic = 'force-dynamic';

export default async function DebatePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; difficulty?: string }>;
}) {
  const { mode, difficulty } = await searchParams;
  const initialMode = mode === 'human' ? 'human' : 'ai';
  const diff = difficulty === 'easy' || difficulty === 'hard' ? difficulty : 'medium';
  // Generate topic + side on the server (per request) so it doesn't mismatch on hydration.
  const initialTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
  const initialSide: 'agree' | 'disagree' = Math.random() < 0.5 ? 'agree' : 'disagree';

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/games"
          className="inline-flex items-center gap-1 text-sm font-medium text-charcoal/55"
        >
          <ArrowLeft className="h-4 w-4" />
          Games
        </Link>
      </header>

      <DebateGame
        initialMode={initialMode}
        difficulty={diff}
        initialTopic={initialTopic}
        initialSide={initialSide}
      />
    </div>
  );
}
