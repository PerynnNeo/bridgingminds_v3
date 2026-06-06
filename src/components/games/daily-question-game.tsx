'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Flame,
  Target,
  Award,
  Shuffle,
  ArrowRight,
  Lightbulb,
  Disc3,
  Square,
  RotateCcw,
  Eye,
} from 'lucide-react';
import type { GameFeedback } from '@/lib/ai/game';
import type { DailyStats } from '@/lib/games/stats';
import { useCameraCapture } from '@/lib/hooks/use-camera-capture';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraStage } from '@/components/vision/camera-stage';
import { formatScore, cn } from '@/lib/utils';

export interface DailyQ {
  text: string;
  category: string | null;
  difficulty: string | null;
}

type Status = 'idle' | 'spinning' | 'prep' | 'recording' | 'recorded' | 'submitting' | 'feedback' | 'error';

interface VisualFeedback {
  strength: string;
  improvement: string;
  retryInstruction: string;
  combinedTip: string;
}

const SPEAK_SECONDS = 60;

const TIPS = [
  'Slow down a little. Confidence sounds unhurried.',
  'Open with your opinion, then back it with one reason.',
  'A short pause beats a filler word like "um".',
  'Picture one person and talk just to them.',
  'Finish with a clear last line so your point lands.',
  'Give one real example. It makes any answer stick.',
];

const DIFF_STYLES: Record<string, string> = {
  easy: 'bg-success/15 text-success',
  medium: 'bg-warning/20 text-charcoal/70',
  hard: 'bg-danger/15 text-danger',
};

function CircularDial({
  secondsLeft,
  total,
  label,
  tone = 'primary',
}: {
  secondsLeft: number;
  total: number;
  label: string;
  tone?: 'primary' | 'rec';
}) {
  const size = 168;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, secondsLeft / total)) : 1;
  const offset = circ * (1 - pct);
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={tone === 'rec' ? 'stroke-danger/15' : 'stroke-primary-100'}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-1000 ease-linear',
            tone === 'rec' ? 'stroke-danger' : 'stroke-primary-500',
          )}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold tabular-nums text-charcoal">
          {mm}:{ss}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal/45">
          {tone === 'rec' && <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />}
          {label}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: typeof Flame; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-cream px-2 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary-500" />
      <div className="mt-1.5 text-xl font-bold tabular-nums text-charcoal">{value}</div>
      <div className="text-[11px] text-charcoal/50">{label}</div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
      {label} {Math.round(value)}
    </span>
  );
}

function QuestionPills({ q }: { q: DailyQ }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {q.category && (
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium capitalize text-primary-700">
          {q.category}
        </span>
      )}
      {q.difficulty && (
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold capitalize',
            DIFF_STYLES[q.difficulty] ?? 'bg-cream text-charcoal/60',
          )}
        >
          {q.difficulty}
        </span>
      )}
    </div>
  );
}

