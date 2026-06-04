'use client';

import { useEffect, useState } from 'react';
import { Volume2, Lightbulb, RotateCcw, ArrowRight, Shuffle } from 'lucide-react';
import type { GameFeedback, FriendDebateResult } from '@/lib/ai/game';
import { DEBATE_TOPICS } from '@/lib/games/topics';
import { useRecorder } from '@/lib/hooks/use-recorder';
import { speak } from '@/lib/tts';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecordButton } from '@/components/ui/record-button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

type Step =
  | 'prep'
  | 'argument'
  | 'arg-submitting'
  | 'counterpoint'
  | 'reb-submitting'
  | 'ai-feedback'
  | 'friend-setup'
  | 'friend-p1'
  | 'friend-p2'
  | 'friend-submitting'
  | 'friend-feedback'
  | 'error';

type Side = 'agree' | 'disagree';
type Difficulty = 'easy' | 'medium' | 'hard';

const PREP_SECONDS = 120;

const randomTopic = () => DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
const randomSide = (): Side => (Math.random() < 0.5 ? 'agree' : 'disagree');
const sideLabel = (s: Side) => (s === 'agree' ? 'FOR' : 'AGAINST');

function structureSteps(side: Side): string[] {
  if (side === 'disagree') {
    return [
      'State your opposition clearly, “I argue against…”',
      'Find the biggest flaw in the other side',
      'Give 2–3 counter-examples or evidence',
      'Prepare a strong closing line',
    ];
  }
  return [
    'State your stance clearly, “I argue that…”',
    'Lead with your strongest reason',
    'Back it with 2–3 examples or evidence',
    'Prepare a strong closing line',
  ];
}

