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
    headStabilityScore: num(o.headStabilityScore),
    expressionVariationScore: num(o.expressionVariationScore),
    mouthVisibilityScore: num(o.mouthVisibilityScore),
    lightingQualityScore: num(o.lightingQualityScore),
    gestureScore: num(o.gestureScore),
    handVisibleRatio: num(o.handVisibleRatio),
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
    headStabilityScore: mean('headStabilityScore'),
    expressionVariationScore: mean('expressionVariationScore'),
    mouthVisibilityScore: mean('mouthVisibilityScore'),
    lightingQualityScore: mean('lightingQualityScore'),
    gestureScore: mean('gestureScore'),
    handVisibleRatio: mean('handVisibleRatio'),
    deliveryPresenceScore: mean('deliveryPresenceScore'),
    sampleCount: list.reduce((sum, m) => sum + m.sampleCount, 0),
  };
}

export interface VisualSummary {
  /** Recent average eye-contact ratio 0..1. */
  eyeContact: number;
  /** Recent average expression variation 0..1. */
  expression: number;
  /** Recent average overall delivery presence 0..1. */
  presence: number;
  /** One friendly, rule-based next action based on the weakest area. */
  focusNudge: string;
  /** How many recent clips this is based on. */
  clips: number;
}

/** Aggregate the user's recent visual-delivery clips for the dashboard (null if none). */
export async function getVisualSummary(supabase: Client, userId: string): Promise<VisualSummary | null> {
  const { data } = await supabase
    .from('visual_analysis_results')
    .select('eye_contact_ratio, expression_variation_score, delivery_presence_score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const mean = (vals: (number | null)[]) => {
    const nums = vals.filter((n): n is number => n != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  };
  const eyeContact = mean(rows.map((r) => r.eye_contact_ratio));
  const expression = mean(rows.map((r) => r.expression_variation_score));
  const presence = mean(rows.map((r) => r.delivery_presence_score));

  const lowest = Math.min(eyeContact, expression, presence);
  let focusNudge = 'Keep practising with the camera on to build your on-screen presence.';
  if (lowest === eyeContact) {
    focusNudge = 'Your eye contact dips at times. Try looking at the camera before your key points.';
  } else if (lowest === expression) {
    focusNudge = 'Your expression can stay flat. Add a little warmth when it fits the message.';
  }

  return { eyeContact, expression, presence, focusNudge, clips: rows.length };
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
      head_stability_score: input.metrics.headStabilityScore,
      expression_variation_score: input.metrics.expressionVariationScore,
      mouth_visibility_score: input.metrics.mouthVisibilityScore,
      lighting_quality_score: input.metrics.lightingQualityScore,
      gesture_balance_score: input.metrics.gestureScore,
      delivery_presence_score: input.metrics.deliveryPresenceScore,
      feedback_summary: input.feedbackSummary ?? null,
    });
  } catch {
    // Persisting visual metrics must never block the user's feedback response.
  }
}
