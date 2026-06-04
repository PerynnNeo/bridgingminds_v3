'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ArrowRight } from 'lucide-react';
import type { OnboardingAnalysis } from '@/lib/ai/types';
import { useRecorder } from '@/lib/hooks/use-recorder';
import {
  READING_PASSAGE,
  RAPID_QUESTIONS,
  THINKING_SECONDS,
  MIN_READING_SECONDS,
  MIN_RAPID_SECONDS,
} from '@/lib/onboarding/content';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { RecordButton } from '@/components/ui/record-button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ProfileResultView } from '@/components/onboarding/profile-result-view';

type Step = 'intro' | 'reading' | 'rapid' | 'analyzing' | 'result' | 'error';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function RecordStep({
  title,
  instruction,
  card,
  minSeconds,
  thinkingSeconds = 0,
  submitLabel,
  onSubmit,
}: {
  title: string;
  instruction: string;
  card: React.ReactNode;
  minSeconds: number;
  thinkingSeconds?: number;
  submitLabel: string;
  onSubmit: (blob: Blob) => void;
}) {
  const rec = useRecorder();
  const [prepLeft, setPrepLeft] = useState(thinkingSeconds);

  useEffect(() => {
    if (thinkingSeconds <= 0) return;
    setPrepLeft(thinkingSeconds);
    const id = setInterval(() => {
      setPrepLeft((n) => {
        if (n <= 1) {
          clearInterval(id);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [thinkingSeconds]);

  const preparing = thinkingSeconds > 0 && prepLeft > 0;
  const recorded = rec.audioBlob !== null && !rec.isRecording;
  const longEnough = rec.durationSec >= minSeconds;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{instruction}</p>
      </header>

      {card}

      {preparing ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="text-sm text-charcoal/60">Get ready…</span>
          <span className="text-5xl font-bold text-primary-500">{prepLeft}</span>
          <span className="text-xs text-charcoal/45">Recording starts when you tap the button.</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <RecordButton
            isRecording={rec.isRecording}
            onClick={() => (rec.isRecording ? rec.stop() : rec.start())}
          />
          <span className="text-sm font-medium text-charcoal/70">
            {rec.isRecording
              ? 'Recording… tap to stop'
              : recorded
                ? 'Got it! Tap to re-record'
                : 'Tap to record'}
          </span>
          {(rec.isRecording || recorded) && (
            <span className="text-xs tabular-nums text-charcoal/45">
              {formatTime(rec.durationSec)}
            </span>
          )}
          {rec.error && <p className="text-center text-sm text-danger">{rec.error}</p>}
        </div>
      )}

      {recorded && (
        <div className="space-y-2">
          <Button
            size="full"
            className="w-full"
            disabled={!longEnough}
            onClick={() => rec.audioBlob && onSubmit(rec.audioBlob)}
          >
            {submitLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!longEnough && (
            <p className="text-center text-xs text-charcoal/45">
              Try recording a little longer so we have enough to learn from.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<OnboardingAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [question] = useState(
    () => RAPID_QUESTIONS[Math.floor(Math.random() * RAPID_QUESTIONS.length)],
  );

  async function runAnalysis(reading: Blob, rapid: Blob) {
    setStep('analyzing');
    try {
      const fd = new FormData();
      fd.append('reading', reading, 'reading.webm');
      fd.append('rapid', rapid, 'rapid.webm');
      fd.append('reading_text', READING_PASSAGE);
      fd.append('rapid_prompt', question);
      const res = await fetch('/api/onboarding/analyze', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Analysis failed. Please try again.');
      setResult(data as OnboardingAnalysis);
      setStep('result');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong.');
      setStep('error');
    }
  }

  if (step === 'intro') {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-500 text-white">
          <Mic className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Let&apos;s learn your speaking style</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            Two quick recordings, read a short passage, then answer one question. We&apos;ll use
            them to personalise your practice. This takes about two minutes.
          </p>
        </div>
        <Button size="full" className="w-full" onClick={() => setStep('reading')}>
          I&apos;m ready
        </Button>
      </div>
    );
  }

  if (step === 'reading') {
    return (
      <RecordStep
        key="reading"
        title="Read this aloud"
        instruction="Read at a natural, comfortable pace."
        minSeconds={MIN_READING_SECONDS}
        submitLabel="Next"
        onSubmit={(blob) => {
          setReadingBlob(blob);
          setStep('rapid');
        }}
        card={
          <Card>
            <p className="text-lg leading-relaxed text-charcoal">{READING_PASSAGE}</p>
          </Card>
        }
      />
    );
  }

  if (step === 'rapid') {
    return (
      <RecordStep
        key="rapid"
        title="Now, your turn"
        instruction="Take a few seconds to think, then answer in your own words."
        minSeconds={MIN_RAPID_SECONDS}
        thinkingSeconds={THINKING_SECONDS}
        submitLabel="Build my profile"
        onSubmit={(blob) => {
          if (readingBlob) runAnalysis(readingBlob, blob);
        }}
        card={
          <Card className="bg-primary-50">
            <CardTitle className="text-primary-700">Your question</CardTitle>
            <p className="mt-2 text-xl font-semibold text-charcoal">{question}</p>
          </Card>
        }
      />
    );
  }

  if (step === 'analyzing') {
    return (
      <LoadingState
        title="Creating your speech profile…"
        steps={[
          'Analysing your pacing',
          'Checking pronunciation patterns',
          'Finding filler words',
          'Building your practice plan',
        ]}
      />
    );
  }

  if (step === 'error') {
    return (
      <ErrorState
        title="We couldn’t finish your analysis"
        description={errorMsg}
        onRetry={() => setStep('intro')}
      />
    );
  }

  if (result) {
    return (
      <ProfileResultView
        profile={result.profile}
        plan={result.plan}
        onStart={() => router.push('/home')}
      />
    );
  }

  return null;
}
