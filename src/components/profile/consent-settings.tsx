'use client';

import { useState, useTransition } from 'react';
import { updateConsent } from '@/lib/actions/profile';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors duration-200',
        checked ? 'bg-primary-500' : 'bg-charcoal/20',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'h-5 w-5 shrink-0 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">{title}</p>
        <p className="mt-0.5 text-xs text-charcoal/55">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function ConsentSettings({
  video,
  personalization,
}: {
  video: boolean;
  personalization: boolean;
}) {
  const [vid, setVid] = useState(video);
  const [pers, setPers] = useState(personalization);
  const [, startTransition] = useTransition();

  function save(field: 'consent_video_analysis' | 'consent_personalization', value: boolean) {
    if (field === 'consent_video_analysis') setVid(value);
    else setPers(value);
    startTransition(async () => {
      await updateConsent(field, value);
    });
  }

  return (
    <Card>
      <CardTitle>Consent &amp; privacy</CardTitle>
      <div className="mt-3 space-y-4">
        <Row title="Audio recording analysis" desc="Required, this is how we analyse your speech.">
          <Toggle checked disabled />
        </Row>
        <Row title="Video analysis" desc="Optional camera-based delivery cues.">
          <Toggle checked={vid} onChange={(v) => save('consent_video_analysis', v)} />
        </Row>
        <Row title="Personalise my practice" desc="Use my recordings to tailor my plan.">
          <Toggle checked={pers} onChange={(v) => save('consent_personalization', v)} />
        </Row>
      </div>
    </Card>
  );
}
