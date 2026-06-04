import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { ScoreCard } from '@/components/ui/score-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { ProgressSnapshot } from './progress-snapshot';
import { QuickStart } from './quick-start';
import { PracticeTodayModal } from './practice-today-modal';
import { WelcomeTour } from '@/components/tutorial/welcome-tour';
import type { DashboardData } from '@/lib/metrics/dashboard';

function prettyFocus(focus: string): string {
  return focus.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function HomeDashboard({ name, data }: { name: string | null; data: DashboardData }) {
  const {
    profile,
    plan,
    firstItemText,
    streak,
    totalRecordings,
    phrasesPractised,
    mostImprovedSkill,
    trends,
    motivationalLine,
  } = data;

  return (
    <div className="space-y-5">
      <WelcomeTour />
      {profile && <PracticeTodayModal />}

      <header>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-charcoal">
            Welcome back{name ? `, ${name}` : ''}
          </h1>
          {streak > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-charcoal/75">
              <Flame className="h-3.5 w-3.5 text-warning" />
              {streak}-day
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-charcoal/60">{motivationalLine}</p>
      </header>

      {profile ? (
        <>
          <section className="grid grid-cols-2 gap-3">
            <ScoreCard label="Clarity" score={profile.clarity_score} trend={trends.clarity} />
            <ScoreCard label="Pacing" score={profile.pacing_score} trend={trends.pacing} />
            <ScoreCard label="Fluency" score={profile.fluency_score} />
            <ScoreCard
              label="Filler words"
              score={profile.filler_word_rate}
              trend={trends.filler}
              hint="per 100 words"
            />
          </section>

          <div className="flex justify-end">
            <Link href="/speech-profile" className="text-sm font-medium text-primary-600">
              See full profile →
            </Link>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                Today’s focus
              </span>
              {plan?.focus_area && (
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                  {prettyFocus(plan.focus_area)}
                </span>
              )}
            </div>
            <p className="mt-2 text-base font-semibold text-charcoal">
              {firstItemText ?? plan?.plan_title ?? 'Start your practice plan'}
            </p>
            <Link href="/practice" className="mt-3 inline-block">
              <Button size="sm">
                Start practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <ProgressSnapshot
            streak={streak}
            totalRecordings={totalRecordings}
            phrasesPractised={phrasesPractised}
            mostImprovedSkill={mostImprovedSkill}
          />

          <section>
            <h2 className="mb-2 text-sm font-semibold text-charcoal/70">Jump back in</h2>
            <QuickStart />
          </section>
        </>
      ) : (
        <EmptyState
          title="No speech profile yet"
          description="Complete the voice onboarding to see your personalised profile and plan."
        />
      )}
    </div>
  );
}
