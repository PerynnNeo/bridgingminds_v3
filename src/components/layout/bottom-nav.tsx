'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, Gamepad2, User } from 'lucide-react';
import { mainNav, type NavIcon } from '@/config/site';
import { cn } from '@/lib/utils';

const icons: Record<NavIcon, typeof Home> = {
  home: Home,
  practice: Dumbbell,
  games: Gamepad2,
  profile: User,
};

/** Fixed bottom navigation bar (spec §3.5, §6.2.6). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {mainNav.map((item) => {
          const Icon = icons[item.icon];
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                  active ? 'text-primary-600' : 'text-charcoal/45 hover:text-charcoal/70',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
