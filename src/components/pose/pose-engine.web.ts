/**
 * The tracker: MediaPipe pose + gesture (hands) + face, loaded once per page and shared by every
 * PoseCamera, so a remount is instant. Nothing from MediaPipe loads at module scope.
 *
 * Loading downloads the WASM runtime and the two main models with real byte progress (the WASM
 * goes in as a blob URL, so the three tasks share one download). Face loads afterwards, on demand.
 * GPU first, CPU when the GPU delegate fails to build or to run.
 */
import type { FaceLandmarker, FilesetResolver, GestureRecognizer, NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';

import { assetUrl } from '@/lib/base-url';

type WasmFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
export type Delegate = 'GPU' | 'CPU';
export type Edge = readonly [number, number];
export type Lm = NormalizedLandmark;
export type HandHit = { lm: Lm[]; gesture?: { name: string; score: number } };
/** `pose`/`face`: undefined when that model did not run this frame, null when it ran and saw nothing. */
export type Detection = { hands: HandHit[]; pose?: Lm[] | null; face?: Lm[] | null };

export type Tracker = {
  readonly delegate: Delegate;
  readonly edges: { hand: Edge[]; face: Edge[] };
  /** Runs the models on one video frame. `ts` in ms, strictly increasing. Throws if a model fails. */
  detect(video: HTMLVideoElement, ts: number, run: { pose: boolean; face: boolean }): Detection;
  hasFace(): boolean;
  /** Loads the face model in the background (resolves false if it cannot). */
  loadFace(): Promise<boolean>;
  /** After a GPU failure at run time: rebuild every model on the CPU. */
  fallBack(): Promise<void>;
};

const MODEL = {
  pose: 'models/pose_landmarker_lite.task',
  gesture: 'models/gesture_recognizer.task',
  face: 'models/face_landmarker.task',
};
/** Byte estimates for the progress bar when a server sends no Content-Length. */
const EST = { wasm: 13.5e6, pose: 5.8e6, gesture: 8.4e6 };

let tracker: Tracker | null = null;
let loading: Promise<Tracker> | null = null;
let progress = 0;
const listeners = new Set<(p: number) => void>();

function setProgress(p: number) {
  progress = Math.max(progress, Math.min(1, p));
  listeners.forEach((fn) => fn(progress));
}

export const getTracker = () => tracker;
export const trackerProgress = () => progress;
export function onTrackerProgress(fn: (p: number) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Starts (or joins) the one load. A failed load can be retried by calling this again. */
export function loadTracker(): Promise<Tracker> {
  if (tracker) return Promise.resolve(tracker);
  if (!loading) {
    loading = build().then(
      (t) => (tracker = t),
      (e) => {
        loading = null;
        progress = 0;
        listeners.forEach((fn) => fn(0));
        throw e;
      },
    );
  }
  return loading;
}

/** Fetches a file with byte progress; rejects on an HTML fallback page so a bad path fails loudly. */
async function fetchBytes(url: string, onBytes: (n: number, total: number) => void, est: number) {
  const res = await fetch(url);
  const kind = res.headers.get('content-type') ?? '';
  if (!res.ok || kind.includes('text/html')) throw new Error(`tracker asset missing: ${url}`);
  const total = Number(res.headers.get('content-length')) || est;
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onBytes(buf.byteLength, total);
    return buf;
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    n += value.byteLength;
    onBytes(n, total);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) out.set(p, (o += p.byteLength) - p.byteLength);
  return out;
}

type Vision = typeof import('@mediapipe/tasks-vision');

/**
 * MediaPipe's bundle contains `import(t.toString())`, which Metro refuses to transform, so the
 * package's own bundle is served from public/mediapipe next to its WASM (keep it the same version
 * as node_modules/@mediapipe/tasks-vision) and imported natively, out of Metro's sight.
 */
const nativeImport = new Function('u', 'return import(u)') as (u: string) => Promise<Vision>;
const loadVision = () => nativeImport(new URL(assetUrl('mediapipe/vision_bundle.mjs'), window.location.href).href);

/**
 * MediaPipe's runtime prints routine INFO lines to stderr, which lands in console.error. Its loader
 * reads `self.Module` as the Emscripten config, so set one before each task: chatter goes to
 * console.debug, real (E/F) log lines stay errors.
 */
function quiet(): undefined {
  const line = (...a: unknown[]) => {
    const msg = a.join(' ');
    if (/^[EF]\d{4}/.test(msg)) console.error(msg);
    else console.debug(msg);
  };
  (self as unknown as { Module?: object }).Module = { print: line, printErr: line };
  return undefined;
}

async function build(): Promise<Tracker> {
  setProgress(0.02);
  const vision = await loadVision();
  const { FilesetResolver, PoseLandmarker: PL, GestureRecognizer: GR, FaceLandmarker: FL } = vision;
  const paths = await FilesetResolver.forVisionTasks(assetUrl('mediapipe'));
  setProgress(0.04);

  // Downloads: 4% → 80% of the bar, by bytes across all three files.
  const got = { wasm: 0, pose: 0, gesture: 0 };
  const tot = { ...EST };
  const meter = (k: keyof typeof got) => (n: number, total: number) => {
    got[k] = n;
    tot[k] = total;
    const sum = got.wasm + got.pose + got.gesture;
    setProgress(0.04 + 0.76 * (sum / (tot.wasm + tot.pose + tot.gesture)));
  };
  const [wasm, poseBuf, gestureBuf] = await Promise.all([
    fetchBytes(paths.wasmBinaryPath.toString(), meter('wasm'), EST.wasm),
    fetchBytes(assetUrl(MODEL.pose), meter('pose'), EST.pose),
    fetchBytes(assetUrl(MODEL.gesture), meter('gesture'), EST.gesture),
  ]);
  const fileset: WasmFileset = {
    wasmLoaderPath: paths.wasmLoaderPath,
    wasmBinaryPath: URL.createObjectURL(new Blob([wasm as BlobPart], { type: 'application/wasm' })),
  };

  // Tasks are created one at a time: each one runs MediaPipe's loader script, which sets a global.
  const makePose = (delegate: Delegate) =>
    quiet() ||
    PL.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: poseBuf, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  const makeGesture = (delegate: Delegate) =>
    quiet() ||
    GR.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: gestureBuf, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  let faceBuf: Uint8Array | null = null;
  const makeFace = async (delegate: Delegate) => {
    faceBuf ??= await fetchBytes(assetUrl(MODEL.face), () => {}, 3.8e6);
    return quiet() || FL.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: faceBuf, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  };

  let delegate: Delegate = 'GPU';
  let pose: PoseLandmarker;
  try {
    pose = await makePose('GPU');
  } catch {
    delegate = 'CPU';
    pose = await makePose('CPU');
  }
  setProgress(0.9);
  let gesture: GestureRecognizer;
  try {
    gesture = await makeGesture(delegate);
  } catch (e) {
    if (delegate === 'CPU') throw e;
    // The GPU built one model and not the other: run both on the CPU so they agree.
    pose.close();
    delegate = 'CPU';
    pose = await makePose('CPU');
    gesture = await makeGesture('CPU');
  }
  setProgress(1);

  let face: FaceLandmarker | null = null;
  let faceLoad: Promise<boolean> | null = null;
  let rebuilding: Promise<void> | null = null;

  const edgeList = (cs: { start: number; end: number }[]): Edge[] => cs.map((c) => [c.start, c.end] as const);
  const faceEdges = [
    FL.FACE_LANDMARKS_FACE_OVAL,
    FL.FACE_LANDMARKS_LEFT_EYE,
    FL.FACE_LANDMARKS_RIGHT_EYE,
    FL.FACE_LANDMARKS_LEFT_EYEBROW,
    FL.FACE_LANDMARKS_RIGHT_EYEBROW,
    FL.FACE_LANDMARKS_LIPS,
  ].flatMap(edgeList);

  const t: Tracker = {
    get delegate() {
      return delegate;
    },
    edges: { hand: edgeList(GR.HAND_CONNECTIONS), face: faceEdges },
    detect(video, ts, run) {
      const g = gesture.recognizeForVideo(video, ts);
      const hands: HandHit[] = g.landmarks.map((lm, i) => {
        const top = g.gestures[i]?.[0];
        const name = top?.categoryName;
        return { lm, gesture: top && name && name !== 'None' ? { name, score: top.score } : undefined };
      });
      const out: Detection = { hands };
      if (run.pose) out.pose = pose.detectForVideo(video, ts).landmarks[0] ?? null;
      if (run.face && face) out.face = face.detectForVideo(video, ts).faceLandmarks[0] ?? null;
      return out;
    },
    hasFace: () => !!face,
    loadFace() {
      faceLoad ??= makeFace(delegate)
        .catch(() => makeFace('CPU'))
        .then(
          (f) => ((face = f), true),
          () => ((faceLoad = null), false),
        );
      return faceLoad;
    },
    fallBack() {
      if (delegate === 'CPU') return Promise.reject(new Error('tracker failed on the CPU'));
      rebuilding ??= (async () => {
        delegate = 'CPU';
        const hadFace = !!face;
        pose.close();
        gesture.close();
        face?.close();
        face = null;
        faceLoad = null;
        pose = await makePose('CPU');
        gesture = await makeGesture('CPU');
        if (hadFace) await t.loadFace();
      })();
      return rebuilding;
    },
  };
  return t;
}
