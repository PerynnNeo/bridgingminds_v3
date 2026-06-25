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
 * If the primary model is slow or erroring, fall back to this faster, broadly
 * available model so a single hiccup neither fails nor stalls the request.
 * (Skipped when it is already the primary.)
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
  /** Hard cap on each model attempt, in ms. A call that runs longer is aborted. */
  timeoutMs?: number;
  /** Total wall-clock budget across all attempts, in ms. Stops retrying once spent. */
  budgetMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Marks an attempt we aborted ourselves because it exceeded its time budget. */
class AttemptTimeout extends Error {
  constructor() {
    super('Attempt exceeded its time budget');
    this.name = 'AttemptTimeout';
  }
}

/** A transient failure worth retrying or falling back on: our own timeout, a
 *  dropped connection, an overload, a rate limit, or any 5xx. */
function isTransient(err: unknown): boolean {
  if (err instanceof AttemptTimeout) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  const e = err as { status?: number; type?: string } | null;
  const status = e?.status;
  if (
    typeof status === 'number' &&
    (status === 408 || status === 409 || status === 429 || status >= 500)
  ) {
    return true;
  }
  // Streamed errors arrive over a 200 event-stream, so `status` is undefined.
  // Fall back to the error `type` the API reports inside the stream.
  const type = e?.type;
  return type === 'overloaded_error' || type === 'api_error' || type === 'rate_limit_error';
}

/**
 * Ask Claude for JSON constrained to a schema (API-level structured outputs),
 * and return it parsed. The system prompt is sent as a cached block.
 *
 * Each attempt is streamed and hard-bounded by an abort timeout; if it is slow
 * or hits a transient error, we fall back to a faster model. With `budgetMs` set
 * the whole call is kept under that wall-clock budget (used on latency-sensitive
 * paths like onboarding, where the serverless function timeout is tight).
 */
export async function generateStructured<T>({
  tier = 'default',
  system,
  user,
  schema,
  maxTokens = 4096,
  thinking = false,
  timeoutMs = 30000,
  budgetMs,
}: StructuredOptions): Promise<T> {
  const anthropic = getAnthropic();
  const primary = CLAUDE_MODELS[tier];
  const startedAt = Date.now();
  const remaining = () =>
    budgetMs == null ? Number.POSITIVE_INFINITY : Math.max(0, budgetMs - (Date.now() - startedAt));

  // One streamed attempt, aborted if it runs past `perAttemptMs`.
  async function run(model: string, perAttemptMs: number): Promise<string> {
    const controller = new AbortController();
    const stream = anthropic.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
        output_config: { format: { type: 'json_schema', schema } },
        ...(thinking ? { thinking: { type: 'adaptive' as const } } : {}),
      },
      { signal: controller.signal, maxRetries: 0 },
    );
    const final = stream.finalMessage();
    final.catch(() => {}); // swallow the post-abort rejection if the timeout wins the race
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AttemptTimeout());
      }, perAttemptMs);
    });
    try {
      const message = await Promise.race([final, timeout]);
      return message.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Budgeted (latency-sensitive) paths: primary once, then the faster fallback.
  // Otherwise favour resilience: primary twice, then the fallback.
  const attempts =
    budgetMs != null
      ? FALLBACK_MODEL !== primary
        ? [primary, FALLBACK_MODEL]
        : [primary]
      : FALLBACK_MODEL !== primary
        ? [primary, primary, FALLBACK_MODEL]
        : [primary, primary];

  let text = '';
  for (let i = 0; i < attempts.length; i++) {
    const left = remaining();
    if (i > 0 && left < 8000) break; // not enough budget left for another attempt
    const perAttempt = Math.max(8000, Math.min(timeoutMs, left));
    try {
      text = await run(attempts[i], perAttempt);
      break;
    } catch (err) {
      const lastAttempt = i === attempts.length - 1;
      // Only fall back on transient/timeout failures; surface real errors at once.
      if (lastAttempt || !isTransient(err) || remaining() < 8000) throw err;
      console.warn(`[ai] ${attempts[i]} attempt ${i + 1} failed, falling back`);
      await sleep(Math.min(400, remaining()));
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
