import type { FaceLandmarkerResult, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { ReadinessState, VisualMetrics, VisualSample } from './types';

/**
 * Pure heuristics that turn MediaPipe output into delivery metrics.
 * All thresholds are deliberately forgiving and are ESTIMATES, not measurements.
 * We intentionally do NOT score framing or camera angle. Hand-gesture balance is
 * scored only when hands are actually visible.
 */

// Head orientation tolerances (as a fraction of face width / height).
const FACE_YAW_LIMIT = 0.12;
const FACE_PITCH_LIMIT = 0.2;

// Expression blendshapes that capture "expressiveness" (never emotion).
const EXPR_KEYS = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'jawOpen',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekSquintLeft',
  'mouthPucker',
];
const EXPR_SCALE = 8;

// Gesture: hands must be visible in at least this share of frames to be coached.
const GESTURE_MIN_VISIBLE = 0.25;

// Canonical FaceMesh landmark indices.
const NOSE = 1;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const FOREHEAD = 10;
const CHIN = 152;

// Iris + eye-opening landmarks (478-point model) for gaze estimation.
const LEFT_IRIS = 468; // left-eye iris centre
const RIGHT_IRIS = 473; // right-eye iris centre
const LEFT_EYE_INNER = 133;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
// Gaze tolerances: iris must be roughly centred horizontally and not looking down
// (the on-screen self-preview sits below the top-mounted lens, so looking at it
// reads as eyes-down). Looking up toward the lens is fine.
const GAZE_H_TOL = 0.22;
const GAZE_DOWN_LIMIT = 0.62;

export const EMPTY_READINESS: ReadinessState = {
  cameraReady: false,
  faceVisible: false,
  lightingOk: false,
};

export const ZERO_METRICS: VisualMetrics = {
  eyeContactRatio: 0,
  faceVisibilityRatio: 0,
  headStabilityScore: 0,
  expressionVariationScore: 0,
  mouthVisibilityScore: 0,
  lightingQualityScore: 0,
  gestureScore: 0,
  handVisibleRatio: 0,
  deliveryPresenceScore: 0,
  sampleCount: 0,
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = avg(a);
  return Math.sqrt(avg(a.map((x) => (x - m) * (x - m))));
};
const bell = (x: number, center: number, tol: number) => clamp01(1 - Math.abs(x - center) / tol);

function lightingOf(brightness: number): number {
  const notTooDark = brightness < 0.35 ? clamp01((brightness - 0.1) / 0.25) : 1;
  const notTooBright = brightness > 0.78 ? clamp01(1 - (brightness - 0.78) / 0.22) : 1;
  return clamp01(Math.min(notTooDark, notTooBright));
}

/** Palm-ish centre of the most prominent hand (average of wrist + finger bases). */
function handCentre(hand: HandLandmarkerResult | null): { x: number; y: number } | null {
  const lm = hand?.landmarks?.[0];
  if (!lm || lm.length < 18) return null;
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

/** Whether the eyes are directed at the lens (needs the 478-point iris model). */
function gazeAtLens(lm: { x: number; y: number }[]): boolean {
  if (lm.length < 478) return true; // no iris data: let head pose alone decide
  const eyeRatios = (iris: number, c1: number, c2: number, top: number, bottom: number) => {
    const hMin = Math.min(lm[c1].x, lm[c2].x);
    const hSpan = Math.abs(lm[c2].x - lm[c1].x) || 1e-6;
    const vMin = Math.min(lm[top].y, lm[bottom].y);
    const vSpan = Math.abs(lm[bottom].y - lm[top].y) || 1e-6;
    return { h: (lm[iris].x - hMin) / hSpan, v: (lm[iris].y - vMin) / vSpan };
  };
  const l = eyeRatios(LEFT_IRIS, LEFT_EYE_INNER, LEFT_EYE_OUTER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM);
  const r = eyeRatios(RIGHT_IRIS, RIGHT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM);
  const hCentred = Math.abs((l.h + r.h) / 2 - 0.5) < GAZE_H_TOL;
  const notLookingDown = (l.v + r.v) / 2 < GAZE_DOWN_LIMIT;
  return hCentred && notLookingDown;
}

/** Extract per-frame features from MediaPipe results + the frame's brightness. */
export function extractSample(
  face: FaceLandmarkerResult,
  hand: HandLandmarkerResult | null,
  brightness: number,
): VisualSample {
  const handPos = handCentre(hand);
  const lm = face.faceLandmarks?.[0];
  if (!lm || lm.length < 468) {
    return {
      faceDetected: false,
      yaw: 0,
      pitch: 0,
      facingCamera: false,
      lookingAtLens: false,
      faceBox: null,
      center: null,
      expression: [],
      mouthVisible: false,
      handsPresent: handPos !== null,
      handPos,
      brightness,
    };
  }

  const nose = lm[NOSE];
  const le = lm[LEFT_EYE_OUTER];
  const re = lm[RIGHT_EYE_OUTER];
  const top = lm[FOREHEAD];
  const chin = lm[CHIN];

  const faceW = Math.abs(re.x - le.x) || 1e-6;
  const yawRatio = (nose.x - (le.x + re.x) / 2) / faceW;
  const pitchRatio = (nose.y - top.y) / ((chin.y - top.y) || 1e-6) - 0.5;

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of lm) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const faceBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  const facingCamera = Math.abs(yawRatio) < FACE_YAW_LIMIT && Math.abs(pitchRatio) < FACE_PITCH_LIMIT;
  const lookingAtLens = facingCamera && gazeAtLens(lm);

  const cats = face.faceBlendshapes?.[0]?.categories ?? [];
  const byName = new Map<string, number>(cats.map((c) => [c.categoryName, c.score]));
  const expression = EXPR_KEYS.map((k) => byName.get(k) ?? 0);

  return {
    faceDetected: true,
    yaw: yawRatio * 90,
    pitch: pitchRatio * 90,
    facingCamera,
    lookingAtLens,
    faceBox,
    center: { x: nose.x, y: nose.y },
    expression,
    mouthVisible: facingCamera && faceBox.h > 0.18,
    handsPresent: handPos !== null,
    handPos,
    brightness,
  };
}

