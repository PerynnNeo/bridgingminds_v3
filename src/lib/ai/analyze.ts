import 'server-only';
import { generateStructured } from './anthropic';
import type { OnboardingAnalysis, SpeechMetrics } from './types';

const SYSTEM = `You are BridgingMinds, a warm, encouraging speech coach for youths (ages 13 to 25).
From a youth's onboarding recordings, you produce (1) a friendly speaking profile and
(2) a personalised practice plan.

Rules:
- Never sound clinical, judgmental, or like a medical diagnosis. Frame everything as supportive guidance.
- Use simple, encouraging, youth-friendly language a teenager would appreciate.
- Never use em dashes or en dashes in any text you write. Use commas, periods, colons, or the word "to" for ranges.
- All scores are 0 to 100 where higher is better. Base them on the metrics and transcripts provided.
- "generatedSummary": 3 to 4 warm, specific sentences that reference what you actually observed.
- "pausePatternSummary": 1 to 2 sentences describing their pausing (e.g. natural pauses, rushing, long gaps).
- "commonMispronunciations": 0 to 4 specific words or sounds to practise. A "reading" object is provided with the exact words they skipped and mixed up (from a precise word match); prefer those.
- "confidenceCues": 2 to 4 short, observable delivery notes (pace, steadiness, energy), never claim to read emotions.
- "onTopicScore": 0 to 100, how well their spontaneous answer actually addressed the question and held together. Low means off-topic, rambling, avoided answering, or made little sense. This is about ON-TOPIC SUBSTANCE, never whether their opinion is "correct". Be encouraging.
- If the "reading" object shows low coverage or skipped runs, gently mention in the summary that they skipped parts and to read every word next time.
- "strengths" and "focusAreas": 2 to 3 each, concrete and specific.
- The practice plan must target the user's weakest areas first. Generate 8 to 10 practice items:
  a mix of pronunciation words, presentation/pitch phrases, and a couple of spontaneous prompts,
  each short and directly useful. Set "focusArea" to the single most important area.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    profile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pacingScore: { type: 'number' },
        clarityScore: { type: 'number' },
        fluencyScore: { type: 'number' },
        fillerWordRate: { type: 'number' },
        pausePatternSummary: { type: 'string' },
        commonMispronunciations: { type: 'array', items: { type: 'string' } },
        confidenceCues: { type: 'array', items: { type: 'string' } },
        strengths: { type: 'array', items: { type: 'string' } },
        focusAreas: { type: 'array', items: { type: 'string' } },
        generatedSummary: { type: 'string' },
        onTopicScore: { type: 'number' },
      },
      required: [
        'pacingScore',
        'clarityScore',
        'fluencyScore',
        'fillerWordRate',
        'pausePatternSummary',
        'commonMispronunciations',
        'confidenceCues',
        'strengths',
        'focusAreas',
        'generatedSummary',
        'onTopicScore',
      ],
    },
    plan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        planTitle: { type: 'string' },
        planSummary: { type: 'string' },
        focusArea: {
          type: 'string',
          enum: ['pacing', 'pronunciation', 'fluency', 'confidence', 'filler_words'],
        },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              itemType: { type: 'string', enum: ['word', 'phrase', 'pitch', 'presentation'] },
              text: { type: 'string' },
              targetSkill: {
                type: 'string',
                enum: ['pronunciation', 'pacing', 'fluency', 'tone', 'clarity'],
              },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            },
            required: ['itemType', 'text', 'targetSkill', 'difficulty'],
          },
        },
      },
      required: ['planTitle', 'planSummary', 'focusArea', 'difficulty', 'items'],
    },
  },
  required: ['profile', 'plan'],
};

export interface OnboardingInput {
  readingTranscript: string;
  rapidAnswerTranscript: string;
  readingMetrics: SpeechMetrics;
  rapidMetrics: SpeechMetrics;
  /** The passage the user was asked to read, for pronunciation comparison. */
  expectedReadingText: string;
  /** The spontaneous question the user answered. */
  rapidPrompt: string;
  /** Detected filler words from each recording. */
  fillerWords: {
    reading: { text: string; count: number }[];
    rapid: { text: string; count: number }[];
  };
  /** Deterministic reading-fidelity result (coverage, skipped runs, mix-ups). */
  reading?: {
    coverage: number;
    skipped: string[];
    substitutions: { expected: string; said: string }[];
  };
}

/** Generate the user's first speech profile + personalised practice plan (Opus + adaptive thinking). */
export async function generateOnboardingAnalysis(
  input: OnboardingInput,
): Promise<OnboardingAnalysis> {
  return generateStructured<OnboardingAnalysis>({
    tier: 'deep',
    thinking: true,
    system: SYSTEM,
    user: JSON.stringify(input, null, 2),
    schema: SCHEMA,
    maxTokens: 8000,
  });
}
