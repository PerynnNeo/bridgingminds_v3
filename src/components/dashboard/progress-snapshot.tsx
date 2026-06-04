import { Flame, Mic, MessageSquare, TrendingUp } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-base font-bold leading-tight text-charcoal">{value}</div>
        <div className="text-xs text-charcoal/55">{label}</div>
      </div>
    </div>
  );
}

export function ProgressSnapshot({
  streak,
  totalRecordings,
  phrasesPractised,
  mostImprovedSkill,
}: {
  streak: number;
  totalRecordings: number;
  phrasesPractised: number;
  mostImprovedSkill: string | null;
}) {
  return (
    <Card>
      <CardTitle>Your progress</CardTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Stat icon={Flame} value={`${streak}-day`} label="Streak" />
        <Stat icon={Mic} value={totalRecordings} label="Recordings" />
        <Stat icon={MessageSquare} value={phrasesPractised} label="Phrases practised" />
        <Stat icon={TrendingUp} value={mostImprovedSkill ?? '–'} label="Most improved" />
      </div>
    </Card>
  );
}
