'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVisionAnalyzer } from './use-vision-analyzer';
import type { ReadinessState, VisualMetrics } from '@/lib/vision/types';

/**
 * Unified capture for camera-enabled activities: ONE getUserMedia stream feeds
 * the video preview, the on-device analyzer, and the audio recorder. Only the
 * audio track is recorded (for speech-to-text), video frames are analysed and
 * discarded. With `video: false` it behaves like a plain audio recorder.
 *
 * Privacy: no video bytes are ever recorded, stored, or uploaded.
 */
export interface CameraCapture {
  /** Camera video track is live (false when audio-only or unavailable). */
  cameraOn: boolean;
  /** Camera was requested but denied/unsupported, running audio-only. */
  cameraUnavailable: boolean;
  /** Mic/camera permission error message, if any. */
  error: string | null;
  /** On-device model loaded. */
  analyzerReady: boolean;
  /** Live readiness (face in frame, lighting, centering). */
  readiness: ReadinessState;
  /** Attach to the preview <video> element. */
  videoRef: (el: HTMLVideoElement | null) => void;
  isRecording: boolean;
  durationSec: number;
  audioBlob: Blob | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  /** Aggregate the visual metrics from the last recording (null if audio-only). */
  finalizeMetrics: () => VisualMetrics | null;
}

export function useCameraCapture({
  video,
  enabled,
}: {
  /** Request the camera (and run visual analysis). */
  video: boolean;
  /** Acquire the stream. Keep false until the user has opted in. */
  enabled: boolean;
}): CameraCapture {
  const analyzer = useVisionAnalyzer();

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const attachStreamToVideo = useCallback(() => {
    const el = videoElRef.current;
    const stream = streamRef.current;
    if (el && stream && stream.getVideoTracks().length > 0) {
      el.srcObject = stream;
      void el.play().catch(() => {});
      analyzer.attach(el);
    }
  }, [analyzer]);

  // Acquire the stream once the user has opted in.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function acquire() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Recording is not supported in this browser.');
        setCameraUnavailable(video);
        return;
      }
      const videoConstraint = video
        ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        : false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraint });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setCameraOn(video && stream.getVideoTracks().length > 0);
        attachStreamToVideo();
      } catch {
        if (video) {
          // Camera denied, fall back to audio-only so the activity still works.
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (cancelled) {
              audioOnly.getTracks().forEach((t) => t.stop());
              return;
            }
            streamRef.current = audioOnly;
            setCameraUnavailable(true);
            setCameraOn(false);
          } catch {
            setError('We could not access your microphone. Please allow access and try again.');
          }
        } else {
          setError('We could not access your microphone. Please allow access and try again.');
        }
      }
    }

    void acquire();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, video]);

  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElRef.current = el;
      if (el) attachStreamToVideo();
    },
    [attachStreamToVideo],
  );

  const start = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || recorderRef.current) return;
    setAudioBlob(null);
    setDurationSec(0);
    chunksRef.current = [];

    // Record only the audio track, never the video.
    const audioStream = new MediaStream(stream.getAudioTracks());
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const recorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      setIsRecording(false);
      recorderRef.current = null;
    };

    recorder.start();
    startedAtRef.current = performance.now();
    timerRef.current = setInterval(() => {
      setDurationSec((performance.now() - startedAtRef.current) / 1000);
    }, 200);
    setIsRecording(true);
    if (cameraOn) analyzer.startSampling();
  }, [analyzer, cameraOn]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    analyzer.stopSampling();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, [analyzer]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
      recorderRef.current = null;
    }
    analyzer.stopSampling();
    analyzer.reset();
    chunksRef.current = [];
    setIsRecording(false);
    setAudioBlob(null);
    setDurationSec(0);
  }, [analyzer]);

  const finalizeMetrics = useCallback(
    () => (cameraOn ? analyzer.finalize() : null),
    [analyzer, cameraOn],
  );

  // Release the camera/mic when the consumer unmounts.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  return {
    cameraOn,
    cameraUnavailable,
    error,
    analyzerReady: analyzer.ready,
    readiness: analyzer.readiness,
    videoRef,
    isRecording,
    durationSec,
    audioBlob,
    start,
    stop,
    reset,
    finalizeMetrics,
  };
}
