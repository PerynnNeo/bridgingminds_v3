'use client';

import { useEffect, useRef } from 'react';

/**
 * Tracks time-in-app: one usage session per visit, refreshed by a heartbeat
 * every minute while the tab is visible, plus a final beat on page hide.
 * Renders nothing.
 */
export function UsageTracker() {
  const idRef = useRef<string>('');

  useEffect(() => {
    if (typeof crypto === 'undefined' || !crypto.randomUUID) return;
    if (!idRef.current) idRef.current = crypto.randomUUID();
    const id = idRef.current;

    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/track/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).catch(() => {});
    };

    const onHide = () => {
      try {
        const blob = new Blob([JSON.stringify({ id })], { type: 'application/json' });
        navigator.sendBeacon('/api/track/heartbeat', blob);
      } catch {
        /* ignore */
      }
    };

    beat();
    const interval = setInterval(beat, 60_000);
    document.addEventListener('visibilitychange', beat);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', beat);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  return null;
}
