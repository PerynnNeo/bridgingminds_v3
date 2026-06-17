import type { Metadata } from 'next';
import { BottomNav } from '@/components/layout/bottom-nav';
import { UpgradeProvider } from '@/components/billing/upgrade-provider';
import { UsageTracker } from '@/components/analytics/usage-tracker';
import { LoginReasonModal } from '@/components/analytics/login-reason-modal';

/** Authenticated pages must never be indexed, they hold personal speech data (spec §11.4). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UpgradeProvider>
      <UsageTracker />
      <LoginReasonModal />
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <main className="pb-bottom-nav flex-1 px-4 pt-6">{children}</main>
        <BottomNav />
      </div>
    </UpgradeProvider>
  );
}
