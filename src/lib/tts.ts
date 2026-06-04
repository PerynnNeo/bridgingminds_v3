'use client';

/**
 * Text-to-speech via the browser Web Speech API (free, no key, works offline).
 * Used to play "model pronunciation" of words and phrases (spec §2.6, §10.2).
 *
 * This is the MVP TTS provider. To upgrade to a premium voice (e.g. ElevenLabs),
 * swap these functions for calls to a server route that streams audio, callers
 * (listen buttons) stay the same.
 */

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeakOptions {
  /** 0.1–10, default 0.95 (slightly slower reads more clearly for learners). */
  rate?: number;
  /** 0–2, default 1. */
  pitch?: number;
  lang?: string;
  onEnd?: () => void;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts.rate ?? 0.95;
  utterance.pitch = opts.pitch ?? 1;
  utterance.lang = opts.lang ?? 'en-US';
  if (opts.onEnd) utterance.onend = opts.onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}
