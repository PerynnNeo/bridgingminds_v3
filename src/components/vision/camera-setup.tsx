'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CameraCapture } from '@/lib/hooks/use-camera-capture';
import { Button } from '@/components/ui/button';
import { StepGuide } from '@/components/ui/step-guide';
import { CameraStage } from './camera-stage';

const TIPS = [
  { title: 'Position your phone', body: 'Put your phone at eye level and look at the lens, not at yourself on screen.' },
  { title: 'Keep it steady', body: 'If you can, rest your phone on a surface so it stays steady. Holding it is fine too.' },
  { title: 'Good lighting', body: 'Make sure your face is visible and the room is not too dark.' },
];

/**
 * Pre-activity camera setup. Shows the live preview + readiness and friendly
 * guidance, then lets the user start. Falls back gracefully when the camera is
 * unavailable (they can continue with audio only).
 */
export function CameraSetup({ capture, onReady }: { capture: CameraCapture; onReady: () => void }) {
  const [showTips, setShowTips] = useState(!capture.cameraUnavailable);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">Set up your camera</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          {capture.cameraUnavailable
            ? 'Camera access is off, so we will use audio only. You can enable it in your browser settings and reload.'
            : 'Get comfortable, then we will start the two quick recordings.'}
        </p>
      </header>

      <CameraStage capture={capture} className="aspect-[3/4] w-full" />

      {!capture.cameraUnavailable && showTips && (
        <StepGuide
          steps={TIPS}
          onComplete={() => setShowTips(false)}
          showDismiss
        />
      )}

      <Button size="full" className="w-full" onClick={onReady}>
        {capture.cameraUnavailable ? 'Continue with audio only' : "I'm ready"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
