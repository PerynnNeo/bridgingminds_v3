import Link from 'next/link';
import { Dumbbell, Disc3, Swords } from 'lucide-react';

const actions = [
  { href: '/practice', icon: Dumbbell, label: 'Practice' },
  { href: '/games', icon: Disc3, label: 'Daily Q' },
  { href: '/games', icon: Swords, label: 'Debate' },
];

/** Three large quick-start shortcuts (spec §6.2.5). */
export function QuickStart() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card transition-transform active:scale-95"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-600">
            <a.icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium text-charcoal/70">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
