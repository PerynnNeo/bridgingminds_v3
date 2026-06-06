import 'server-only';
import { generateStructured } from './anthropic';
import type { SpeechMetrics } from './types';

/** Shared scored feedback for games (maps to game_sessions). */
export interface GameFeedback {
  clarityScore: number;
  pacingScore: number;
  structureScore: number;
  confidenceScore: number;
  /** Did the answer actually address the prompt with real, on-topic substance? */
  relevanceScore: number;
  /** What went well (1–2 warm sentences). */
  feedback: string;
  /** One concrete thing to improve. */
  tip: string;
}

const FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clarityScore: { type: 'number' },
    pacingScore: { type: 'number' },
    structureScore: { type: 'number' },
    confidenceScore: { type: 'number' },
    relevanceScore: { type: 'number' },
    feedback: { type: 'string' },
    tip: { type: 'string' },
  },
  required: [
    'clarityScore',
    'pacingScore',
    'structureScore',
    'confidenceScore',
    'relevanceScore',
    'feedback',
    'tip',
  ],
};

/** Feedback on a spontaneous spoken answer to a daily question. */
export async function generateDailyQuestionFeedback(input: {
  question: string;
  transcript: string;
  metrics: SpeechMetrics;
  fillerWordCount: number;
}): Promise<GameFeedback> {
  const system = `You are BridgingMinds, a friendly speech coach for youths.
A youth answered a spontaneous question out loud. Give warm, specific feedback on their DELIVERY and STRUCTURE
(not whether the answer is "right"). Scores 0 to 100, higher is better:
- structureScore: did they organise their answer (opinion → reason → example) or ramble?
- confidenceScore: steady, assured delivery.
- relevanceScore: did they actually answer the question with real, on-topic substance, or ramble, avoid it, or make little sense? This is about staying on topic, never whether their opinion is "correct". If they clearly made things up or did not address the question, score this low and gently say so in the tip.
"feedback" = what went well. "tip" = one concrete improvement. Encouraging, never clinical. Never use em dashes or en dashes; use commas or periods instead.`;
  return generateStructured<GameFeedback>({
    tier: 'fast',
    system,
    user: JSON.stringify(input, null, 2),
    schema: FEEDBACK_SCHEMA,
    maxTokens: 600,
  });
}

/** The AI debate opponent's counterpoint (read aloud to the user). */
export async function generateDebateCounterpoint(input: {
  topic: string;
  userSide: 'agree' | 'disagree';
  argumentTranscript: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<{ counterpoint: string }> {
  const system = `You are a friendly debate opponent for a youth practising debating.
The motion is provided, plus the user's side and what they argued. Reply with a SHORT, clear counter-argument
from the OPPOSITE side, 2 to 3 sentences, conversational and encouraging (not aggressive or mean). Make one or two
solid points they'll want to respond to. This will be read aloud, so keep it natural and easy to follow.
Match the "difficulty": easy = gentle, simple points a beginner can answer; medium = balanced and fair; hard =
sharper, stronger points that really test them.
Never use em dashes or en dashes; use commas or periods instead.`;
  return generateStructured<{ counterpoint: string }>({
    tier: 'fast',
    system,
    user: JSON.stringify(input, null, 2),
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { counterpoint: { type: 'string' } },
      required: ['counterpoint'],
    },
    maxTokens: 400,
  });
}

/** Feedback on the user's full debate (argument + rebuttal vs the AI). */
export async function generateDebateFeedback(input: {
  topic: string;
  userSide: 'agree' | 'disagree';
  argumentTranscript: string;
  counterpoint: string;
  rebuttalTranscript: string;
  metrics: SpeechMetrics;
}): Promise<GameFeedback> {
  const system = `You are BridgingMinds, a friendly debate coach for youths.
Judge the user's debate DELIVERY and ARGUMENT (clarity, structure, pacing, confidence, strength of points) across
their opening argument and their rebuttal to the opponent. Scores 0 to 100, higher is better.
- relevanceScore: did their argument actually address the motion with real substance, or drift off-topic or waffle? Never judge whether their side is "right".
"feedback" = what they did well (mention argument strength). "tip" = one concrete improvement (e.g. structure with
"firstly, secondly, finally"). Encouraging, never clinical. Never use em dashes or en dashes; use commas or periods instead.`;
  return generateStructured<GameFeedback>({
    tier: 'fast',
    system,
    user: JSON.stringify(input, null, 2),
    schema: FEEDBACK_SCHEMA,
    maxTokens: 700,
  });
}

export interface FriendDebateResult {
  /** Helpful comparison of the two players (who was clearer, fewer fillers, etc.). */
  comparison: string;
  player1Tip: string;
  player2Tip: string;
}

/** Comparative feedback for two players debating on the same device. */
export async function generateFriendDebateFeedback(input: {
  topic: string;
  player1Transcript: string;
  player2Transcript: string;
}): Promise<FriendDebateResult> {
  const system = `You are BridgingMinds, a friendly debate coach for youths.
Two players debated the motion on the same device. Compare them HELPFULLY, the goal is for both to improve, not
just to crown a winner. Note who had clearer structure, who used fewer filler words, and who sounded steadier, then
give EACH player one concrete tip. Warm and balanced, never harsh.
Never use em dashes or en dashes; use commas or periods instead.`;
  return generateStructured<FriendDebateResult>({
    tier: 'fast',
    system,
    user: JSON.stringify(input, null, 2),
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        comparison: { type: 'string' },
        player1Tip: { type: 'string' },
        player2Tip: { type: 'string' },
      },
      required: ['comparison', 'player1Tip', 'player2Tip'],
    },
    maxTokens: 600,
  });
}
