import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, resolving conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a 0–100 score for display, guarding against null/NaN. */
export function formatScore(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '–';
  return Math.round(score).toString();
}
