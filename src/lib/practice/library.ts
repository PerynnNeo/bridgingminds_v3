/**
 * Practice content library.
 *
 * Pronunciation is personalised (the user's tricky words from onboarding, topped
 * up from the fallback list). The phrase / pitch / quick-thinking categories are
 * a curated teaching library, genuinely useful, frequently-used phrases and
 * leading questions, each with a short coaching hint so the user learns the
 * pattern, not just records a prompt.
 */

export type PracticeCategorySlug = 'pronunciation' | 'presentation' | 'pitch' | 'thinking';
export type CategoryIcon = 'pronunciation' | 'presentation' | 'pitch' | 'thinking';

export interface PracticeTarget {
  /** DB practice_items id, present only for personalised items. */
  dbId?: string;
  text: string;
  targetSkill: string;
  /** Short coaching note that teaches how/when to use the phrase. */
  hint?: string;
}

export interface PracticeCategoryDef {
  slug: PracticeCategorySlug;
  title: string;
  short: string;
  blurb: string;
  icon: CategoryIcon;
  /** Show the Listen (model pronunciation) button? Only useful for words. */
  listen: boolean;
  /** Pull the user's personalised items for this category? */
  personalized: boolean;
  targetSkill: string;
}

export const PRACTICE_CATEGORIES: PracticeCategoryDef[] = [
  {
    slug: 'pronunciation',
    title: 'Pronunciation words',
    short: 'Tricky words, said clearly',
    blurb: 'Words worth practising out loud. Tap Listen to hear it, then record yourself.',
    icon: 'pronunciation',
    listen: true,
    personalized: true,
    targetSkill: 'pronunciation',
  },
  {
    slug: 'presentation',
    title: 'Presentation phrases',
    short: 'Open, signpost & close with confidence',
    blurb: 'Reusable phrases that give any talk a clear shape. Learn one, then say it smoothly.',
    icon: 'presentation',
    listen: false,
    personalized: false,
    targetSkill: 'clarity',
  },
  {
    slug: 'pitch',
    title: 'Pitch & interview',
    short: 'Phrases that sell your ideas & you',
    blurb: 'Go-to lines for pitches and interviews. Say them until they feel natural.',
    icon: 'pitch',
    listen: false,
    personalized: false,
    targetSkill: 'tone',
  },
  {
    slug: 'thinking',
    title: 'Quick thinking',
    short: 'Answer on the spot, with structure',
    blurb: 'Leading questions to practise speaking off the cuff. Plan a few seconds, then answer.',
    icon: 'thinking',
    listen: false,
    personalized: false,
    targetSkill: 'fluency',
  },
];

const LIBRARY: Record<PracticeCategorySlug, PracticeTarget[]> = {
  pronunciation: [],
  presentation: [
    { text: 'Today, I’d like to talk about…', targetSkill: 'clarity', hint: 'A calm, confident opener. Pause after “about” before your topic.' },
    { text: 'There are three main points I want to cover.', targetSkill: 'clarity', hint: 'Telling people the structure up front keeps them with you.' },
    { text: 'First… second… and finally…', targetSkill: 'pacing', hint: 'Signposting words help your audience follow along.' },
    { text: 'Let me give you an example.', targetSkill: 'clarity', hint: 'Examples make an idea stick far better than claims.' },
    { text: 'This brings me to my next point.', targetSkill: 'fluency', hint: 'A smooth bridge between ideas, no awkward gap.' },
    { text: 'To sum up, the key takeaway is…', targetSkill: 'clarity', hint: 'Signal your conclusion so it lands.' },
    { text: 'Thank you for listening, I’m happy to take any questions.', targetSkill: 'tone', hint: 'A warm, professional close.' },
  ],
  pitch: [
    { text: 'I’m really excited about this opportunity because…', targetSkill: 'tone', hint: 'Lead with genuine enthusiasm.' },
    { text: 'One of my key strengths is…', targetSkill: 'clarity', hint: 'Pick one strength and back it with proof.' },
    { text: 'A good example of that is when I…', targetSkill: 'fluency', hint: 'A short story is more memorable than a list.' },
    { text: 'The problem we’re solving is…', targetSkill: 'clarity', hint: 'Start a pitch with the problem, not the product.' },
    { text: 'What makes our idea different is…', targetSkill: 'tone', hint: 'Name your one clear advantage.' },
    { text: 'In one sentence, our idea is…', targetSkill: 'clarity', hint: 'If you can’t say it simply, simplify it.' },
    { text: 'Thank you for your time and for considering me.', targetSkill: 'tone', hint: 'End with warmth and confidence.' },
  ],
  thinking: [
    { text: 'Describe your perfect weekend.', targetSkill: 'fluency', hint: 'Plan 5 seconds: pick 2–3 things, then add why.' },
    { text: 'If you could change one thing about your school, what would it be?', targetSkill: 'fluency', hint: 'Opinion → reason → example.' },
    { text: 'Convince me to visit your hometown.', targetSkill: 'tone', hint: 'Give two specific reasons, not general ones.' },
    { text: 'Tell me about a skill you’d love to learn, and why.', targetSkill: 'fluency', hint: 'Name it, then your motivation.' },
    { text: 'What makes someone a good friend?', targetSkill: 'clarity', hint: 'Give one quality and a quick example.' },
    { text: 'If you could invent one gadget, what would it do?', targetSkill: 'fluency', hint: 'Describe the problem it solves.' },
    { text: 'Describe your favourite meal so I can almost taste it.', targetSkill: 'clarity', hint: 'Use the senses: smell, taste, texture.' },
  ],
};

/** Common tricky words, used to top up the personalised pronunciation list. */
export const PRONUNCIATION_FALLBACK = [
  'particularly',
  'specifically',
  'comfortable',
  'thoroughly',
  'entrepreneur',
  'vulnerable',
  'literature',
  'February',
  'colleague',
  'rural',
];

export function getCategory(slug: string): PracticeCategoryDef | undefined {
  return PRACTICE_CATEGORIES.find((c) => c.slug === slug);
}

export function getLibraryItems(slug: PracticeCategorySlug): PracticeTarget[] {
  return LIBRARY[slug] ?? [];
}
