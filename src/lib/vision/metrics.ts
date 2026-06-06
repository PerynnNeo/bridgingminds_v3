import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { ReadinessState, VisualMetrics, VisualSample } from './types';

/**
 * Pure heuristics that turn MediaPipe face-landmark output into delivery metrics.
 * All thresholds are deliberately forgiving and are ESTIMATES, not measurements,
 * they are likely to need light tuning after real-device testing (the /camera-check
 * diagnostic exists for exactly that).
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

// Canonical FaceMesh landmark indices.
const NOSE = 1;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const FOREHEAD = 10;
const CHIN = 152;

export const EMPTY_READINESS: ReadinessState = {
  cameraReady: false,
  faceVisible: false,
  centered: false,
  lightingOk: false,
};

export const ZERO_METRICS: VisualMetrics = {
  eyeContactRatio: 0,
  faceVisibilityRatio: 0,
  framingScore: 0,
  headStabilityScore: 0,
  expressionVariationScore: 0,
  mouthVisibilityScore: 0,
  lightingQualityScore: 0,
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

function framingOf(box: { x: number; y: number; w: number; h: number }): number {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const size = bell(box.h, 0.45, 0.22); // face filling a comfortable portion of frame
  const horiz = bell(cx, 0.5, 0.22); // centered left/right
  const vert = bell(cy, 0.45, 0.22); // eyes a touch above middle
  return clamp01(0.5 * size + 0.25 * horiz + 0.25 * vert);
}

function lightingOf(brightness: number): number {
  const notTooDark = brightness < 0.35 ? clamp01((brightness - 0.1) / 0.25) : 1;
  const notTooBright = brightness > 0.78 ? clamp01(1 - (brightness - 0.78) / 0.22) : 1;
  return clamp01(Math.min(notTooDark, notTooBright));
}

/** Extract per-frame features from a MediaPipe result + the frame's brightness. */
export function extractSample(result: FaceLandmarkerResult, brightness: number): VisualSample {
  const lm = result.faceLandmarks?.[0];
  if (!lm || lm.length < 468) {
    return {
      faceDetected: false,
      yaw: 0,
      pitch: 0,
      facingCamera: false,
      faceBox: null,
      center: null,
      expression: [],
      mouthVisible: false,
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

  const cats = result.faceBlendshapes?.[0]?.categories ?? [];
  const byName = new Map<string, number>(cats.map((c) => [c.categoryName, c.score]));
  const expression = EXPR_KEYS.map((k) => byName.get(k) ?? 0);

  return {
    faceDetected: true,
    yaw: yawRatio * 90,
    pitch: pitchRatio * 90,
    facingCamera,
    faceBox,
    center: { x: nose.x, y: nose.y },
    expression,
    mouthVisible: facingCamera && faceBox.h > 0.18,
    brightness,
  };
}

/** Live readiness state from the latest sample (drives setup chips, not scores). */
export function readinessFrom(s: VisualSample | null): ReadinessState {
  if (!s) return EMPTY_READINESS;
  if (!s.faceDetected) {
    return { cameraReady: true, faceVisible: false, centered: false, lightingOk: s.brightness > 0.28 };
  }
  const cy = s.faceBox ? s.faceBox.y + s.faceBox.h / 2 : 0.5;
  return {
    cameraReady: true,
    faceVisible: (s.faceBox?.h ?? 0) > 0.2,
    centered: !!s.center && s.center.x > 0.3 && s.center.x < 0.7 && cy > 0.25 && cy < 0.78,
    lightingOk: s.brightness > 0.28,
  };
}

/** Aggregate a recording's samples into final delivery metrics. */
export function aggregate(samples: VisualSample[]): VisualMetrics {
  const n = samples.length;
  if (!n) return { ...ZERO_METRICS };

  const valid = samples.filter((s) => s.faceDetected);
  const v = valid.length;

  const faceVisibilityRatio = v / n;
  const eyeContactRatio = v ? valid.filter((s) => s.facingCamera).length / v : 0;
  const mouthVisibilityScore = v ? valid.filter((s) => s.mouthVisible).length / v : 0;
  const framingScore = v ? avg(valid.map((s) => (s.faceBox ? framingOf(s.faceBox) : 0))) : 0;

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

  const deliveryPresenceScore = clamp01(
    0.34 * eyeContactRatio +
      0.22 * framingScore +
      0.18 * expressionVariationScore +
      0.14 * headStabilityScore +
      0.12 * lightingQualityScore,
  );

  return {
    eyeContactRatio,
    faceVisibilityRatio,
    framingScore,
    headStabilityScore,
    expressionVariationScore,
    mouthVisibilityScore,
    lightingQualityScore,
    deliveryPresenceScore,
    sampleCount: n,
  };
}
