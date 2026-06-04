import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/logout-button';
import { ConsentSettings } from '@/components/profile/consent-settings';
import { RetakeOnboardingButton, ReplayTutorialButton } from '@/components/profile/account-actions';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cream py-3 last:border-0">
      <span className="text-sm text-charcoal/60">{label}</span>
      <span className="text-sm font-medium text-charcoal">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  let signedIn = false;
  let name = '–';
  let email = '–';
  let ageGroup = '–';
  let onboarded = false;
  let video = false;
  let personalization = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      email = user.email ?? '–';
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'full_name, age_group, onboarding_completed, consent_video_analysis, consent_personalization',
        )
        .eq('id', user.id)
        .maybeSingle();
      name = profile?.full_name || '–';
      ageGroup = profile?.age_group || '–';
      onboarded = profile?.onboarding_completed ?? false;
      video = profile?.consent_video_analysis ?? false;
      personalization = profile?.consent_personalization ?? false;
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">Profile</h1>
      </header>

      {signedIn && onboarded && (
        <Link href="/speech-profile" className="block">
          <Card className="flex items-center justify-between">
            <div>
              <CardTitle>Your speech profile</CardTitle>
              <p className="mt-0.5 text-sm text-charcoal/55">View your full results &amp; plan</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-charcoal/30" />
          </Card>
        </Link>
      )}

      <Card>
        <CardTitle>Account</CardTitle>
        <div className="mt-2">
          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Age group" value={ageGroup} />
          <Row label="Onboarding" value={onboarded ? 'Complete' : 'Not started'} />
        </div>
      </Card>

      {signedIn ? (
        <>
          <ConsentSettings video={video} personalization={personalization} />

          <Card>
            <CardTitle>Manage</CardTitle>
            <div className="mt-3 space-y-2">
              <RetakeOnboardingButton />
              <ReplayTutorialButton />
            </div>
          </Card>

          <LogoutButton />
        </>
      ) : (
        <p className="text-center text-xs text-charcoal/45">
          Connect Supabase keys and sign in to see your account here.
        </p>
      )}
    </div>
  );
}
