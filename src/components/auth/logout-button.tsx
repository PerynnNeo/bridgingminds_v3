'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={pending}
      onClick={() => startTransition(async () => { await logout(); })}
    >
      <LogOut className="h-4 w-4" />
      {pending ? 'Signing out…' : 'Log out'}
    </Button>
  );
}
