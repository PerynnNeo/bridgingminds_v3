'use client';

import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordButtonProps {
  isRecording?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Large, friendly record control (spec §3.5 core component).
 * Presentational only, MediaRecorder wiring is added in the onboarding/practice phases.
 */
export function RecordButton({
  isRecording = false,
  disabled = false,
  onClick,
  className,
}: RecordButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isRecording}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      className={cn(
        'flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-50',
        isRecording
          ? 'animate-record-pulse bg-danger'
          : 'bg-primary-500 shadow-soft hover:bg-primary-600',
        className,
      )}
    >
      {isRecording ? (
        <Square className="h-7 w-7" fill="currentColor" />
      ) : (
        <Mic className="h-8 w-8" />
      )}
    </button>
  );
}
