import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude model tiering (cost control):
 *  - fast:    per-attempt feedback, high volume, latency-sensitive
 *  - default: most analysis & content generation
 *  - deep:    onboarding speech-profile generation (highest quality)
 *
 * NOTE: Opus 4.8 removes `temperature`/`top_p`/`budget_tokens`, do not set them.
 * Use adaptive thinking (`thinking: true`) for the heavy onboarding analysis.
 */
export const CLAUDE_MODELS = {
  fast: 'claude-haiku-4-5',
  default: 'claude-sonnet-4-6',
  deep: 'claude-opus-4-8',
} as const;

export type ClaudeTier = keyof typeof CLAUDE_MODELS;

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local.');
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

interface StructuredOptions {
  tier?: ClaudeTier;
  /** Stable instruction text, cached across calls via prompt caching. */
  system: string;
  /** Per-request user content. */
  user: string;
  /** JSON Schema the output is constrained to (guaranteed valid JSON back). */
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** Enable adaptive thinking (use for complex analysis). */
  thinking?: boolean;
}

/**
 * Ask Claude for JSON constrained to a schema (API-level structured outputs),
 * and return it parsed. The system prompt is sent as a cached block.
 */
export async function generateStructured<T>({
  tier = 'default',
  system,
  user,
  schema,
  maxTokens = 4096,
  thinking = false,
}: StructuredOptions): Promise<T> {
  const anthropic = getAnthropic();

  const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: CLAUDE_MODELS[tier],
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema } },
  };
  if (thinking) {
    params.thinking = { type: 'adaptive' };
  }

  const res = await anthropic.messages.create(params);
  const text = res.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim();

  if (!text) throw new Error('Claude returned an empty response.');
  try {
    return JSON.parse(text) as T;
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(cleaned) as T;
  }
}
