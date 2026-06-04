import 'server-only';
import { AssemblyAI } from 'assemblyai';
import type { SpeechMetrics, TranscriptionResult, WordTiming } from './types';

/**
 * Common spoken filler / disfluency tokens. AssemblyAI with `disfluencies: true`
 * keeps "um"/"uh" in the transcript (Whisper strips them), which we count here.
 */
const FILLER_TOKENS = new Set([
  'um',
  'uh',
  'er',
  'ah',
  'hmm',
  'mhm',
  'uh-huh',
  'erm',
]);

let client: AssemblyAI | null = null;

function getClient(): AssemblyAI {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is not set. Add it to .env.local.');
  }
  client ??= new AssemblyAI({ apiKey });
  return client;
}

/** Accepts a public URL, a local file path, a Buffer, or a Uint8Array. */
export type AudioInput = string | Buffer | Uint8Array;

export async function transcribeAudio(audio: AudioInput): Promise<TranscriptionResult> {
  const assembly = getClient();

  const transcript = await assembly.transcripts.transcribe({
    audio,
    disfluencies: true,
    punctuate: true,
    format_text: true,
  });

  if (transcript.status === 'error') {
    throw new Error(transcript.error ?? 'Transcription failed');
  }

  const words: WordTiming[] = (transcript.words ?? []).map((w) => ({
    text: w.text,
    start: w.start / 1000, // ms → s
    end: w.end / 1000,
    confidence: w.confidence,
  }));

  // Count filler tokens
  const fillerCounts = new Map<string, number>();
  for (const w of words) {
    const norm = w.text.toLowerCase().replace(/[.,!?]/g, '');
    if (FILLER_TOKENS.has(norm)) {
      fillerCounts.set(norm, (fillerCounts.get(norm) ?? 0) + 1);
    }
  }
  const fillerWords = Array.from(fillerCounts, ([text, count]) => ({ text, count }));
  const fillerWordCount = fillerWords.reduce((sum, f) => sum + f.count, 0);

  const durationSec =
    transcript.audio_duration ?? (words.length ? words[words.length - 1].end : 0);

  const meanConfidence =
    words.length > 0
      ? words.reduce((s, w) => s + (w.confidence ?? 0), 0) / words.length
      : (transcript.confidence ?? 0);

  return {
    text: transcript.text ?? '',
    words,
    durationSec,
    fillerWords,
    fillerWordCount,
    confidence: meanConfidence,
  };
}

/** Derive objective speech metrics from a transcription (no AI call). */
export function computeMetrics(t: TranscriptionResult): SpeechMetrics {
  const totalWords = t.words.length;
  const minutes = t.durationSec / 60;
  const wordsPerMinute = minutes > 0 ? totalWords / minutes : 0;
  const fillerWordRate = totalWords > 0 ? (t.fillerWordCount / totalWords) * 100 : 0;

  let longPauseCount = 0;
  for (let i = 1; i < t.words.length; i++) {
    if (t.words[i].start - t.words[i - 1].end > 0.7) longPauseCount++;
  }

  return {
    wordsPerMinute: Math.round(wordsPerMinute),
    fillerWordRate: Math.round(fillerWordRate * 10) / 10,
    longPauseCount,
    totalWords,
    durationSec: Math.round(t.durationSec * 10) / 10,
  };
}
