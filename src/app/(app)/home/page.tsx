import { HomeDashboard } from '@/components/dashboard/home-dashboard';
import { getDashboardData, updateDailyMetrics, type DashboardData } from '@/lib/metrics/dashboard';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

const EMPTY: DashboardData = {
  profile: null,
  plan: null,
  firstItemText: null,
  streak: 0,
  totalRecordings: 0,
  phrasesPractised: 0,
  mostImprovedSkill: null,
  trends: {},
  motivationalLine: 'Let’s build your speaking confidence today.',
};

export default async function HomePage() {
  let name: string | null = null;
  let data: DashboardData = EMPTY;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      name = (prof as Pick<Profile, 'full_name'> | null)?.full_name ?? null;

      // Keep today's metrics fresh, then read the dashboard.
      await updateDailyMetrics(supabase, user.id);
      data = await getDashboardData(supabase, user.id);
    }
  }

  return <HomeDashboard name={name} data={data} />;
}
