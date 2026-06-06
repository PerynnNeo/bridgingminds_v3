/**
 * On-device visual delivery analysis types.
 *
 * IMPORTANT: this layer runs entirely in the browser (MediaPipe). Only the
 * aggregated numeric metrics ever leave the device. Raw video frames and the
 * user's face are never uploaded or sent to any AI. These are delivery cues,
 * not emotion detection and not appearance judgement.
 */

/** Features extracted from a single sampled video frame. */
export interface VisualSample {
  faceDetected: boolean;
  /** Rough head yaw in degrees (left/right). 0 = facing the camera. Estimate only. */
  yaw: number;
  /** Rough head pitch in degrees (up/down). 0 = facing the camera. Estimate only. */
  pitch: number;
  /** Head oriented near the camera (the eye-contact proxy). */
  facingCamera: boolean;
  /** Face bounding box in normalized [0..1] image coordinates. */
  faceBox: { x: number; y: number; w: number; h: number } | null;
  /** Nose-tip position (normalized) used for stability tracking. */
  center: { x: number; y: number } | null;
  /** Selected expression blendshape scores (0..1), in a fixed order. */
  expression: number[];
  /** Mouth region visible and facing enough for articulation feedback. */
  mouthVisible: boolean;
  /** Average frame brightness 0..1. */
  brightness: number;
}

/** Aggregated visual delivery metrics for one recording. All scores 0..1. */
export interface VisualMetrics {
  eyeContactRatio: number;
  faceVisibilityRatio: number;
  framingScore: number;
  headStabilityScore: number;
  expressionVariationScore: number;
  mouthVisibilityScore: number;
  lightingQualityScore: number;
  /** Overall delivery presence: a weighted blend of the above. */
  deliveryPresenceScore: number;
  /** Frames sampled (a confidence signal for the analysis). */
  sampleCount: number;
}

/** Live readiness shown on setup/preview. No scores are shown while recording. */
export interface ReadinessState {
  cameraReady: boolean;
  faceVisible: boolean;
  centered: boolean;
  lightingOk: boolean;
}
