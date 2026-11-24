/**
 * Sign clips and the gloss dictionary.
 *
 * Each clip has three tracks: `d` (the dominant hand: the avatar's right, on the viewer's left),
 * `n` (the other hand) and `h` (head). A track is a list of keys with a time in seconds; any field
 * a key leaves out is carried over from the key before it. Positions are wrist targets in shoulder
 * widths: [outward from the midline, down from the shoulder line, forward toward the viewer].
 * Keys stop softly (ease in-out) unless marked `thru`, which passes through them (circles, arcs).
 */
import { handVec, headVec, type CompiledClip, type HandPose, type HeadPose, type Key, type PoseVecs } from './rig';

type HK = Partial<HandPose> & { t: number; thru?: boolean };
type HdK = HeadPose & { t: number; thru?: boolean };
type ClipDef = { dur: number; d: HK[]; n?: HK[]; h?: HdK[] };

/** Hands at rest: low, in front of the hips, relaxed. */
export const IDLE_HAND: HandPose = { p: [0.27, 1.0, 0.28], hs: 'rest', a: 160, tilt: 28, face: 120 };
/** The free hand during one-handed signs: low, a little forward. */
const PASSIVE: HandPose = { p: [0.23, 0.92, 0.32], hs: 'rest', a: 145, tilt: 34, face: 120 };

// ---------------------------------------------------------------- teacher reply (the climax)

const which: ClipDef = {
  // Right hand at chest level, palm up, fingers spread and pointing forward; shaken side to side.
  dur: 1.15,
  d: [
    { t: 0, p: [0.22, 0.36, 0.42], hs: '5', a: 18, tilt: 76, face: 180 },
    { t: 0.12, p: [0.22, 0.36, 0.44] },
    { t: 0.27, p: [0.29, 0.355, 0.45], a: 6 },
    { t: 0.42, p: [0.15, 0.365, 0.45], a: 30 },
    { t: 0.57, p: [0.29, 0.355, 0.45], a: 6 },
    { t: 0.72, p: [0.15, 0.365, 0.45], a: 30 },
    { t: 0.87, p: [0.28, 0.355, 0.45], a: 8 },
    { t: 1.02, p: [0.2, 0.36, 0.44], a: 20 },
    { t: 1.15, p: [0.21, 0.36, 0.44], a: 18 },
  ],
  h: [
    { t: 0, pitch: 0, roll: 0 },
    { t: 0.3, pitch: -3, roll: 3, yaw: -2 },
    { t: 1.15, pitch: -3, roll: 4, yaw: -2 },
  ],
};

const step: ClipDef = {
  // Both palms down. The left hand is a flat base; the right arcs up, forward and over, and lands ahead.
  dur: 1.25,
  n: [{ t: 0, p: [0.16, 0.66, 0.36], hs: 'B', a: 62, tilt: 58, face: 0 }],
  d: [
    { t: 0, p: [0.24, 0.62, 0.18], hs: 'B', a: 58, tilt: 52, face: 0 },
    { t: 0.14, p: [0.24, 0.61, 0.19] },
    { t: 0.48, p: [0.1, 0.42, 0.42], tilt: 40, thru: true },
    { t: 0.82, p: [-0.02, 0.6, 0.62], tilt: 60 },
    { t: 0.92, p: [-0.02, 0.615, 0.62] },
    { t: 1.25, p: [-0.02, 0.61, 0.62] },
  ],
  h: [
    { t: 0, pitch: -2 },
    { t: 0.8, pitch: -5, yaw: 2 },
    { t: 1.25, pitch: -4, yaw: 1 },
  ],
};

const not: ClipDef = {
  // Y-hand raised beside the face (elbow down, forearm up), palm toward the midline; arcs forward and out.
  dur: 1.1,
  d: [
    { t: 0, p: [0.42, -0.14, 0.34], hs: 'Y', a: 6, tilt: 4, face: 52 },
    { t: 0.16, p: [0.42, -0.15, 0.35] },
    { t: 0.48, p: [0.48, -0.16, 0.52], a: -2, face: 40, thru: true },
    { t: 0.78, p: [0.56, -0.11, 0.66], a: -14, tilt: 16, face: 30 },
    { t: 1.1, p: [0.56, -0.11, 0.66] },
  ],
  h: [
    { t: 0, yaw: 0 },
    { t: 0.22, yaw: 0 },
    { t: 0.42, yaw: -7 },
    { t: 0.62, yaw: 6 },
    { t: 0.82, yaw: -4 },
    { t: 1.0, yaw: 0, pitch: -2 },
  ],
};

