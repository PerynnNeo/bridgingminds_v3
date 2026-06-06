'use client';

import { Check, MicOff } from 'lucide-react';
import type { CameraCapture } from '@/lib/hooks/use-camera-capture';
import { cn } from '@/lib/utils';

function ReadyDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium backdrop-blur',
        ok ? 'bg-success/80 text-white' : 'bg-black/35 text-white/85',
      )}
    >
      {ok && <Check className="h-3 w-3" />}
      {label}
    </span>
  );
}

/**
 * Camera preview surface for recording activities. Shows the live preview and,
 * while not recording, a few readiness hints. No scores are shown here, that is
 * deliberate so the user can focus on speaking.
 */
export function CameraStage({
  capture,
  showReadiness = true,
  dim = false,
  className,
}: {
  capture: CameraCapture;
  showReadiness?: boolean;
  /** Subdue the self-preview (used while recording) so users look at the lens, not themselves. */
  dim?: boolean;
  className?: string;
}) {
  if (capture.cameraUnavailable) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-2xl bg-cream p-4 text-center text-sm text-charcoal/60',
          className,
        )}
      >
        <MicOff className="h-4 w-4 text-charcoal/40" />
        Camera is off, recording audio only.
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-charcoal/90', className)}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={capture.videoRef}
        muted
        playsInline
        className={cn('h-full w-full -scale-x-100 object-cover', dim && 'opacity-40')}
      />
      {!capture.cameraOn && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
        </div>
      )}
      {dim && capture.cameraOn && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/90">
            Look at the lens
          </span>
        </div>
      )}
      {showReadiness && capture.cameraOn && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent p-2">
          <ReadyDot ok={capture.readiness.faceVisible} label="Face" />
          <ReadyDot ok={capture.readiness.lightingOk} label="Light" />
        </div>
      )}
    </div>
  );
}
