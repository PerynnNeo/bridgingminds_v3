/**
 * Provider-agnostic AI layer for BridgingMinds (server-side only).
 *
 *   transcribe → AssemblyAI   (speech-to-text, filler/disfluency detection)
 *   analyze    → Claude Opus   (onboarding speech profile + practice plan, adaptive thinking)
 *   feedback   → Claude Haiku  (per-attempt coaching)
 *
 * Text-to-speech runs in the browser, see `@/lib/tts`.
 * Swapping a provider means changing one file here; callers stay the same.
 */
export * from './types';
export { CLAUDE_MODELS, generateStructured, getAnthropic, type ClaudeTier } from './anthropic';
export { transcribeAudio, computeMetrics, type AudioInput } from './transcribe';
export { generateOnboardingAnalysis, type OnboardingInput } from './analyze';
export { generateAttemptFeedback, type FeedbackInput } from './feedback';