const understand: ClipDef = {
  // (a) Index finger to the temple, held. (b) Open hands meet; the right comes forward and down onto
  // the left palm. Ends on a small questioning tilt.
  dur: 1.8,
  d: [
    { t: 0, p: [0.4, -0.17, 0.3], hs: '1', a: 24, tilt: -18, face: 95 },
    { t: 0.12, p: [0.39, -0.19, 0.28] },
    { t: 0.24, p: [0.385, -0.2, 0.27] },
    { t: 0.55, p: [0.385, -0.2, 0.27] },
    { t: 0.92, p: [0.22, 0.28, 0.34], hs: '5', a: 70, tilt: 30, face: 95 },
    { t: 1.28, p: [0.05, 0.4, 0.54], a: 70, tilt: 72, face: 12 },
    { t: 1.36, p: [0.05, 0.415, 0.54] },
    { t: 1.8, p: [0.05, 0.41, 0.54] },
  ],
  n: [
    { t: 0, ...PASSIVE },
    { t: 0.55, ...PASSIVE },
    { t: 0.92, p: [0.18, 0.54, 0.36], hs: '5', a: 62, tilt: 62, face: 150 },
    { t: 1.28, p: [0.15, 0.56, 0.42], a: 62, tilt: 74, face: 175 },
    { t: 1.8, p: [0.15, 0.56, 0.42] },
  ],
  h: [
    { t: 0, yaw: -3, roll: -2 },
    { t: 0.55, yaw: -3, roll: -2 },
    { t: 1.0, yaw: 0, roll: 0, pitch: -2 },
    { t: 1.38, yaw: 3, roll: 6, pitch: 4, dy: -0.01 },
    { t: 1.8, yaw: 3, roll: 7, pitch: 5, dy: -0.012 },
  ],
};

// ---------------------------------------------------------------- student phrase (hero loop)

const can: ClipDef = {
  dur: 1.0,
  d: [
    { t: 0, p: [0.28, 0.26, 0.42], hs: 'S', a: 30, tilt: 80, face: 0 },
    { t: 0.32, p: [0.28, 0.5, 0.45] },
    { t: 0.52, p: [0.28, 0.42, 0.45] },
    { t: 0.78, p: [0.28, 0.56, 0.45] },
    { t: 1.0, p: [0.28, 0.55, 0.45] },
  ],
  n: [
    { t: 0, p: [0.28, 0.26, 0.42], hs: 'S', a: 30, tilt: 80, face: 0 },
    { t: 0.32, p: [0.28, 0.5, 0.45] },
    { t: 0.52, p: [0.28, 0.42, 0.45] },
    { t: 0.78, p: [0.28, 0.56, 0.45] },
    { t: 1.0, p: [0.28, 0.55, 0.45] },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.32, pitch: -5 },
    { t: 0.52, pitch: -1 },
    { t: 0.78, pitch: -5 },
    { t: 1.0, pitch: -3 },
  ],
};

const you: ClipDef = {
  dur: 0.9,
  d: [
    { t: 0, p: [0.26, 0.3, 0.38], hs: '1', a: 24, tilt: 62, face: 0 },
    { t: 0.38, p: [0.17, 0.25, 0.66], tilt: 74 },
    { t: 0.9, p: [0.17, 0.26, 0.64] },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.4, pitch: -3, yaw: 2 },
  ],
};

const thisClip: ClipDef = {
  dur: 1.0,
  n: [{ t: 0, p: [0.16, 0.6, 0.42], hs: 'B', a: 55, tilt: 80, face: 180 }],
  d: [
    { t: 0, p: [0.06, 0.12, 0.48], hs: '1', a: 172, tilt: 22, face: 0 },
    { t: 0.36, p: [0.03, 0.2, 0.5] },
    { t: 0.52, p: [0.03, 0.14, 0.5] },
    { t: 0.68, p: [0.03, 0.2, 0.5] },
    { t: 1.0, p: [0.03, 0.19, 0.5] },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.4, pitch: -6 },
  ],
};

