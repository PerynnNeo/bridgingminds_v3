import { Sparkles, ArrowRight } from 'lucide-react';
import type { OnboardingAnalysis } from '@/lib/ai/types';
import type { VisualMetrics } from '@/lib/vision/types';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricBars } from '@/components/ui/metric-bars';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-charcoal/55">{label}</p>
      <p className="text-charcoal/80">{children}</p>
    </div>
  );
}

/** The speech-profile result screen, shared by onboarding and (later) the profile page. */
export function ProfileResultView({
  profile,
  plan,
  visual,
  onStart,
}: {
  profile: OnboardingAnalysis['profile'];
  plan: OnboardingAnalysis['plan'];
  visual?: { summary: string; metrics: VisualMetrics } | null;
  onStart?: () => void;
}) {
  const p = profile;
  return (
    <div className="space-y-5">
      <header className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-500 text-white">
          <Sparkles className="h-7 w-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold text-charcoal">Your speaking profile</h1>
      </header>

      <Card>
        <p className="text-sm leading-relaxed text-charcoal/80">{p.generatedSummary}</p>
      </Card>

      <Card>
        <CardTitle>Your speech at a glance</CardTitle>
        <MetricBars
          className="mt-3"
          bars={[
            { label: 'Clarity', value: p.clarityScore },
            { label: 'Pacing', value: p.pacingScore },
            { label: 'Fluency', value: p.fluencyScore },
          ]}
        />
      </Card>

      <Card>
        <CardTitle>What we noticed</CardTitle>
        <div className="mt-3 space-y-3 text-sm">
          <DetailRow label="Filler words">
            {p.fillerWordRate <= 0
              ? 'Barely any, nice!'
              : `About ${Math.round(p.fillerWordRate)} per 100 words`}
          </DetailRow>
          {p.pausePatternSummary && <DetailRow label="Pauses">{p.pausePatternSummary}</DetailRow>}
          {p.commonMispronunciations.length > 0 && (
            <div>
              <p className="text-charcoal/55">Sounds to practise</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.commonMispronunciations.map((w) => (
                  <span
                    key={w}
                    className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium text-charcoal/75"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
          {p.confidenceCues.length > 0 && (
            <div>
              <p className="text-charcoal/55">Delivery notes</p>
              <ul className="mt-1 space-y-1">
                {p.confidenceCues.map((c) => (
                  <li key={c} className="flex gap-2 text-charcoal/80">
                    <span className="text-info">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {visual && (
        <Card>
          <CardTitle>Visual delivery</CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{visual.summary}</p>
          <MetricBars
            className="mt-3"
            bars={[
              { label: 'Eye contact', value: visual.metrics.eyeContactRatio * 100 },
              { label: 'Framing', value: visual.metrics.framingScore * 100 },
              { label: 'Expression', value: visual.metrics.expressionVariationScore * 100 },
              { label: 'Presence', value: visual.metrics.deliveryPresenceScore * 100 },
            ]}
          />
        </Card>
      )}

      {p.strengths.length > 0 && (
        <Card>
          <CardTitle>Your strengths</CardTitle>
          <ul className="mt-2 space-y-1.5">
            {p.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-charcoal/75">
                <span className="text-primary-500">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {p.focusAreas.length > 0 && (
        <Card>
          <CardTitle>Your main focus areas</CardTitle>
          <ul className="mt-2 space-y-1.5">
            {p.focusAreas.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-charcoal/75">
                <span className="text-info">→</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="bg-primary-50">
        <CardTitle className="text-primary-700">{plan.planTitle}</CardTitle>
        <p className="mt-1 text-sm text-charcoal/70">{plan.planSummary}</p>
      </Card>

      {onStart && (
        <Button size="full" className="w-full" onClick={onStart}>
          Start my practice plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
