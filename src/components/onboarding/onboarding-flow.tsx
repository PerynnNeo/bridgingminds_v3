'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Video, ArrowRight } from 'lucide-react';
import type { OnboardingAnalysis } from '@/lib/ai/types';
import type { VisualMetrics } from '@/lib/vision/types';
import { useCameraCapture, type CameraCapture } from '@/lib/hooks/use-camera-capture';
import { updateConsent } from '@/lib/actions/profile';
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
import { CameraStage } from '@/components/vision/camera-stage';
import { CameraSetup } from '@/components/vision/camera-setup';
import { ProfileResultView } from '@/components/onboarding/profile-result-view';

type Step = 'intro' | 'setup' | 'reading' | 'rapid' | 'analyzing' | 'result' | 'error';
type VisualBaseline = { summary: string; metrics: VisualMetrics } | null;
type Result = {
  profile: OnboardingAnalysis['profile'];
  plan: OnboardingAnalysis['plan'];
  visual: VisualBaseline;
};

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
  capture,
  showCamera,
  onSubmit,
}: {
  title: string;
  instruction: string;
  card: React.ReactNode;
  minSeconds: number;
  thinkingSeconds?: number;
  submitLabel: string;
  capture: CameraCapture;
  showCamera: boolean;
  onSubmit: (blob: Blob, metrics: VisualMetrics | null) => void;
}) {
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
  const recorded = capture.audioBlob !== null && !capture.isRecording;
  const longEnough = capture.durationSec >= minSeconds;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{instruction}</p>
      </header>

      {card}

      {showCamera && <CameraStage capture={capture} showReadiness={!capture.isRecording} className="aspect-[4/3] w-full" />}

      {preparing ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="text-sm text-charcoal/60">Get ready…</span>
          <span className="text-5xl font-bold text-primary-500">{prepLeft}</span>
          <span className="text-xs text-charcoal/45">Recording starts when you tap the button.</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <RecordButton
            isRecording={capture.isRecording}
            onClick={() => (capture.isRecording ? capture.stop() : capture.start())}
          />
          <span className="text-sm font-medium text-charcoal/70">
            {capture.isRecording
              ? 'Recording… tap to stop'
              : recorded
                ? 'Got it! Tap to re-record'
                : 'Tap to record'}
          </span>
          {(capture.isRecording || recorded) && (
            <span className="text-xs tabular-nums text-charcoal/45">{formatTime(capture.durationSec)}</span>
          )}
          {capture.error && <p className="text-center text-sm text-danger">{capture.error}</p>}
        </div>
      )}

      {recorded && (
        <div className="space-y-2">
          <Button
            size="full"
            className="w-full"
            disabled={!longEnough}
            onClick={() => {
              const metrics = capture.finalizeMetrics();
              if (capture.audioBlob) onSubmit(capture.audioBlob, metrics);
            }}
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
  const [choice, setChoice] = useState<'camera' | 'audio' | null>(null);
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);
  const [readingMetrics, setReadingMetrics] = useState<VisualMetrics | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [question] = useState(() => RAPID_QUESTIONS[Math.floor(Math.random() * RAPID_QUESTIONS.length)]);

  const capture = useCameraCapture({ video: choice === 'camera', enabled: choice !== null });
  const showCamera = choice === 'camera';

  function chooseCamera() {
    setChoice('camera');
    void updateConsent('consent_video_analysis', true);
    setStep('setup');
  }

  function chooseAudio() {
    setChoice('audio');
    setStep('reading');
  }

  async function runAnalysis(
    reading: Blob,
    readingM: VisualMetrics | null,
    rapid: Blob,
    rapidM: VisualMetrics | null,
  ) {
    setStep('analyzing');
    try {
      const fd = new FormData();
      fd.append('reading', reading, 'reading.webm');
      fd.append('rapid', rapid, 'rapid.webm');
      fd.append('reading_text', READING_PASSAGE);
      fd.append('rapid_prompt', question);
      fd.append('camera_enabled', String(Boolean(readingM || rapidM)));
      if (readingM) fd.append('reading_visual', JSON.stringify(readingM));
      if (rapidM) fd.append('rapid_visual', JSON.stringify(rapidM));

      const res = await fetch('/api/onboarding/analyze', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Analysis failed. Please try again.');
      setResult(data as Result);
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
            Two quick recordings: read a short passage, then answer one question. This takes about
            two minutes.
          </p>
        </div>

        <Card className="text-left">
          <CardTitle>Turn on your camera too?</CardTitle>
          <p className="mt-1 text-sm text-charcoal/60">
            We can also coach your visual delivery, like eye contact and framing. Your video stays
            on your device and is never saved, only the delivery scores are.
          </p>
          <div className="mt-4 space-y-2">
            <Button size="full" className="w-full" onClick={chooseCamera}>
              <Video className="h-5 w-5" />
              Use my camera
            </Button>
            <Button variant="ghost" size="full" className="w-full" onClick={chooseAudio}>
              Audio only
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'setup') {
    return <CameraSetup capture={capture} onReady={() => setStep('reading')} />;
  }

  if (step === 'reading') {
    return (
      <RecordStep
        key="reading"
        title="Read this aloud"
        instruction="Read at a natural, comfortable pace."
        minSeconds={MIN_READING_SECONDS}
        submitLabel="Next"
        capture={capture}
        showCamera={showCamera}
        onSubmit={(blob, metrics) => {
          setReadingBlob(blob);
          setReadingMetrics(metrics);
          capture.reset();
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
        capture={capture}
        showCamera={showCamera}
        onSubmit={(blob, metrics) => {
          if (readingBlob) runAnalysis(readingBlob, readingMetrics, blob, metrics);
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
          showCamera ? 'Reviewing your visual delivery' : 'Building your practice plan',
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
        visual={result.visual}
        onStart={() => router.push('/home')}
      />
    );
  }

  return null;
}
