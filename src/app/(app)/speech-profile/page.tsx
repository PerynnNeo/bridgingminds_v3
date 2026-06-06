import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProfileResultView } from '@/components/onboarding/profile-result-view';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { parseVisualMetrics } from '@/lib/vision/server';
import type { OnboardingAnalysis } from '@/lib/ai/types';
import type { SpeechProfileRow, PracticePlan } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Speech Profile',
  robots: { index: false, follow: false },
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export default async function SpeechProfilePage() {
  let profile: SpeechProfileRow | null = null;
  let plan: PracticePlan | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [{ data: profiles }, { data: plans }] = await Promise.all([
        supabase
          .from('speech_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('practice_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      profile = profiles?.[0] ?? null;
      plan = plans?.[0] ?? null;
    }
  }

  if (!profile) {
    return (
      <EmptyState
        title="No speech profile yet"
        description="Complete the voice onboarding to see your full results."
      />
    );
  }

  const profileView: OnboardingAnalysis['profile'] = {
    pacingScore: profile.pacing_score ?? 0,
    clarityScore: profile.clarity_score ?? 0,
    fluencyScore: profile.fluency_score ?? 0,
    fillerWordRate: profile.filler_word_rate ?? 0,
    pausePatternSummary: profile.pause_pattern_summary ?? '',
    commonMispronunciations: toStringArray(profile.common_mispronunciations),
    confidenceCues: toStringArray(profile.confidence_cues),
    strengths: profile.strengths ?? [],
    focusAreas: profile.focus_areas ?? [],
    generatedSummary: profile.generated_summary ?? '',
  };

  const planView: OnboardingAnalysis['plan'] = {
    planTitle: plan?.plan_title ?? 'Your practice plan',
    planSummary: plan?.plan_summary ?? '',
    focusArea: plan?.focus_area ?? 'pacing',
    difficulty: plan?.difficulty ?? 'beginner',
    items: [],
  };

  const visualMetrics = parseVisualMetrics(profile.visual_metrics);
  const visual =
    visualMetrics && profile.visual_summary
      ? { summary: profile.visual_summary, metrics: visualMetrics }
      : null;

  return (
    <div className="space-y-5">
      <ProfileResultView profile={profileView} plan={planView} visual={visual} />
      <Link href="/practice" className="block">
        <Button size="full" className="w-full">
          Practise now
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
