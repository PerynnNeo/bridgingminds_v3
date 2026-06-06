import 'server-only';
import { generateStructured } from './anthropic';
import type { VisualMetrics } from '@/lib/vision/types';

/**
 * Turns on-device visual delivery NUMBERS into supportive coaching text.
 * The model never sees the video, only the metrics, so it cannot comment on
 * appearance or guess emotions. Those guardrails are also enforced in the prompt.
 */
export interface VisualFeedbackResult {
  strength: string;
  improvement: string;
  retryInstruction: string;
  combinedTip: string;
}

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    strength: { type: 'string' },
    improvement: { type: 'string' },
    retryInstruction: { type: 'string' },
    combinedTip: { type: 'string' },
  },
  required: ['strength', 'improvement', 'retryInstruction', 'combinedTip'],
};

const SYSTEM = `You are BridgingMinds, a warm delivery coach for youths (13 to 25).
You are given VISUAL DELIVERY metrics measured on the user's own device from a short speaking clip. You did NOT see the video, you only have numbers. Turn them into short, supportive feedback about controllable presentation behaviours.

Hard safety rules (critical):
- NEVER claim to know the user's emotions, feelings, mood, or confidence. You cannot see emotions.
- NEVER comment on appearance, looks, attractiveness, face shape, or anything the user cannot control.
- Only discuss CONTROLLABLE delivery behaviours: looking near the camera, head steadiness, expression energy, lighting, mouth visibility, and hand gestures when the hands are visible. Do NOT grade framing or camera angle.
- Never be harsh. Everything is friendly, practical coaching.

How to read the scores (each 0 to 1):
- eyeContactRatio: share of time they appeared to look near the camera. Above 0.7 strong, 0.4 to 0.7 okay, below 0.4 a growth area.
- faceVisibilityRatio: how often the face was clearly in view. If below 0.6, the camera could not see them clearly, so keep feedback gentle and suggest being more visible to the camera.
- headStabilityScore: steadiness. Low means a lot of movement.
- gestureScore and handVisibleRatio: ONLY mention gestures if handVisibleRatio is above 0.3, otherwise the hands were not in view so do not mention gestures at all. gestureScore is hand-movement balance, low means stiff or distractingly busy, mid to high means natural supportive gestures.
- expressionVariationScore: how much the expression varied. Low reads flat, a little variation adds warmth, very high may read as fidgety.
- mouthVisibilityScore: mouth visible and facing the camera (matters for pronunciation).
- lightingQualityScore: lighting. Low means too dark or too bright.
- deliveryPresenceScore: overall blend.

For the given activity, return:
- "strength": one genuine thing the visuals show they did well.
- "improvement": one specific delivery cue to work on (pick the weakest meaningful metric).
- "retryInstruction": one concrete action for the next take, e.g. "Look at the camera as you say your opening sentence".
- "combinedTip": one sentence linking visual delivery with their speech for this activity.

If a "baseline" object is provided, it is the user's usual visual delivery from onboarding. You MAY note when this clip is clearly better or worse than their usual (in the strength or improvement), but keep it light and only mention it when the difference is meaningful.

Keep each field to about 8 to 18 words. Never cite the raw metric numbers (like 0.72 or percentages), describe them in plain words such as strong, improving, steady, or a little low. Encouraging, youth-friendly, never clinical. Do not join clauses with any dash (no em dash, en dash, or hyphen used as a dash); use a comma or a full stop instead. Return ONLY JSON.`;

export async function generateVisualFeedback(input: {
  /** onboarding | practice | debate | daily_question */
  activityType: string;
  /** The word / phrase / question / topic being practised. */
  context: string;
  metrics: VisualMetrics;
  /** Optional one-line summary of the speech feedback, to craft the combined tip. */
  speechSummary?: string;
  /** Optional onboarding baseline, for "compared to your usual" personalisation. */
  baseline?: VisualMetrics;
}): Promise<VisualFeedbackResult> {
  return generateStructured<VisualFeedbackResult>({
    tier: 'fast',
    system: SYSTEM,
    user: JSON.stringify(input, null, 2),
    schema: SCHEMA,
    maxTokens: 500,
  });
}

const BASELINE_SYSTEM = `You are BridgingMinds, a warm delivery coach for youths (13 to 25).
During onboarding the user gave two short clips (reading a passage, then answering a question). We measured VISUAL DELIVERY metrics on their device (numbers only, you did not see any video).
Write a short, encouraging baseline of how they present visually, in 2 to 3 sentences.

Same hard safety rules apply:
- Never claim to know emotions, mood, or confidence. Never mention appearance or anything they cannot control.
- Only describe controllable delivery: looking near the camera, steadiness, expression energy, lighting, and hand gestures when the hands are visible. Do not grade framing or camera angle.
- Read scores 0 to 1 (above 0.7 strong, 0.4 to 0.7 okay, below 0.4 a growth area). If faceVisibilityRatio is low, gently note the camera could not see them clearly. Only mention hand gestures if handVisibleRatio is above 0.3.

Mention one thing that looks good and the single biggest thing to work on. Never cite raw numbers, use plain words. Friendly and plain, not clinical. Do not join clauses with any dash (no em dash, en dash, or hyphen used as a dash); use a comma or a full stop. Return ONLY JSON with a "summary" string.`;

export async function generateVisualBaseline(input: {
  metrics: VisualMetrics;
  /** Optional one-line summary of their speech profile, for a cohesive baseline. */
  speechSummary?: string;
}): Promise<{ summary: string }> {
  return generateStructured<{ summary: string }>({
    tier: 'fast',
    system: BASELINE_SYSTEM,
    user: JSON.stringify(input, null, 2),
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { summary: { type: 'string' } },
      required: ['summary'],
    },
    maxTokens: 400,
  });
}
