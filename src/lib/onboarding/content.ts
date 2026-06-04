/** Onboarding reading passage (~45–60s), mixes common pronunciation patterns,
 *  presentation-style phrases, and natural sentence flow (UX doc §2, Step 2). */
export const READING_PASSAGE = `Good morning, everyone. Thank you for giving me a few minutes of your time today. I would like to share three simple ideas about speaking with confidence. First, clear speech begins with a steady pace, when we slow down just a little, our words become easier to follow. Second, the way we breathe shapes the way we sound, so a calm breath before a sentence can make a real difference. Third, practice matters more than perfection. Everyone stumbles sometimes, and that is perfectly normal. The truth is, strong communication is a skill anyone can build, one small step at a time. So let's begin, and remember to enjoy the process.`;

/** Spontaneous questions (UX doc §2, Step 3). One is chosen at random per session. */
export const RAPID_QUESTIONS = [
  'Tell us about something you enjoy doing.',
  'Why do you think teamwork is important?',
  'Describe a time you felt proud of yourself.',
  'What would you do if you had to present tomorrow?',
  'If you could invent one app, what would it do?',
  'What is one thing you would like to get better at?',
] as const;

/** Thinking time before the spontaneous answer (UX doc §2, Step 3). */
export const THINKING_SECONDS = 10;

/** Soft minimum recording length so there's enough audio to analyse. */
export const MIN_READING_SECONDS = 12;
export const MIN_RAPID_SECONDS = 6;