const problem: ClipDef = {
  dur: 1.2,
  d: [
    { t: 0, p: [0.12, 0.38, 0.45], hs: 'bentV', a: 80, tilt: 20, face: 160 },
    { t: 0.3, a: 112, face: 140 },
    { t: 0.6, a: 62, face: 175 },
    { t: 0.9, a: 108, face: 145 },
    { t: 1.2, a: 82, face: 160 },
  ],
  n: [
    { t: 0, p: [0.12, 0.38, 0.45], hs: 'bentV', a: 80, tilt: 20, face: 160 },
    { t: 0.3, a: 52, face: 175 },
    { t: 0.6, a: 104, face: 140 },
    { t: 0.9, a: 58, face: 172 },
    { t: 1.2, a: 80, face: 160 },
  ],
  h: [{ t: 0, pitch: -3 }],
};

/** Two alternating forward circles (generated keys, passed through smoothly). */
function circles(phase: number): HK[] {
  const keys: HK[] = [{ t: 0, p: [0.22, 0.38 - 0.09 * Math.cos(phase), 0.44 + 0.1 * Math.sin(phase)], hs: 'F', a: 10, tilt: 62, face: 90 }];
  for (let i = 1; i <= 12; i++) {
    const th = phase + (i / 6) * Math.PI * 2;
    keys.push({ t: 0.1 * i, p: [0.22 + 0.03 * Math.sin(th), 0.38 - 0.09 * Math.cos(th), 0.44 + 0.1 * Math.sin(th)], thru: i < 12 });
  }
  keys.push({ t: 1.35, p: keys[keys.length - 1].p });
  return keys;
}
const explain: ClipDef = { dur: 1.35, d: circles(0), n: circles(Math.PI), h: [{ t: 0, pitch: -2 }] };

// ---------------------------------------------------------------- extras

const hello: ClipDef = {
  dur: 1.1,
  d: [
    { t: 0, p: [0.26, -0.44, 0.22], hs: 'B', a: 34, tilt: 8, face: 20 },
    { t: 0.3, p: [0.26, -0.45, 0.22] },
    { t: 0.78, p: [0.58, -0.4, 0.48], a: 12, face: 0 },
    { t: 1.1, p: [0.58, -0.4, 0.48] },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.8, pitch: -3, roll: 3 },
  ],
};

const thanks: ClipDef = {
  dur: 1.1,
  d: [
    { t: 0, p: [0.06, 0.14, 0.3], hs: 'B', a: 8, tilt: 10, face: 180 },
    { t: 0.28, p: [0.06, 0.13, 0.3] },
    { t: 0.8, p: [0.18, 0.32, 0.62], tilt: 74 },
    { t: 1.1, p: [0.18, 0.33, 0.62] },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.8, pitch: -6 },
    { t: 1.1, pitch: -4 },
  ],
};

/** The index draws a question mark that reads the right way round for the viewer. */
function questionKeys(): HK[] {
  const cx = 0.3;
  const cy = 0.06;
  const pts: [number, number][] = [
    [-0.09, -0.06],
    [-0.06, -0.14],
    [0.01, -0.17],
    [0.08, -0.13],
    [0.09, -0.05],
    [0.04, 0.01],
    [0.0, 0.05],
    [0.0, 0.13],
  ];
  // The dominant hand is mirrored, so a viewer-right offset is a smaller canonical x.
  const keys: HK[] = [{ t: 0, p: [cx + 0.09, cy - 0.06, 0.4], hs: '1', a: 0, tilt: 12, face: 0 }];
  pts.forEach(([dx, dy], i) => keys.push({ t: 0.15 + i * 0.11, p: [cx - dx, cy + dy, 0.4], thru: i > 0 && i < pts.length - 1 }));
  keys.push({ t: 1.1, p: [cx, cy + 0.17, 0.36] });
  keys.push({ t: 1.24, p: [cx, cy + 0.21, 0.48] });
  keys.push({ t: 1.4, p: [cx, cy + 0.21, 0.48] });
  return keys;
}
const question: ClipDef = { dur: 1.4, d: questionKeys(), h: [{ t: 0, pitch: 0 }, { t: 1.2, pitch: 3, roll: 5 }] };

const yes: ClipDef = {
  dur: 1.0,
  d: [
    { t: 0, p: [0.26, 0.18, 0.45], hs: 'S', a: 10, tilt: 20, face: 0 },
    { t: 0.25, p: [0.26, 0.21, 0.46], tilt: 70 },
    { t: 0.5, p: [0.26, 0.18, 0.45], tilt: 22 },
    { t: 0.75, p: [0.26, 0.21, 0.46], tilt: 70 },
    { t: 1.0, p: [0.26, 0.2, 0.45], tilt: 34 },
  ],
  h: [
    { t: 0, pitch: 0 },
    { t: 0.25, pitch: -6 },
    { t: 0.5, pitch: 0 },
    { t: 0.75, pitch: -6 },
    { t: 1.0, pitch: -1 },
  ],
};

