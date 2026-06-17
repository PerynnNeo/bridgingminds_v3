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

let currentAudio: HTMLAudioElement | null = null;
// Cache generated audio by text so repeats (e.g. "Hear again") replay without re-billing.
const speechCache = new Map<string, string>();

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/**
 * Speak with the premium voice (ElevenLabs via /api/tts), falling back to the
 * browser voice if it is not configured or the request fails. Fire-and-forget:
 * the caller need not await it.
 */
export async function playSpeech(text: string, opts: SpeakOptions = {}): Promise<void> {
  stopSpeaking();
  try {
    let url = speechCache.get(text);
    if (!url) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('tts unavailable');
      url = URL.createObjectURL(await res.blob());
      speechCache.set(text, url);
    }
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      opts.onEnd?.();
    };
    await audio.play();
  } catch {
    speak(text, opts); // browser-voice fallback
  }
}
