'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, GraduationCap } from 'lucide-react';
import { retakeOnboarding } from '@/lib/actions/profile';
import { Button } from '@/components/ui/button';
import { TOUR_DONE_KEY } from '@/components/tutorial/welcome-tour';

export function RetakeOnboardingButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError('');
            const result = await retakeOnboarding();
            if (result?.error) setError(result.error);
          })
        }
      >
        <RefreshCw className="h-4 w-4" />
        {pending ? 'Starting…' : 'Retake voice onboarding'}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ReplayTutorialButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="w-full"
      onClick={() => {
        if (typeof window !== 'undefined') localStorage.removeItem(TOUR_DONE_KEY);
        router.push('/home');
      }}
    >
      <GraduationCap className="h-4 w-4" />
      Replay the tutorial
    </Button>
  );
}
