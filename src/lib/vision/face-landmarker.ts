import type { FaceLandmarker } from '@mediapipe/tasks-vision';

/**
 * Lazy, browser-only loader for the MediaPipe Face Landmarker (a singleton).
 * The WASM + model are fetched from a CDN at runtime, nothing is bundled, and
 * the import is dynamic so this never runs on the server.
 */

const VERSION = '0.10.35';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let instance: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;

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

export function disposeFaceLandmarker(): void {
  instance?.close();
  instance = null;
  loading = null;
}
