'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { getFaceLandmarker } from '@/lib/vision/face-landmarker';
import { aggregate, extractSample, readinessFrom, EMPTY_READINESS } from '@/lib/vision/metrics';
import type { ReadinessState, VisualMetrics, VisualSample } from '@/lib/vision/types';

const SAMPLE_INTERVAL_MS = 250; // ~4 fps, enough for delivery patterns, light on the CPU

export interface VisionAnalyzer {
  /** Model loaded and ready to sample. */
  ready: boolean;
  /** Non-null if the engine could not start (device unsupported / load failed). */
  loadError: string | null;
  /** Live readiness (face in frame, lighting, centering). */
  readiness: ReadinessState;
  /** Attach the <video> element playing the camera stream. Kicks off model load. */
  attach: (video: HTMLVideoElement | null) => void;
  /** Begin accumulating samples (call when recording starts). */
  startSampling: () => void;
  /** Stop accumulating samples. */
  stopSampling: () => void;
  /** Aggregate accumulated samples into final metrics (null if none). */
  finalize: () => VisualMetrics | null;
  /** Clear accumulated samples without stopping. */
  reset: () => void;
}

/**
 * Runs the on-device face analyzer against a video element, sampling at a low
 * frame rate. It only ever produces numbers, never stores or transmits frames.
 */
export function useVisionAnalyzer(): VisionAnalyzer {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReadinessState>(EMPTY_READINESS);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const samplesRef = useRef<VisualSample[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTsRef = useRef(0);

  const load = useCallback(async () => {
    try {
      landmarkerRef.current = await getFaceLandmarker();
      setReady(true);
    } catch {
      setLoadError('Visual analysis could not start on this device.');
    }
  }, []);

  const attach = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      if (video && !landmarkerRef.current && !loadError) void load();
    },
    [load, loadError],
  );

  const brightnessOf = useCallback((video: HTMLVideoElement): number => {
    let c = canvasRef.current;
    if (!c) {
      c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      canvasRef.current = c;
    }
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0.5;
    try {
      ctx.drawImage(video, 0, 0, 32, 32);
      const { data } = ctx.getImageData(0, 0, 32, 32);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return sum / (data.length / 4) / 255;
    } catch {
      return 0.5;
    }
  }, []);

  const sampleOnce = useCallback(
    (accumulate: boolean) => {
      const video = videoRef.current;
      const lm = landmarkerRef.current;
      if (!video || !lm || video.readyState < 2) return;
      let ts = performance.now();
      if (ts <= lastTsRef.current) ts = lastTsRef.current + 1;
      lastTsRef.current = ts;
      try {
        const result = lm.detectForVideo(video, ts);
        const sample = extractSample(result, brightnessOf(video));
        if (accumulate) samplesRef.current.push(sample);
        setReadiness(readinessFrom(sample));
      } catch {
        // Skip a bad frame, never throw out of the loop.
      }
    },
    [brightnessOf],
  );

  // A lightweight preview loop runs once the model is ready, so the setup UI can
  // show readiness without counting frames toward the recording's metrics.
  useEffect(() => {
    if (!ready) return;
    previewRef.current = setInterval(() => {
      if (!intervalRef.current) sampleOnce(false);
    }, SAMPLE_INTERVAL_MS);
    return () => {
      if (previewRef.current) clearInterval(previewRef.current);
      previewRef.current = null;
    };
  }, [ready, sampleOnce]);

  const startSampling = useCallback(() => {
    if (intervalRef.current) return;
    samplesRef.current = [];
    intervalRef.current = setInterval(() => sampleOnce(true), SAMPLE_INTERVAL_MS);
  }, [sampleOnce]);

  const stopSampling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const finalize = useCallback((): VisualMetrics | null => {
    if (samplesRef.current.length === 0) return null;
    return aggregate(samplesRef.current);
  }, []);

  const reset = useCallback(() => {
    samplesRef.current = [];
  }, []);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (previewRef.current) clearInterval(previewRef.current);
    },
    [],
  );

  return { ready, loadError, readiness, attach, startSampling, stopSampling, finalize, reset };
}
