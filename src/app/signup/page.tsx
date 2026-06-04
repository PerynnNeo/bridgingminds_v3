import type { Metadata } from 'next';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Join BridgingMinds',
  description: 'Build confidence in speaking, presenting, and expressing yourself clearly.',
};

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-500 text-white">
          <Mic className="h-6 w-6" />
        </span>
        <span className="text-2xl font-bold text-charcoal">Create your account</span>
        <span className="text-sm text-charcoal/60">
          Build confidence in speaking, presenting, and expressing yourself clearly.
        </span>
      </Link>
      <SignupForm />
    </main>
  );
}