function CircularTimer({ left, total }: { left: number; total: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (total > 0 ? left / total : 0));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="relative grid place-items-center">
      <svg width="104" height="104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" strokeWidth="7" className="stroke-primary-50" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-primary-500 transition-all duration-1000 ease-linear"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tabular-nums text-charcoal">
          {mm}:{ss}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-charcoal/40">Prep</div>
      </div>
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

export function DebateGame({
  initialMode,
  difficulty,
  initialTopic,
  initialSide,
}: {
  initialMode: 'ai' | 'human';
  difficulty: Difficulty;
  initialTopic: string;
  initialSide: Side;
}) {
  const rec = useRecorder();
  const [step, setStep] = useState<Step>(initialMode === 'human' ? 'friend-setup' : 'prep');
  const [topic, setTopic] = useState(initialTopic);
  const [side, setSide] = useState<Side>(initialSide);
  const [draft, setDraft] = useState('');
  const [argumentTranscript, setArgumentTranscript] = useState('');
  const [counterpoint, setCounterpoint] = useState('');
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [friendResult, setFriendResult] = useState<FriendDebateResult | null>(null);
  const [p1Blob, setP1Blob] = useState<Blob | null>(null);
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'prep') return;
    setPrepLeft(PREP_SECONDS);
    const id = setInterval(() => {
      setPrepLeft((n) => {
        if (n <= 1) {
          clearInterval(id);
          setStep('argument');
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const recorded = rec.audioBlob !== null && !rec.isRecording;

  async function post(url: string, fd: FormData) {
    const res = await fetch(url, { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
    return data;
  }

  async function submitArgument() {
    if (!rec.audioBlob) return;
    setStep('arg-submitting');
    try {
      const fd = new FormData();
      fd.append('audio', rec.audioBlob, 'argument.webm');
      fd.append('phase', 'argument');
      fd.append('topic', topic);
      fd.append('side', side);
      fd.append('difficulty', difficulty);
      const data = await post('/api/games/debate', fd);
      setArgumentTranscript(data.transcript);
      setCounterpoint(data.counterpoint);
      rec.reset();
      setStep('counterpoint');
      speak(data.counterpoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStep('error');
    }
  }

  async function submitRebuttal() {
    if (!rec.audioBlob) return;
    setStep('reb-submitting');
    try {
      const fd = new FormData();
      fd.append('audio', rec.audioBlob, 'rebuttal.webm');
      fd.append('phase', 'rebuttal');
      fd.append('topic', topic);
      fd.append('side', side);
      fd.append('argument_transcript', argumentTranscript);
      fd.append('counterpoint', counterpoint);
      const data = await post('/api/games/debate', fd);
      setFeedback(data.feedback);
      setStep('ai-feedback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStep('error');
    }
  }

  async function submitFriend() {
    if (!p1Blob || !rec.audioBlob) return;
    setStep('friend-submitting');
    try {
      const fd = new FormData();
      fd.append('audio1', p1Blob, 'p1.webm');
      fd.append('audio2', rec.audioBlob, 'p2.webm');
      fd.append('topic', topic);
      const data = await post('/api/games/debate/friend', fd);
      setFriendResult(data);
      setStep('friend-feedback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStep('error');
    }
  }

  function reset() {
    rec.reset();
    setP1Blob(null);
    setFeedback(null);
    setFriendResult(null);
    setError('');
    setDraft('');
    setTopic(randomTopic());
    setSide(randomSide());
    setStep(initialMode === 'human' ? 'friend-setup' : 'prep');
  }

  function recorder(label: string, onSubmit: () => void) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6">
        <RecordButton
          isRecording={rec.isRecording}
          onClick={() => (rec.isRecording ? rec.stop() : rec.start())}
        />
        {recorded ? (
          <Button size="sm" onClick={onSubmit}>
            {label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-sm text-charcoal/55">
            {rec.isRecording ? 'Recording… tap to stop' : 'Tap to record'}
          </span>
        )}
      </Card>
    );
  }

  const topicCard = (badge: 'FOR' | 'AGAINST' | null) => (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">Debate topic</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-charcoal">{topic}</p>
        </div>
        {badge && (
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold',
              badge === 'FOR'
                ? 'border-primary-300 text-primary-600'
                : 'border-danger/50 text-danger',
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </Card>
  );

  // ---- render ----------------------------------------------------------------
  if (step === 'prep') {
    const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Prepare</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Take a couple of minutes to plan your argument before you start.
          </p>
        </div>

        {topicCard(sideLabel(side) as 'FOR' | 'AGAINST')}
        <p className="text-center text-sm text-charcoal/60">
          You are arguing{' '}
          <strong className={side === 'agree' ? 'text-primary-600' : 'text-danger'}>
            {sideLabel(side)}
          </strong>{' '}
          this motion.
        </p>

        <div className="flex justify-center py-1">
          <CircularTimer left={prepLeft} total={PREP_SECONDS} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-charcoal">Draft your argument</span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-charcoal/50">
              private, only you see this
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder={'Jot down your case…\n• Main point\n• Evidence or example\n• Counter to their likely argument'}
            className="w-full resize-none rounded-2xl border border-primary-100 bg-white p-4 text-sm text-charcoal outline-none placeholder:text-charcoal/35 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
          <p className="mt-1 text-xs text-charcoal/40">
            {draft.length} characters · {words} words
          </p>
        </div>

        <Card>
          <CardTitle>Quick structure guide</CardTitle>
          <ol className="mt-3 space-y-2">
            {structureSteps(side).map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-charcoal/75">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </Card>

        <Button size="full" className="w-full" onClick={() => setStep('argument')}>
          I’m ready, start debate
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-charcoal/40">
          The debate starts automatically when the timer runs out.
        </p>
      </div>
    );
  }

  if (step === 'argument') {
    return (
      <div className="space-y-4">
        {topicCard(sideLabel(side) as 'FOR' | 'AGAINST')}
        <p className="text-center text-sm text-charcoal/60">
          Make your opening argument ({sideLabel(side)}).
        </p>
        {recorder('Send to opponent', submitArgument)}
      </div>
    );
  }

  if (step === 'arg-submitting') return <LoadingState title="Your opponent is thinking…" />;

  if (step === 'counterpoint') {
    return (
      <div className="space-y-4">
        <Card className="bg-primary-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-primary-700">Opponent</CardTitle>
            <button
              type="button"
              onClick={() => speak(counterpoint)}
              className="flex items-center gap-1 text-sm font-medium text-primary-600"
            >
              <Volume2 className="h-4 w-4" />
              Hear again
            </button>
          </div>
          <p className="mt-2 text-base text-charcoal/85">{counterpoint}</p>
        </Card>
        <p className="text-center text-sm text-charcoal/60">Now record your rebuttal.</p>
        {recorder('Get my feedback', submitRebuttal)}
      </div>
    );
  }

  if (step === 'reb-submitting') return <LoadingState title="Scoring your debate…" />;

  if (step === 'ai-feedback' && feedback) {
    return (
      <div className="space-y-4">
        <Card>
          <CardTitle>How you did</CardTitle>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <ScorePill label="Clarity" value={feedback.clarityScore} />
            <ScorePill label="Structure" value={feedback.structureScore} />
            <ScorePill label="Pacing" value={feedback.pacingScore} />
            <ScorePill label="Confidence" value={feedback.confidenceScore} />
          </div>
          <p className="mt-3 text-sm text-charcoal/80">{feedback.feedback}</p>
          <div className="mt-3 flex gap-2 rounded-xl bg-info/10 p-3 text-sm text-charcoal/75">
            <Lightbulb className="h-4 w-4 shrink-0 text-info" />
            <span>{feedback.tip}</span>
          </div>
        </Card>
        <Button size="full" className="w-full" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          New debate
        </Button>
      </div>
    );
  }

  if (step === 'friend-setup') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-charcoal">Debate Game</h1>
        {topicCard(null)}
        <button
          type="button"
          onClick={() => setTopic(randomTopic())}
          className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-charcoal/45"
        >
          <Shuffle className="h-4 w-4" />
          Shuffle motion
        </button>
        <p className="text-center text-sm text-charcoal/60">
          Player 1 argues <strong className="text-primary-600">FOR</strong>, Player 2 argues{' '}
          <strong className="text-danger">AGAINST</strong>. Take turns on this device.
        </p>
        <Button size="full" className="w-full" onClick={() => setStep('friend-p1')}>
          Start
        </Button>
      </div>
    );
  }

  if (step === 'friend-p1') {
    return (
      <div className="space-y-4">
        {topicCard(null)}
        <p className="text-center text-sm font-medium text-charcoal/70">
          Player 1, argue <span className="text-primary-600">FOR</span> the motion.
        </p>
        {recorder('Pass to Player 2', () => {
          setP1Blob(rec.audioBlob);
          rec.reset();
          setStep('friend-p2');
        })}
      </div>
    );
  }

  if (step === 'friend-p2') {
    return (
      <div className="space-y-4">
        {topicCard(null)}
        <p className="text-center text-sm font-medium text-charcoal/70">
          Player 2, argue <span className="text-danger">AGAINST</span> the motion.
        </p>
        {recorder('Compare us', submitFriend)}
      </div>
    );
  }

  if (step === 'friend-submitting') return <LoadingState title="Comparing both players…" />;

  if (step === 'friend-feedback' && friendResult) {
    return (
      <div className="space-y-4">
        <Card>
          <CardTitle>The verdict</CardTitle>
          <p className="mt-2 text-sm text-charcoal/80">{friendResult.comparison}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">Player 1</p>
          <p className="mt-1 text-sm text-charcoal/80">{friendResult.player1Tip}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">Player 2</p>
          <p className="mt-1 text-sm text-charcoal/80">{friendResult.player2Tip}</p>
        </Card>
        <Button size="full" className="w-full" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Play again
        </Button>
      </div>
    );
  }

  if (step === 'error') return <ErrorState description={error} onRetry={reset} />;

  return null;
}
