'use client';

import { Crown } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUpgrade } from './upgrade-provider';

export function PlanCard({ plan }: { plan: 'free' | 'premium' }) {
  const { open } = useUpgrade();

  if (plan === 'premium') {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Your plan</CardTitle>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Crown className="h-3.5 w-3.5" />
            Premium
          </span>
        </div>
        <p className="mt-2 text-sm text-charcoal/70">You have Premium access.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Your plan</CardTitle>
      <p className="mt-1 text-sm text-charcoal/60">You are on the Free plan, with small daily limits.</p>
      <Button size="sm" className="mt-3" onClick={open}>
        <Crown className="h-4 w-4" />
        Upgrade to Premium
      </Button>
    </Card>
  );
}
