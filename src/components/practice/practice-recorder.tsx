'use client';

import { useState } from 'react';
import { Volume2, Lightbulb, RotateCcw, TrendingUp, Eye, Video } from 'lucide-react';
import type { AttemptFeedback } from '@/lib/ai/types';
import { useCameraCapture } from '@/lib/hooks/use-camera-capture';
import { speak } from '@/lib/tts';
import { CameraStage } from '@/components/vision/camera-stage';
import { useUpgrade } from '@/components/billing/upgrade-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecordButton } from '@/components/ui/record-button';

type Status = 'idle' | 'submitting' | 'done' | 'error';

interface VisualFeedback {
  strength: string;
  improvement: string;
  retryInstruction: string;
  combinedTip: string;
}

const CAMERA_TIPS: Record<string, string> = {
  presentation: 'Look at the lens (top of your phone) as you open, then pause before your topic.',
  pitch: 'Look at the lens on your key words so your point really lands.',
  thinking: 'It is okay to look away while thinking. Look back at the lens before you answer.',
};

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
  camera = false,
  category,
}: {
  text: string;
  targetSkill: string;
  dbId?: string;
  showListen?: boolean;
  camera?: boolean;
  category?: string;
}) {
  const cap = useCameraCapture({ video: camera, enabled: true });
  const { open: openUpgrade } = useUpgrade();
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [visual, setVisual] = useState<VisualFeedback | null>(null);
  const [improved, setImproved] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const recorded = cap.audioBlob !== null && !cap.isRecording;
  const tip = category ? CAMERA_TIPS[category] : undefined;

  async function submit() {
    if (!cap.audioBlob) return;
    setStatus('submitting');
    setError('');
    try {
      const metrics = cap.finalizeMetrics();
      const fd = new FormData();
      fd.append('audio', cap.audioBlob, 'attempt.webm');
      fd.append('text', text);
      fd.append('target_skill', targetSkill);
      if (dbId) fd.append('item_id', dbId);
      if (category) fd.append('category', category);
      fd.append('camera_enabled', String(Boolean(metrics)));
      if (metrics) fd.append('visual_metrics', JSON.stringify(metrics));

      const res = await fetch('/api/practice/attempt', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.upgrade) {
          openUpgrade();
          setStatus('idle');
          return;
        }
        throw new Error(data?.error || 'Could not score that attempt.');
      }
      setFeedback(data as AttemptFeedback);
      setVisual((data as { visual?: VisualFeedback | null } | null)?.visual ?? null);
      setImproved((data as { improved?: boolean | null } | null)?.improved ?? null);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  function reset() {
    cap.reset();
    setFeedback(null);
    setVisual(null);
    setImproved(null);
    setError('');
    setStatus('idle');
  }

  if (status === 'done' && feedback) {
    return (
      <div className="space-y-3">
        <Card>
          {visual && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/40">Speech</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <ScorePill label="Clarity" value={feedback.clarityScore} />
            <ScorePill label="Pacing" value={feedback.pacingScore} />
            <ScorePill label="Pronunciation" value={feedback.pronunciationScore} />
            {typeof feedback.relevanceScore === 'number' && (
              <ScorePill label="On topic" value={feedback.relevanceScore} />
            )}
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
        </Card>

        {visual && (
          <Card>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              <Eye className="h-3.5 w-3.5" />
              Visual delivery
            </p>
            <p className="mt-2 flex gap-2 text-sm text-charcoal/80">
              <span className="text-primary-500">✓</span>
              {visual.strength}
            </p>
            <p className="mt-1.5 flex gap-2 text-sm text-charcoal/80">
              <span className="text-info">→</span>
              {visual.improvement}
            </p>
            <div className="mt-3 flex gap-2 rounded-xl bg-info/10 p-3 text-sm text-charcoal/75">
              <Lightbulb className="h-4 w-4 shrink-0 text-info" />
              <span>{visual.retryInstruction}</span>
            </div>
          </Card>
        )}

        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {camera && (
        <CameraStage
          capture={cap}
          showReadiness={!cap.isRecording}
          dim={cap.isRecording}
          className={cap.isRecording ? 'mx-auto aspect-[3/4] w-28' : 'aspect-[4/3] w-full'}
        />
      )}

      {camera && tip && !cap.isRecording && (
        <div className="flex gap-2 rounded-xl bg-primary-50 p-3 text-sm text-charcoal/75">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <span>{tip}</span>
        </div>
      )}

      <Card className="flex flex-col items-center gap-3 py-6">
        {showListen && (
          <Button variant="secondary" size="sm" onClick={() => speak(text)}>
            <Volume2 className="h-4 w-4" />
            Listen
          </Button>
        )}
        <RecordButton
          isRecording={cap.isRecording}
          disabled={status === 'submitting'}
          onClick={() => (cap.isRecording ? cap.stop() : cap.start())}
        />
        {status === 'submitting' ? (
          <span className="text-sm text-charcoal/55">Scoring…</span>
        ) : recorded ? (
          <Button size="sm" onClick={submit}>
            Get feedback
          </Button>
        ) : (
          <span className="text-sm text-charcoal/55">
            {cap.isRecording ? 'Recording… tap to stop' : 'Tap to record yourself'}
          </span>
        )}
        {cap.error && <p className="text-center text-sm text-danger">{cap.error}</p>}
        {status === 'error' && <p className="text-center text-sm text-danger">{error}</p>}
      </Card>
    </div>
  );
}