/** Unknown gloss: a small neutral two-handed beat, so word indices stay in step. */
const generic: ClipDef = {
  dur: 0.9,
  d: [
    { t: 0, p: [0.26, 0.38, 0.4], hs: 'B', a: 40, tilt: 60, face: 90 },
    { t: 0.45, p: [0.3, 0.32, 0.5] },
    { t: 0.9, p: [0.3, 0.33, 0.5] },
  ],
  n: [
    { t: 0, p: [0.26, 0.38, 0.4], hs: 'B', a: 40, tilt: 60, face: 90 },
    { t: 0.45, p: [0.3, 0.32, 0.5] },
    { t: 0.9, p: [0.3, 0.33, 0.5] },
  ],
};

const DEFS: Record<string, ClipDef> = {
  which,
  step,
  not,
  understand,
  can,
  you,
  this: thisClip,
  problem,
  explain,
  hello,
  thanks,
  question,
  yes,
};

/** Gloss keys with their Georgian and English words. */
export const GLOSSES: Record<string, { ka: string; en: string }> = {
  which: { ka: 'რომელი', en: 'which' },
  step: { ka: 'ნაბიჯი', en: 'step' },
  not: { ka: 'ვერ', en: 'not' },
  understand: { ka: 'გაიგე', en: 'understand' },
  can: { ka: 'შეგიძლიათ', en: 'can' },
  you: { ka: 'თქვენ', en: 'you' },
  this: { ka: 'ეს', en: 'this' },
  problem: { ka: 'ამოცანა', en: 'problem' },
  explain: { ka: 'ამიხსნათ', en: 'explain' },
  hello: { ka: 'გამარჯობა', en: 'hello' },
  thanks: { ka: 'მადლობა', en: 'thanks' },
  question: { ka: 'კითხვა', en: 'question' },
  yes: { ka: 'დიახ', en: 'yes' },
};

/** One-line how-to for the teacher reply's signs (Georgian Sign Language dictionary entries). */
export const SIGN_NOTES: Record<string, { en: string }> = {
  which: { en: 'Palm up, fingers spread. Shake side to side at chest level.' },
  step: { en: 'Both palms down. The right hand arcs forward like a step.' },
  not: { en: 'Thumb and little finger out. Arc forward at face level.' },
  understand: { en: 'Index finger to the temple, then the right hand down onto the left palm.' },
};

// ---------------------------------------------------------------- compile

function handTrack(keys: HK[] | undefined, dur: number): Key[] {
  const src = keys && keys.length ? keys : [{ t: 0, ...PASSIVE }];
  let prev: HandPose = { ...PASSIVE };
  const out: Key[] = [];
  src.forEach((k, i) => {
    prev = { ...prev, ...k } as HandPose;
    out.push({ t: i === 0 ? 0 : k.t, v: handVec(prev), thru: k.thru });
  });
  if (out[out.length - 1].t < dur) out.push({ t: dur, v: handVec(prev) });
  return out;
}

function headTrack(keys: HdK[] | undefined, dur: number): Key[] {
  let prev: HeadPose = {};
  const out: Key[] = [];
  if (!keys || !keys.length || keys[0].t > 0) out.push({ t: 0, v: headVec({}) });
  (keys ?? []).forEach((k) => {
    prev = { ...prev, ...k };
    out.push({ t: k.t, v: headVec(prev), thru: k.thru });
  });
  if (out[out.length - 1].t < dur) out.push({ t: dur, v: headVec(prev) });
  return out;
}

const cache = new Map<string, CompiledClip>();
export function clipFor(key: string): CompiledClip {
  const k = DEFS[key] ? key : '_';
  let c = cache.get(k);
  if (!c) {
    const def = DEFS[k] ?? generic;
    c = { dur: def.dur, d: handTrack(def.d, def.dur), n: handTrack(def.n, def.dur), h: headTrack(def.h, def.dur) };
    cache.set(k, c);
  }
  return c;
}

/** Clip lengths at speed 1, in seconds. */
export const CLIP_SECONDS: Record<string, number> = Object.fromEntries(Object.entries(DEFS).map(([k, d]) => [k, d.dur]));

export const REST_POSE: PoseVecs = { d: handVec(IDLE_HAND), n: handVec(IDLE_HAND), h: headVec({}) };
