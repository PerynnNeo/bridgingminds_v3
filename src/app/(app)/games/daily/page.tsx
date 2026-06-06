import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DailyQuestionGame, type DailyQ } from '@/components/games/daily-question-game';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getDailyStats, type DailyStats } from '@/lib/games/stats';

export const dynamic = 'force-dynamic';

const FALLBACK_QUESTIONS: DailyQ[] = [
  { text: 'What is one app you would invent?', category: 'fun', difficulty: 'easy' },
  { text: 'Should school start later in the morning?', category: 'school', difficulty: 'medium' },
  { text: 'Tell us about a hobby you enjoy.', category: 'storytelling', difficulty: 'easy' },
  { text: 'Convince someone to try your favourite food.', category: 'pitch', difficulty: 'medium' },
  { text: 'Why do you think teamwork is important?', category: 'opinion', difficulty: 'medium' },
  { text: 'Describe a time you felt proud of yourself.', category: 'storytelling', difficulty: 'medium' },
];

const EMPTY_STATS: DailyStats = { streak: 0, avgScore: null, bestScore: null, played: 0 };

/** Stable per-day starting question so the first render matches on server and client. */
function dayIndex(len: number): number {
  if (len <= 0) return 0;
  return Math.floor(Date.now() / 86_400_000) % len;
}

export default async function DailyQuestionPage() {
  let questions: DailyQ[] = [];
  let stats: DailyStats = EMPTY_STATS;
  let cameraEnabled = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [{ data }, resolvedStats] = await Promise.all([
      supabase.from('daily_questions').select('question_text, category, difficulty').eq('active', true),
      user ? getDailyStats(supabase, user.id) : Promise.resolve(EMPTY_STATS),
    ]);
    questions = (data ?? []).map((q) => ({
      text: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
    }));
    stats = resolvedStats;
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('consent_video_analysis')
        .eq('id', user.id)
        .maybeSingle();
      cameraEnabled = prof?.consent_video_analysis ?? false;
    }
  }
  if (questions.length === 0) questions = FALLBACK_QUESTIONS;

  return (
    <div className="space-y-5">
      <Link
        href="/games"
        className="inline-flex items-center gap-1 text-sm font-medium text-charcoal/55"
      >
        <ArrowLeft className="h-4 w-4" />
        Games
      </Link>

      <DailyQuestionGame
        questions={questions}
        initialIndex={dayIndex(questions.length)}
        stats={stats}
        cameraEnabled={cameraEnabled}
      />
    </div>
  );
}
