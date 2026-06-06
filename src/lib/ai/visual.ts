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
- Only discuss CONTROLLABLE delivery behaviours: looking near the camera, staying in frame, camera framing and angle, head steadiness, expression energy, lighting, mouth visibility.
- Never be harsh. Everything is friendly, practical coaching.

How to read the scores (each 0 to 1):
- eyeContactRatio: share of time they appeared to look near the camera. Above 0.7 strong, 0.4 to 0.7 okay, below 0.4 a growth area.
- faceVisibilityRatio: how often the face was clearly in frame. If below 0.6, say the app could not analyse clearly and keep feedback gentle and about framing.
- framingScore: how centered and well sized the face was. Low can mean too close, too far, or the phone held too low.
- headStabilityScore: steadiness. Low means a lot of movement.
- expressionVariationScore: how much the expression varied. Low reads flat, a little variation adds warmth, very high may read as fidgety.
- mouthVisibilityScore: mouth visible and facing the camera (matters for pronunciation).
- lightingQualityScore: lighting. Low means too dark or too bright.
- deliveryPresenceScore: overall blend.

For the given activity, return:
- "strength": one genuine thing the visuals show they did well.
- "improvement": one specific delivery cue to work on (pick the weakest meaningful metric).
- "retryInstruction": one concrete action for the next take, e.g. "Look at the camera as you say your opening sentence".
- "combinedTip": one sentence linking visual delivery with their speech for this activity.

Keep each field to about 8 to 18 words. Encouraging, youth-friendly, never clinical. Do not join clauses with any dash (no em dash, en dash, or hyphen used as a dash); use a comma or a full stop instead. Return ONLY JSON.`;

export async function generateVisualFeedback(input: {
  /** onboarding | practice | debate | daily_question */
  activityType: string;
  /** The word / phrase / question / topic being practised. */
  context: string;
  metrics: VisualMetrics;
  /** Optional one-line summary of the speech feedback, to craft the combined tip. */
  speechSummary?: string;
}): Promise<VisualFeedbackResult> {
  return generateStructured<VisualFeedbackResult>({
    tier: 'fast',
    system: SYSTEM,
    user: JSON.stringify(input, null, 2),
    schema: SCHEMA,
    maxTokens: 500,
  });
}
