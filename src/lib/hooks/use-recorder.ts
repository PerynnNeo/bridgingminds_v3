'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Recorder {
  isRecording: boolean;
  isSupported: boolean;
  durationSec: number;
  audioBlob: Blob | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Microphone capture via MediaRecorder. Produces a Blob on stop. */
export function useRecorder(): Recorder {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof window.MediaRecorder !== 'undefined';

  const stopTracks = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDurationSec(0);
    chunksRef.current = [];

    if (!isSupported) {
      setError('Recording is not supported in this browser. Try Chrome or Safari.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stopTracks();
        setIsRecording(false);
      };

      recorder.start();
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDurationSec((Date.now() - startedAtRef.current) / 1000);
      }, 200);
      setIsRecording(true);
    } catch {
      setError('We could not access your microphone. Please allow access and try again.');
      stopTracks();
    }
  }, [isSupported, stopTracks]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    stopTracks();
    chunksRef.current = [];
    setIsRecording(false);
    setAudioBlob(null);
    setDurationSec(0);
    setError(null);
  }, [stopTracks]);

  useEffect(() => () => stopTracks(), [stopTracks]);

  return { isRecording, isSupported, durationSec, audioBlob, error, start, stop, reset };
}
