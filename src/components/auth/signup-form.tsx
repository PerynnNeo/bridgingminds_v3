'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { signup } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';

function ConsentRow({
  name,
  required,
  children,
}: {
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-primary-100 bg-white p-3">
      <input
        type="checkbox"
        name={name}
        required={required}
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary-500"
      />
      <span className="text-sm text-charcoal/75">{children}</span>
    </label>
  );
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signup(formData);
      if (result && 'error' in result) setError(result.error);
      else if (result && 'needsConfirmation' in result) setConfirmEmail(true);
      // On immediate success the action redirects.
    });
  }

  if (confirmEmail) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-card">
        <MailCheck className="mx-auto h-10 w-10 text-primary-500" />
        <h2 className="mt-3 text-lg font-semibold text-charcoal">Check your email</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          We sent you a confirmation link. Tap it to finish creating your account, then sign in.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary-600">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Display name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required placeholder="What should we call you?" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <Label htmlFor="age_group">Age group</Label>
        <Select id="age_group" name="age_group" defaultValue="">
          <option value="" disabled>
            Select your age group
          </option>
          <option value="13-15">13–15</option>
          <option value="16-18">16–18</option>
          <option value="19-21">19–21</option>
          <option value="22-25">22–25</option>
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-charcoal/80">Your consent</legend>
        <ConsentRow name="consent_audio" required>
          Allow voice recording analysis (required), we analyse pacing, clarity, and pronunciation.
        </ConsentRow>
        <ConsentRow name="consent_video">
          Allow optional video analysis, observe delivery cues like eye contact. You can turn this off anytime.
        </ConsentRow>
        <ConsentRow name="consent_personalization">
          Use my recordings to personalise my practice.
        </ConsentRow>
      </fieldset>

      <p className="text-xs text-charcoal/45">
        If you’re under the age where consent is required, please use BridgingMinds with a parent or
        guardian’s permission.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" size="full" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-charcoal/60">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
