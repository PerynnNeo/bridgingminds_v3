import type { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export const metadata: Metadata = {
  title: 'Onboarding',
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <div className="my-auto w-full">
        <OnboardingFlow />
      </div>
    </main>
  );
}
