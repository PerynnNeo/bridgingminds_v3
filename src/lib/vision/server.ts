import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { VisualMetrics } from './types';

type Client = SupabaseClient<Database>;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Parse the client's visual-metrics payload (form field or JSON) into VisualMetrics. */
export function parseVisualMetrics(raw: unknown): VisualMetrics | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;
  const o = value as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : 0);
  return {
    eyeContactRatio: num(o.eyeContactRatio),
    faceVisibilityRatio: num(o.faceVisibilityRatio),
    framingScore: num(o.framingScore),
    headStabilityScore: num(o.headStabilityScore),
    expressionVariationScore: num(o.expressionVariationScore),
    mouthVisibilityScore: num(o.mouthVisibilityScore),
    lightingQualityScore: num(o.lightingQualityScore),
    deliveryPresenceScore: num(o.deliveryPresenceScore),
    sampleCount: typeof o.sampleCount === 'number' ? Math.max(0, Math.round(o.sampleCount)) : 0,
  };
}

/** Enough frames and a visible enough face for the metrics to be worth coaching on. */
export function hasEnoughVisualData(metrics: VisualMetrics): boolean {
  return metrics.sampleCount >= 5 && metrics.faceVisibilityRatio >= 0.25;
}

/** Average several clips' metrics into one baseline (sampleCount is summed). */
export function averageMetrics(list: VisualMetrics[]): VisualMetrics | null {
  if (list.length === 0) return null;
  const mean = (key: keyof VisualMetrics) =>
    list.reduce((sum, m) => sum + (m[key] as number), 0) / list.length;
  return {
    eyeContactRatio: mean('eyeContactRatio'),
    faceVisibilityRatio: mean('faceVisibilityRatio'),
    framingScore: mean('framingScore'),
    headStabilityScore: mean('headStabilityScore'),
    expressionVariationScore: mean('expressionVariationScore'),
    mouthVisibilityScore: mean('mouthVisibilityScore'),
    lightingQualityScore: mean('lightingQualityScore'),
    deliveryPresenceScore: mean('deliveryPresenceScore'),
    sampleCount: list.reduce((sum, m) => sum + m.sampleCount, 0),
  };
}

/** Persist one clip's visual metrics for dashboard aggregation. Best-effort, never throws. */
export async function saveVisualAnalysis(
  supabase: Client,
  input: {
    userId: string;
    activityType: string;
    activityId?: string | null;
    metrics: VisualMetrics;
    feedbackSummary?: string;
  },
): Promise<void> {
  try {
    await supabase.from('visual_analysis_results').insert({
      user_id: input.userId,
      activity_type: input.activityType,
      activity_id: input.activityId ?? null,
      eye_contact_ratio: input.metrics.eyeContactRatio,
      face_visibility_ratio: input.metrics.faceVisibilityRatio,
      framing_score: input.metrics.framingScore,
      head_stability_score: input.metrics.headStabilityScore,
      expression_variation_score: input.metrics.expressionVariationScore,
      mouth_visibility_score: input.metrics.mouthVisibilityScore,
      lighting_quality_score: input.metrics.lightingQualityScore,
      delivery_presence_score: input.metrics.deliveryPresenceScore,
      feedback_summary: input.feedbackSummary ?? null,
    });
  } catch {
    // Persisting visual metrics must never block the user's feedback response.
  }
}