/** Live readiness state from the latest sample (drives setup hints, not scores). */
export function readinessFrom(s: VisualSample | null): ReadinessState {
  if (!s) return EMPTY_READINESS;
  if (!s.faceDetected) {
    return { cameraReady: true, faceVisible: false, lightingOk: s.brightness > 0.28 };
  }
  return {
    cameraReady: true,
    faceVisible: (s.faceBox?.h ?? 0) > 0.2,
    lightingOk: s.brightness > 0.28,
  };
}

/** Balance of hand movement: stiff/static and frantic both score lower than natural. */
function gestureFrom(samples: VisualSample[]): { gestureScore: number; handVisibleRatio: number } {
  const n = samples.length;
  if (!n) return { gestureScore: 0, handVisibleRatio: 0 };
  const handVisibleRatio = samples.filter((s) => s.handsPresent).length / n;
  if (handVisibleRatio < GESTURE_MIN_VISIBLE) return { gestureScore: 0, handVisibleRatio };

  const moves: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].handPos;
    const b = samples[i].handPos;
    if (a && b) moves.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  if (moves.length < 2) return { gestureScore: 0.5, handVisibleRatio };
  const meanMove = avg(moves);
  // Natural movement ~0.02/frame, static ~0, frantic >0.06.
  return { gestureScore: bell(meanMove, 0.02, 0.045), handVisibleRatio };
}

/** Aggregate a recording's samples into final delivery metrics. */
export function aggregate(samples: VisualSample[]): VisualMetrics {
  const n = samples.length;
  if (!n) return { ...ZERO_METRICS };

  const valid = samples.filter((s) => s.faceDetected);
  const v = valid.length;

  const faceVisibilityRatio = v / n;
  const eyeContactRatio = v ? valid.filter((s) => s.lookingAtLens).length / v : 0;
  const mouthVisibilityScore = v ? valid.filter((s) => s.mouthVisible).length / v : 0;

  let headStabilityScore = 0;
  if (v >= 3) {
    const sx = std(valid.map((s) => s.center?.x ?? 0));
    const sy = std(valid.map((s) => s.center?.y ?? 0));
    const syaw = std(valid.map((s) => s.yaw));
    headStabilityScore = clamp01(0.5 * clamp01(1 - (sx + sy) / 0.12) + 0.5 * clamp01(1 - syaw / 25));
  } else if (v > 0) {
    headStabilityScore = 0.6;
  }

  let expressionVariationScore = 0;
  if (v >= 3) {
    let total = 0;
    for (let i = 0; i < EXPR_KEYS.length; i++) {
      total += std(valid.map((s) => s.expression[i] ?? 0));
    }
    expressionVariationScore = clamp01((total / EXPR_KEYS.length) * EXPR_SCALE);
  }

  const lightingQualityScore = avg(samples.map((s) => lightingOf(s.brightness)));
  const { gestureScore, handVisibleRatio } = gestureFrom(samples);

  const deliveryPresenceScore = clamp01(
    0.42 * eyeContactRatio +
      0.24 * expressionVariationScore +
      0.2 * headStabilityScore +
      0.14 * lightingQualityScore,
  );

  return {
    eyeContactRatio,
    faceVisibilityRatio,
    headStabilityScore,
    expressionVariationScore,
    mouthVisibilityScore,
    lightingQualityScore,
    gestureScore,
    handVisibleRatio,
    deliveryPresenceScore,
    sampleCount: n,
  };
}
