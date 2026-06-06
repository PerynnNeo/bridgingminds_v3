'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'on' | 'denied' | 'unsupported';

/**
 * Rounded camera preview. Owns the camera stream lifecycle and hands the playing
 * <video> element back to the parent (which attaches the analyzer / recorder).
 * Calls onUnavailable so the parent can fall back to audio-only.
 */
export function CameraPreview({
  onVideoReady,
  onUnavailable,
  audio = false,
  className,
}: {
  onVideoReady?: (video: HTMLVideoElement, stream: MediaStream) => void;
  onUnavailable?: (reason: 'denied' | 'unsupported') => void;
  /** Include the mic track in the stream (so the same stream can be recorded). */
  audio?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        onUnavailable?.('unsupported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
          setStatus('on');
          onVideoReady?.(v, stream);
        }
      } catch {
        setStatus('denied');
        onUnavailable?.('denied');
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio]);

  if (status === 'denied' || status === 'unsupported') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-2xl bg-cream p-6 text-center',
          className,
        )}
      >
        <CameraOff className="h-7 w-7 text-charcoal/40" />
        <p className="text-sm text-charcoal/60">
          {status === 'denied'
            ? 'Camera access is off. You can still practise with audio only.'
            : 'This device cannot use the camera. You can still practise with audio only.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-charcoal/90', className)}>
      <video
        ref={videoRef}
        muted
        playsInline
        className="h-full w-full -scale-x-100 object-cover"
      />
      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
        </div>
      )}
    </div>
  );
}
