'use client';

/** Fire-and-forget product-analytics event from the client. */
export async function track(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties }),
    });
  } catch {
    // Analytics is best-effort, never block the UI.
  }
}
