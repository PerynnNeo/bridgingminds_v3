/**
 * Usage limiting rules for the MVP (spec §9.2).
 * The backend must check these before calling paid AI APIs and show a friendly
 * message when a user is over their limit.
 */
export const USAGE_LIMITS = {
  /** 1 completed onboarding per user, with an optional retake. */
  onboarding: { completedPerUser: 1, allowRetake: true },
  /** Practice attempts per day. */
  practiceAttemptsPerDay: 20,
  /** Debate game sessions per day. */
  debateSessionsPerDay: 5,
  /** Daily spin-the-wheel question: 1 main question + 2 retries. */
  dailyQuestion: { mainPerDay: 1, retries: 2 },
} as const;

/** Friendly over-limit copy (kept supportive per the spec's tone guidelines §1.4). */
export const OVER_LIMIT_MESSAGE =
  "You've completed a lot of practice today. Come back tomorrow to continue your streak.";
