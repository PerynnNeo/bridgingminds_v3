/**
 * Shared speech-domain types for the AI layer.
 * Field names mirror the DB schema (§5.2) in camelCase; mapping to snake_case
 * happens at the database boundary.
 */

export interface WordTiming {
  text: string;
  /** seconds from start */
  start: number;
  /** seconds from start */
  end: number;
  confidence?: number;
}

export interface TranscriptionResult {
  text: string;
  words: WordTiming[];
  durationSec: number;
  /** Disfluencies / filler tokens detected (e.g. "um", "uh"). */
  fillerWords: { text: string; count: number }[];
  fillerWordCount: number;
  /** Mean word confidence 0–1. */
  confidence: number;
}

/** Objective metrics computed from a transcription (no AI needed). */
export interface SpeechMetrics {
  wordsPerMinute: number;
  /** filler words per 100 spoken words */
  fillerWordRate: number;
  /** pauses longer than ~0.7s between words */
  longPauseCount: number;
  totalWords: number;
  durationSec: number;
}

/** AI-generated speaking profile (maps to `speech_profiles`). */
export interface SpeechProfile {
  pacingScore: number;
  clarityScore: number;
  fluencyScore: number;
  fillerWordRate: number;
  pausePatternSummary: string;
  commonMispronunciations: string[];
  confidenceCues: string[];
  strengths: string[];
  focusAreas: string[];
  generatedSummary: string;
  /** How faithfully the onboarding passage was read (0..100, deterministic). */
  readingAccuracy?: number;
  /** Whether the spontaneous answer stayed on topic and made sense (0..100, AI). */
  onTopicScore?: number;
}

/** AI feedback for a single practice attempt (maps to `practice_attempts`). */
export interface AttemptFeedback {
  clarityScore: number;
  pacingScore: number;
  pronunciationScore: number;
  fillerWordCount: number;
  /** On-topic substance for open-ended prompts (quick thinking). Absent for words/phrases. */
  relevanceScore?: number;
  /** Supportive, specific feedback (1–2 sentences). */
  feedback: string;
  /** One concrete improvement tip. */
  tip: string;
  /** Specific words or sounds that were mispronounced. */
  mispronunciations: string[];
  /** Natural phrases they said well that are worth practicing. */
  usefulPhrases: string[];
  /** Complementary phrases they should practice. */
  suggestedPhrases: string[];
}

/** A single generated practice item (maps to `practice_items`). */
export interface PracticeItemResult {
  itemType: 'word' | 'phrase' | 'pitch' | 'presentation';
  text: string;
  targetSkill: 'pronunciation' | 'pacing' | 'fluency' | 'tone' | 'clarity';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/** A generated practice plan with its items (maps to `practice_plans` + `practice_items`). */
export interface PracticePlanResult {
  planTitle: string;
  planSummary: string;
  focusArea: 'pacing' | 'pronunciation' | 'fluency' | 'confidence' | 'filler_words';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  items: PracticeItemResult[];
}

/** Combined onboarding result: the speech profile + first personalised plan. */
export interface OnboardingAnalysis {
  profile: SpeechProfile;
  plan: PracticePlanResult;
}
