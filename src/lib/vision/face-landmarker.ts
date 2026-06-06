import type { FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Lazy, browser-only loaders for the MediaPipe Face + Hand landmarkers
 * (singletons). The WASM + models are fetched from a CDN at runtime, nothing is
 * bundled, and the imports are dynamic so this never runs on the server.
 */

const VERSION = '0.10.35';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let instance: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;
let handInstance: HandLandmarker | null = null;
let handLoading: Promise<HandLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (instance) return instance;
  if (loading) return loading;

  loading = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);

    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    };

    try {
      instance = await vision.FaceLandmarker.createFromOptions(fileset, options);
    } catch {
      // Some devices lack a usable WebGL context, retry on the CPU delegate.
      instance = await vision.FaceLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' as const },
      });
    }
    return instance;
  })();

  return loading;
}

/** Hand landmarker for gesture analysis. Loaded best-effort, alongside the face. */
export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handInstance) return handInstance;
  if (handLoading) return handLoading;

  handLoading = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
    const options = {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numHands: 2,
    };
    try {
      handInstance = await vision.HandLandmarker.createFromOptions(fileset, options);
    } catch {
      handInstance = await vision.HandLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'CPU' as const },
      });
    }
    return handInstance;
  })();

  return handLoading;
}

export function disposeFaceLandmarker(): void {
  instance?.close();
  instance = null;
  loading = null;
  handInstance?.close();
  handInstance = null;
  handLoading = null;
}
