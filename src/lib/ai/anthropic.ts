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

/**
 * If the primary model keeps returning server errors, retry once on this
 * faster, broadly available model so a transient Anthropic outage never
 * hard-fails the request. (Skipped when it is already the primary.)
 */
const FALLBACK_MODEL: string = 'claude-sonnet-4-6';

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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A transient, worth-retrying failure: a dropped connection, overload, rate limit, or any 5xx. */
function isTransient(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  const status = (err as { status?: number } | null)?.status;
  return (
    typeof status === 'number' &&
    (status === 408 || status === 409 || status === 429 || status >= 500)
  );
}

/**
 * Ask Claude for JSON constrained to a schema (API-level structured outputs),
 * and return it parsed. The system prompt is sent as a cached block.
 *
 * The call is streamed (robust against long, adaptive-thinking generations and
 * request timeouts), retried once on a transient server error, then retried on
 * a fallback model so a single upstream hiccup never fails the whole request.
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
  const primary = CLAUDE_MODELS[tier];

  // One streamed attempt against a given model. Returns the joined text output.
  async function run(model: string): Promise<string> {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema } },
      ...(thinking ? { thinking: { type: 'adaptive' as const } } : {}),
    });
    const message = await stream.finalMessage();
    return message.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
  }

  // Primary twice (transient 500s usually clear), then the fallback model once.
  const attempts =
    FALLBACK_MODEL !== primary ? [primary, primary, FALLBACK_MODEL] : [primary, primary];

  let text = '';
  for (let i = 0; i < attempts.length; i++) {
    try {
      text = await run(attempts[i]);
      break;
    } catch (err) {
      const lastAttempt = i === attempts.length - 1;
      // Only retry/fall back on transient failures; surface real errors immediately.
      if (lastAttempt || !isTransient(err)) throw err;
      const status = (err as { status?: number } | null)?.status ?? 'conn';
      console.warn(`[ai] ${attempts[i]} attempt ${i + 1} failed (${status}), retrying`);
      await sleep(500 * (i + 1));
    }
  }

  if (!text) throw new Error('Claude returned an empty response.');
  try {
    return JSON.parse(text) as T;
  } catch {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(cleaned) as T;
  }
}
