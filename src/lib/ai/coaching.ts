import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateStructured } from './anthropic';
import type { Database, Json, SpeechProfileRow } from '@/types/database';

export interface CoachingTip {
  label: string;
  text: string;
}

export interface ItemCoaching {
  itemGoal: string;
  tips: CoachingTip[];
  /** Pronunciation only: the word split into syllables (lowercase). */
  syllables: string[];
  /** Pronunciation only: the one syllable to stress (UPPERCASE). */
  stress: string;
}

/** Category-specific coaching structure (spec: each type uses a different format). */
const LABELS: Record<string, string[]> = {
  pronunciation: ['Break it down', 'Stress', 'Sound tip', 'For you', 'Try this'],
  presentation: ['Purpose', 'Pause here', 'Emphasise', 'Continue with', 'Natural flow', 'For you', 'Pro tip'],
  pitch: ['Situation', 'Structure', 'What comes next', 'Tone', 'Natural flow', 'For you', 'Upgrade it'],
  thinking: ['Plan first', 'Structure', 'For you', 'Example starter', 'Pro tip'],
};

const SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    itemGoal: { type: 'string' },
    tips: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { label: { type: 'string' }, text: { type: 'string' } },
        required: ['label', 'text'],
      },
    },
    syllables: { type: 'array', items: { type: 'string' } },
    stress: { type: 'string' },
  },
  required: ['itemGoal', 'tips', 'syllables', 'stress'],
};

const SYSTEM = `You are BridgingMinds, a warm personal speech coach for youths (13 to 25).
Given ONE practice item and the user's onboarding speech profile, write a short, specific
"How to nail this" coaching card that PREPARES them before they record.

Hard rules:
- Be specific to THIS exact item, reference its actual words. Never write generic advice that could fit any item.
- Produce one tip for EACH label provided, in the given order, using that exact label.
- Exactly one tip uses the label "For you": personalise it from the user's profile (pacing, filler words, clarity, pronunciation, focus areas) AND tie it to THIS item (e.g. reference the first word or the tricky part). Do NOT write the bare sentence "Your pacing tends to speed up", make it about this item.
- For phrases and questions, teach NATURAL FLOW: what a confident speaker says next so they don't freeze.
- BE PUNCHY. Each tip is ONE crisp instruction of about 8 to 14 words, no filler, no over-explaining (youths skim). Only the "Continue with" / "Natural flow" / "Example starter" tip may add a brief quoted example.
- "itemGoal" is one short line (max ~12 words).
- If category is "pronunciation": fill "syllables" (the word split into syllables, all lowercase) and set "stress" to EXACTLY ONE of those syllables in UPPERCASE, e.g. syllables ["par","tic","u","lar","ly"], stress "TIC". Never put the whole word in "stress". Otherwise leave "syllables" empty and "stress" "".
- Encouraging, youth-friendly, never clinical.
- Punctuation: never use em dashes or en dashes anywhere in your text. Use commas, periods, colons, or the word "to" for ranges.

Return ONLY JSON matching the schema.`;

// In-memory cache (per server instance) keyed by category + item + profile signature.
const cache = new Map<string, ItemCoaching>();

function profileSummary(profile: SpeechProfileRow | null) {
  if (!profile) return null;
  const asArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    pacingScore: profile.pacing_score,
    clarityScore: profile.clarity_score,
    fluencyScore: profile.fluency_score,
    fillerWordRate: profile.filler_word_rate,
    focusAreas: profile.focus_areas ?? [],
    commonMispronunciations: asArray(profile.common_mispronunciations),
    confidenceCues: asArray(profile.confidence_cues),
  };
}

function signature(category: string, text: string, profile: SpeechProfileRow | null): string {
  const p = profile
    ? `${Math.round(profile.pacing_score ?? 0)}-${Math.round(profile.clarity_score ?? 0)}-${Math.round(
        profile.fluency_score ?? 0,
      )}-${Math.round(profile.filler_word_rate ?? 0)}-${(profile.focus_areas ?? []).join(',')}`
    : 'none';
  // Bump the version prefix whenever the prompt changes to invalidate old cache entries.
  return `v3|${category}|${text.toLowerCase().trim()}|${p}`;
}

export async function generateItemCoaching({
  category,
  text,
  profile,
  supabase,
}: {
  category: string;
  text: string;
  profile: SpeechProfileRow | null;
  /** Optional client for the durable (DB) cache that survives serverless cold starts. */
  supabase?: SupabaseClient<Database> | null;
}): Promise<ItemCoaching> {
  const key = signature(category, text, profile);

  // L1: in-process memo (fast path within a warm instance).
  const l1 = cache.get(key);
  if (l1) return l1;

  // L2: durable cache in Postgres (survives cold starts; shared across users).
  if (supabase) {
    try {
      const { data } = await supabase
        .from('coaching_cache')
        .select('payload')
        .eq('signature', key)
        .maybeSingle();
      if (data?.payload) {
        const payload = data.payload as unknown as ItemCoaching;
        cache.set(key, payload);
        return payload;
      }
    } catch {
      // Cache miss or unavailable, fall through to generation.
    }
  }

  const labels = LABELS[category] ?? LABELS.presentation;
  const result = await generateStructured<ItemCoaching>({
    tier: 'fast',
    system: SYSTEM,
    user: JSON.stringify({ category, item: text, labels, profile: profileSummary(profile) }, null, 2),
    schema: SCHEMA,
    maxTokens: 1000,
  });

  cache.set(key, result);
  if (supabase) {
    try {
      await supabase
        .from('coaching_cache')
        .upsert({ signature: key, payload: result as unknown as Json }, { onConflict: 'signature' });
    } catch {
      // Best-effort write, never block the response on a cache failure.
    }
  }
  return result;
}
