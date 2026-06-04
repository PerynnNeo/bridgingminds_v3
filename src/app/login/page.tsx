import type { Metadata } from 'next';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to continue improving your speech confidence.',
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-500 text-white">
          <Mic className="h-6 w-6" />
        </span>
        <span className="text-2xl font-bold text-charcoal">Welcome back</span>
        <span className="text-sm text-charcoal/60">
          Sign in to continue improving your speech confidence.
        </span>
      </Link>
      <LoginForm />
    </main>
  );
}
