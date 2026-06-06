'use client';

import { useState } from 'react';
import { Check, X, Loader2, Camera } from 'lucide-react';
import { CameraPreview } from '@/components/vision/camera-preview';
import { useVisionAnalyzer } from '@/lib/hooks/use-vision-analyzer';
import type { VisualMetrics } from '@/lib/vision/types';
import { cn } from '@/lib/utils';

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        ok ? 'bg-success/15 text-success' : 'bg-charcoal/10 text-charcoal/50',
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-charcoal/70">{label}</span>
        <span className="font-semibold tabular-nums text-charcoal">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary-50">
        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CameraCheckPage() {
  const analyzer = useVisionAnalyzer();
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [sampling, setSampling] = useState(false);
  const [metrics, setMetrics] = useState<VisualMetrics | null>(null);

  function start() {
    setMetrics(null);
    analyzer.startSampling();
    setSampling(true);
  }
  function stop() {
    analyzer.stopSampling();
    setMetrics(analyzer.finalize());
    setSampling(false);
  }

  const { readiness } = analyzer;

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header>
          <h1 className="text-2xl font-bold text-charcoal">Camera check</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            On-device diagnostic for visual delivery analysis. Nothing is uploaded, all of this
            runs in your browser. Thresholds are estimates we may still tune.
          </p>
        </header>

        {unavailable ? (
          <div className="rounded-2xl bg-white p-5 text-sm text-charcoal/70 shadow-card">
            Camera is unavailable ({unavailable}). On a real phone, allow camera access and reload.
            In the full app this falls back to audio-only practice.
          </div>
        ) : (
          <>
            <CameraPreview
              className="aspect-[3/4] w-full"
              onVideoReady={(v) => {
                analyzer.attach(v);
              }}
              onUnavailable={(r) => setUnavailable(r)}
            />

            <div className="flex flex-wrap gap-2">
              <Chip
                ok={analyzer.ready}
                label={analyzer.ready ? 'Model ready' : 'Loading model'}
              />
              <Chip ok={readiness.faceVisible} label="Face visible" />
              <Chip ok={readiness.centered} label="Centered" />
              <Chip ok={readiness.lightingOk} label="Lighting" />
            </div>

            {analyzer.loadError && (
              <p className="text-sm text-danger">{analyzer.loadError}</p>
            )}

            <button
              type="button"
              onClick={sampling ? stop : start}
              disabled={!analyzer.ready}
              className={cn(
                'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-medium text-white shadow-soft transition-colors disabled:opacity-50',
                sampling ? 'bg-danger' : 'bg-primary-500 hover:bg-primary-600',
              )}
            >
              {sampling ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Speak for a few seconds, then stop
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Start a sample
                </>
              )}
            </button>

            {metrics && (
              <div className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
                <p className="text-sm font-semibold text-charcoal">
                  Results ({metrics.sampleCount} frames)
                </p>
                <Bar label="Eye contact" value={metrics.eyeContactRatio} />
                <Bar label="Face visibility" value={metrics.faceVisibilityRatio} />
                <Bar label="Framing" value={metrics.framingScore} />
                <Bar label="Head stability" value={metrics.headStabilityScore} />
                <Bar label="Expression variation" value={metrics.expressionVariationScore} />
                <Bar label="Mouth visibility" value={metrics.mouthVisibilityScore} />
                <Bar label="Lighting quality" value={metrics.lightingQualityScore} />
                <div className="border-t border-charcoal/10 pt-3">
                  <Bar label="Delivery presence" value={metrics.deliveryPresenceScore} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