export function DailyQuestionGame({
  questions,
  initialIndex,
  stats,
  cameraEnabled = false,
}: {
  questions: DailyQ[];
  initialIndex: number;
  stats: DailyStats;
  cameraEnabled?: boolean;
}) {
  const router = useRouter();
  const cap = useCameraCapture({ video: cameraEnabled, enabled: true });
  const safeIndex = questions.length ? initialIndex % questions.length : 0;

  const [status, setStatus] = useState<Status>('idle');
  const [current, setCurrent] = useState<DailyQ>(questions[safeIndex] ?? { text: '', category: null, difficulty: null });
  const [display, setDisplay] = useState<DailyQ>(questions[safeIndex] ?? { text: '', category: null, difficulty: null });
  const [tipIndex, setTipIndex] = useState(safeIndex);
  const [secsLeft, setSecsLeft] = useState(SPEAK_SECONDS);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [visual, setVisual] = useState<VisualFeedback | null>(null);
  const [error, setError] = useState('');

  const pick = () => questions[Math.floor(Math.random() * questions.length)];
  const recorded = cap.audioBlob !== null && !cap.isRecording;

  // Spin animation: rapidly cycle questions, then land on one.
  function spin() {
    if (questions.length === 0) return;
    setStatus('spinning');
    setFeedback(null);
    setVisual(null);
    setError('');
    cap.reset();
    let ticks = 0;
    const id = setInterval(() => {
      setDisplay(pick());
      ticks += 1;
      if (ticks > 16) {
        clearInterval(id);
        const final = pick();
        setCurrent(final);
        setDisplay(final);
        setTipIndex((n) => n + 1);
        setStatus('idle');
      }
    }, 80);
  }

  function startSpeaking() {
    setSecsLeft(SPEAK_SECONDS);
    setError('');
    cap.start();
    setStatus('recording');
  }

  function stopSpeaking() {
    cap.stop();
    setStatus('recorded');
  }

  // Live countdown while recording; auto-stop at zero.
  useEffect(() => {
    if (status !== 'recording') return;
    const id = setInterval(() => {
      setSecsLeft((n) => {
        if (n <= 1) {
          clearInterval(id);
          cap.stop();
          setStatus('recorded');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Surface microphone problems (permission denied, unsupported) as an error step.
  useEffect(() => {
    if (cap.error && (status === 'recording' || status === 'recorded')) {
      setError(cap.error);
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap.error]);

  async function submit() {
    if (!cap.audioBlob) return;
    setStatus('submitting');
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', cap.audioBlob, 'answer.webm');
      fd.append('question', current.text);
      const metrics = cap.finalizeMetrics();
      fd.append('camera_enabled', String(Boolean(metrics)));
      if (metrics) fd.append('visual_metrics', JSON.stringify(metrics));
      const res = await fetch('/api/games/daily', { method: 'POST', body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Could not score that.');
      setFeedback(data as GameFeedback);
      setVisual((data as { visual?: VisualFeedback | null } | null)?.visual ?? null);
      setStatus('feedback');
      router.refresh(); // refresh streak / avg / best for the next round
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  const tip = TIPS[((tipIndex % TIPS.length) + TIPS.length) % TIPS.length];

  // ---- Error screen ----
  if (status === 'error') {
    return (
      <Card className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-charcoal/70">{error || 'Something went wrong.'}</p>
        <Button
          onClick={() => {
            cap.reset();
            setError('');
            setStatus('idle');
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  // ---- Prep (ready) screen ----
  if (status === 'prep') {
    return (
      <div className="space-y-5">
        <Card className="bg-primary-50 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-700">Your topic</span>
          <p className="mt-1.5 text-lg font-bold leading-snug text-charcoal">{current.text}</p>
        </Card>
        <div className="flex flex-col items-center gap-5 py-2">
          {cameraEnabled && <CameraStage capture={cap} className="aspect-[4/3] w-full" />}
          <CircularDial secondsLeft={SPEAK_SECONDS} total={SPEAK_SECONDS} label="Ready" />
          <p className="max-w-xs text-center text-sm text-charcoal/60">
            Take a moment to think. When you are ready, start speaking for about a minute.
          </p>
          <Button size="full" onClick={startSpeaking}>
            Start speaking
            <ArrowRight className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="text-sm font-medium text-charcoal/45"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---- Recording screen ----
  if (status === 'recording') {
    return (
      <div className="space-y-5">
        <Card className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">Your topic</span>
          <p className="mt-1 text-base font-semibold leading-snug text-charcoal">{current.text}</p>
        </Card>
        <div className="flex flex-col items-center gap-5 py-2">
          {cameraEnabled && (
            <CameraStage capture={cap} showReadiness={false} dim className="mx-auto aspect-[3/4] w-28" />
          )}
          <CircularDial secondsLeft={secsLeft} total={SPEAK_SECONDS} label="Recording" tone="rec" />
          <p className="text-sm text-charcoal/60">Speak naturally. We will stop automatically at zero.</p>
          <Button size="full" variant="danger" onClick={stopSpeaking}>
            <Square className="h-4 w-4 fill-current" />
            Stop and review
          </Button>
        </div>
      </div>
    );
  }

  // ---- Recorded (confirm) screen ----
  if (status === 'recorded' || status === 'submitting') {
    return (
      <div className="space-y-5">
        <Card className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">Your topic</span>
          <p className="mt-1 text-base font-semibold leading-snug text-charcoal">{current.text}</p>
        </Card>
        <Card className="flex flex-col items-center gap-4 py-7 text-center">
          {status === 'submitting' ? (
            <>
              <Disc3 className="h-10 w-10 animate-spin text-primary-400" />
              <p className="text-sm text-charcoal/55">Scoring your answer…</p>
            </>
          ) : (
            <>
              <p className="text-sm text-charcoal/70">Nice, that is recorded. Ready for your feedback?</p>
              <Button size="full" onClick={submit} disabled={!recorded}>
                {recorded ? 'Get my feedback' : 'Finishing up…'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  cap.reset();
                  setStatus('prep');
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/45"
              >
                <RotateCcw className="h-4 w-4" />
                Record again
              </button>
            </>
          )}
        </Card>
      </div>
    );
  }

  // ---- Feedback screen ----
  if (status === 'feedback' && feedback) {
    return (
      <div className="space-y-5">
        <Card className="bg-primary-50 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-700">Your topic</span>
          <p className="mt-1.5 text-base font-semibold leading-snug text-charcoal">{current.text}</p>
        </Card>
        <Card>
          <div className="flex flex-wrap justify-center gap-1.5">
            <ScorePill label="Clarity" value={feedback.clarityScore} />
            <ScorePill label="Pacing" value={feedback.pacingScore} />
            <ScorePill label="Structure" value={feedback.structureScore} />
            <ScorePill label="Confidence" value={feedback.confidenceScore} />
            <ScorePill label="On topic" value={feedback.relevanceScore} />
          </div>
          <p className="mt-3 text-sm text-charcoal/80">{feedback.feedback}</p>
          <div className="mt-3 flex gap-2.5 rounded-xl bg-info/10 p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span className="text-sm text-charcoal/75">{feedback.tip}</span>
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
            <div className="mt-3 flex gap-2.5 rounded-xl bg-info/10 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <span className="text-sm text-charcoal/75">{visual.retryInstruction}</span>
            </div>
          </Card>
        )}
        <Button size="full" onClick={spin}>
          <Shuffle className="h-4 w-4" />
          Spin a new question
        </Button>
      </div>
    );
  }

  // ---- Idle / spinning (the wheel) ----
  const spinning = status === 'spinning';
  const shown = spinning ? display : current;
  return (
    <div className="space-y-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
        <Zap className="h-3.5 w-3.5" />
        Daily Challenge
      </span>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={Flame} value={stats.streak} label="Streak" />
        <StatCard icon={Target} value={formatScore(stats.avgScore)} label="Avg score" />
        <StatCard icon={Award} value={formatScore(stats.bestScore)} label="Best" />
      </div>

      <Card className="flex min-h-[150px] flex-col justify-center text-center">
        {spinning ? (
          <div className="flex flex-col items-center gap-3">
            <Disc3 className="h-6 w-6 animate-spin text-primary-400" />
            <p className="text-lg font-semibold leading-snug text-charcoal/50 blur-[0.5px]">{shown.text}</p>
          </div>
        ) : (
          <>
            <QuestionPills q={shown} />
            <p className="mt-3 text-xl font-bold leading-snug text-charcoal">{shown.text}</p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" disabled={spinning} onClick={spin}>
          <Shuffle className="h-4 w-4" />
          Spin again
        </Button>
        <Button className="w-full" disabled={spinning} onClick={() => setStatus('prep')}>
          Start
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2.5 rounded-2xl bg-info/10 p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-info">Tip</p>
          <p className="text-sm text-charcoal/75">{tip}</p>
        </div>
      </div>
    </div>
  );
}
