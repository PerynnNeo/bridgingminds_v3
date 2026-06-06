import 'server-only';
import { generateStructured } from './anthropic';
import type { AttemptFeedback, SpeechMetrics } from './types';

const SYSTEM = `You are BridgingMinds, a friendly speech coach for youths.
Give short, supportive, specific feedback on a single practice attempt.

Rules:
- Encouraging and non-judgmental; never clinical.
- Never use em dashes or en dashes; use commas or periods instead.
- All scores are 0 to 100, higher is better.
- If the target is a word or phrase to repeat, judge how clearly and naturally they said it.
- If the target is a question or prompt, judge how clearly and confidently they ANSWERED, do not expect them to repeat the question.
- If "assessRelevance" is true, also set "relevanceScore" (0 to 100): did they actually answer the prompt with real, on-topic substance, or ramble, avoid it, or make little sense? About staying on topic, never whether their opinion is "correct". Only include relevanceScore when assessRelevance is true.
- "feedback" is 1 to 2 warm sentences referencing what they did.
- "tip" is ONE concrete, doable improvement for next time.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clarityScore: { type: 'number' },
    pacingScore: { type: 'number' },
    pronunciationScore: { type: 'number' },
    fillerWordCount: { type: 'integer' },
    relevanceScore: { type: 'number' },
    feedback: { type: 'string' },
    tip: { type: 'string' },
  },
  required: [
    'clarityScore',
    'pacingScore',
    'pronunciationScore',
    'fillerWordCount',
    'feedback',
    'tip',
  ],
};

export interface FeedbackInput {
  targetText: string;
  transcript: string;
  metrics: SpeechMetrics;
  fillerWordCount: number;
  /** e.g. "pronunciation", "pacing", "fluency". */
  targetSkill?: string;
  /** Set for open-ended prompts (quick thinking) to also score on-topic relevance. */
  assessRelevance?: boolean;
}

/** Score and give feedback on one practice attempt (Haiku, fast & cheap). */
export async function generateAttemptFeedback(input: FeedbackInput): Promise<AttemptFeedback> {
  return generateStructured<AttemptFeedback>({
    tier: 'fast',
    system: SYSTEM,
    user: JSON.stringify(input, null, 2),
    schema: SCHEMA,
    maxTokens: 800,
  });
}
