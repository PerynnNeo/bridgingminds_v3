'use client';

import { useState } from 'react';
import { Volume2, Lightbulb, RotateCcw, TrendingUp } from 'lucide-react';
import type { AttemptFeedback } from '@/lib/ai/types';
import { useRecorder } from '@/lib/hooks/use-recorder';
import { speak } from '@/lib/tts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecordButton } from '@/components/ui/record-button';

type Status = 'idle' | 'submitting' | 'done' | 'error';

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
      {label} {Math.round(value)}
    </span>
  );
}

export function PracticeRecorder({
  text,
  targetSkill,
  dbId,
  showListen = false,
}: {
  text: string;
  targetSkill: string;
  dbId?: string;
  showListen?: boolean;
}) {
  const rec = useRecorder();
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [improved, setImproved] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const recorded = rec.audioBlob !== null && !rec.isRecording;

  async function submit() {
    if (!rec.audioBlob) return;
    setStatus('submitting');
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', rec.audioBlob, 'attempt.webm');
      fd.append('text', text);
      fd.append('target_skill', targetSkill);
      if (dbId) fd.append('item_id', dbId);
      const res = await fetch('/api/practice/attempt', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Could not score that attempt.');
      setFeedback(data as AttemptFeedback);
      setImproved((data as { improved?: boolean | null } | null)?.improved ?? null);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  function reset() {
    rec.reset();
    setFeedback(null);
    setImproved(null);
    setError('');
    setStatus('idle');
  }

  if (status === 'done' && feedback) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          <ScorePill label="Clarity" value={feedback.clarityScore} />
          <ScorePill label="Pacing" value={feedback.pacingScore} />
          <ScorePill label="Pronunciation" value={feedback.pronunciationScore} />
          {improved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
              <TrendingUp className="h-3 w-3" />
              Better than last time
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-charcoal/80">{feedback.feedback}</p>
        <div className="mt-3 flex gap-2 rounded-xl bg-info/10 p-3 text-sm text-charcoal/75">
          <Lightbulb className="h-4 w-4 shrink-0 text-info" />
          <span>{feedback.tip}</span>
        </div>
        <Button variant="secondary" size="sm" className="mt-3" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 py-6">
      {showListen && (
        <Button variant="secondary" size="sm" onClick={() => speak(text)}>
          <Volume2 className="h-4 w-4" />
          Listen
        </Button>
      )}
      <RecordButton
        isRecording={rec.isRecording}
        disabled={status === 'submitting'}
        onClick={() => (rec.isRecording ? rec.stop() : rec.start())}
      />
      {status === 'submitting' ? (
        <span className="text-sm text-charcoal/55">Scoring…</span>
      ) : recorded ? (
        <Button size="sm" onClick={submit}>
          Get feedback
        </Button>
      ) : (
        <span className="text-sm text-charcoal/55">
          {rec.isRecording ? 'Recording… tap to stop' : 'Tap to record yourself'}
        </span>
      )}
      {status === 'error' && <p className="text-center text-sm text-danger">{error}</p>}
    </Card>
  );
}
