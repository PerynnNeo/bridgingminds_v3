'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUpgrade } from './upgrade-provider';

export function PlanCard({
  plan,
  status,
  periodEnd,
  cancelAtPeriodEnd,
}: {
  plan: 'free' | 'premium';
  status?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const { open } = useUpgrade();
  const [loading, setLoading] = useState(false);

  async function manage() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through
    }
    setLoading(false);
  }

  const dateStr = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  if (plan === 'premium') {
    const line =
      status === 'trialing' && dateStr
        ? `Free trial now, then SGD 10/month from ${dateStr}.`
        : cancelAtPeriodEnd && dateStr
          ? `Premium until ${dateStr}, then it ends.`
          : dateStr
            ? `SGD 10/month, renews ${dateStr}.`
            : 'You have Premium access.';
    return (
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Your plan</CardTitle>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
            <Crown className="h-3.5 w-3.5" />
            Premium
          </span>
        </div>
        <p className="mt-2 text-sm text-charcoal/70">{line}</p>
        <Button variant="outline" size="sm" className="mt-3" disabled={loading} onClick={manage}>
          {loading ? 'Opening…' : 'Manage subscription'}
        </Button>
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
