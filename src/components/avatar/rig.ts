/**
 * The signing avatar's skeleton: proportions, handshapes, 2-bone IK and keyframe tracks.
 *
 * Units are one shoulder width (S). Body space: x to the viewer's right, y down from the shoulder
 * line, z toward the viewer. Hand poses are authored "canonically": x is measured OUTWARD from the
 * midline, so one key fits either hand; the dominant hand (the avatar's right, on screen-left) is
 * mirrored. Everything is pure math on preallocated arrays, so a frame allocates nothing.
 */

export type V3 = [number, number, number];

// ---------------------------------------------------------------- proportions

const UPPER = 0.8; // shoulder to elbow
const FORE = 0.68; // elbow to wrist
const HAND = 1.1; // hand scale over anatomical size, so the fingers read on video
const CAM = 4.5; // camera distance for the soft perspective (nearer hands look a little bigger)
const CAM_Y = 0.3; // perspective centre (mid chest)
const HIP_Y = 1.3;
export const HEAD_RX = 0.2;
export const HEAD_RY = 0.25;

// ---------------------------------------------------------------- handshapes

/**
 * Canonical hand: the screen-right hand (the avatar's left), palm toward the viewer, fingers up,
 * thumb toward the midline (-x). Fingers are [angle°, mcp°, pip°, dip°]; flexion curls toward the
 * palm normal (+z). The thumb is three points (MCP, IP, tip) from its fixed CMC.
 */
const MCP: V3[] = [
  [-0.078, -0.235, 0],
  [-0.025, -0.25, 0],
  [0.027, -0.24, 0],
  [0.072, -0.215, 0],
];
const LEN = [
  [0.1, 0.06, 0.045],
  [0.11, 0.068, 0.048],
  [0.102, 0.064, 0.045],
  [0.082, 0.05, 0.04],
];
const CMC: V3 = [-0.06, -0.055, 0.01];

type Fingers = [number, number, number, number][];
const FIST: Fingers = [
  [-2, 88, 100, 55],
  [-1, 90, 102, 55],
  [1, 90, 102, 55],
  [3, 88, 100, 55],
];
const THUMB_ACROSS: V3[] = [
  [-0.07, -0.11, 0.08],
  [-0.03, -0.145, 0.115],
  [0.01, -0.155, 0.12],
];

const SHAPES_RAW = {
  rest: {
    f: [
      [-7, 14, 20, 10],
      [-2, 17, 24, 12],
      [3, 20, 27, 13],
      [9, 24, 30, 15],
    ] as Fingers,
    t: [
      [-0.1, -0.105, 0.035],
      [-0.122, -0.15, 0.05],
      [-0.128, -0.19, 0.062],
    ] as V3[],
  },
  B: {
    f: [
      [-3, 0, 3, 1],
      [-1, 0, 3, 1],
      [1, 0, 3, 1],
      [3, 0, 3, 1],
    ] as Fingers,
    t: [
      [-0.095, -0.115, 0.025],
      [-0.1, -0.17, 0.03],
      [-0.098, -0.213, 0.03],
    ] as V3[],
  },
  '5': {
    f: [
      [-15, 3, 4, 2],
      [-4, 2, 3, 2],
      [6, 3, 4, 2],
      [17, 4, 5, 2],
    ] as Fingers,
    t: [
      [-0.115, -0.1, 0.02],
      [-0.155, -0.14, 0.025],
      [-0.185, -0.175, 0.025],
    ] as V3[],
  },
  S: {
    f: FIST,
    t: [
      [-0.07, -0.11, 0.08],
      [-0.03, -0.15, 0.12],
      [0.015, -0.165, 0.13],
    ] as V3[],
  },
  /** Fist with the thumb raised (reads as "thumb up" once the hand is turned). */
  A: {
    f: FIST,
    t: [
      [-0.1, -0.1, 0.03],
      [-0.15, -0.125, 0.035],
      [-0.19, -0.14, 0.035],
    ] as V3[],
  },
  '1': {
    f: [[-3, 0, 2, 0], FIST[1], FIST[2], FIST[3]] as Fingers,
    t: THUMB_ACROSS,
  },
  V: {
    f: [[-11, 0, 2, 0], [7, 0, 2, 0], FIST[2], FIST[3]] as Fingers,
    t: THUMB_ACROSS,
  },
  bentV: {
    f: [[-11, 25, 80, 40], [7, 25, 80, 40], FIST[2], FIST[3]] as Fingers,
    t: THUMB_ACROSS,
  },
  /** Thumb and little finger out, the other three closed. */
  Y: {
    f: [FIST[0], FIST[1], FIST[2], [24, 0, 4, 2]] as Fingers,
    t: [
      [-0.11, -0.095, 0.02],
      [-0.162, -0.12, 0.025],
      [-0.205, -0.14, 0.025],
    ] as V3[],
  },
  F: {
    f: [
      [-4, 45, 62, 38],
      [-1, 0, 2, 1],
      [7, 0, 2, 1],
      [15, 2, 3, 1],
    ] as Fingers,
    t: null as unknown as V3[], // closed onto the index tip below
  },
  C: {
    f: [
      [-5, 32, 40, 22],
      [-1, 34, 42, 22],
      [3, 34, 42, 22],
      [8, 32, 40, 22],
    ] as Fingers,
    t: [
      [-0.1, -0.1, 0.05],
      [-0.118, -0.135, 0.1],
      [-0.11, -0.16, 0.145],
    ] as V3[],
  },
};

export type Shape = keyof typeof SHAPES_RAW;
const D2R = Math.PI / 180;

/** One finger chain in the canonical hand frame. Writes MCP, PIP, DIP, TIP (12 floats) at `o`. */
function finger(i: number, ang: number, c1: number, c2: number, c3: number, out: Float32Array, o: number) {
  const dx = Math.sin(ang * D2R);
  const dy = -Math.cos(ang * D2R);
  let x = MCP[i][0];
  let y = MCP[i][1];
  let z = MCP[i][2];
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = z;
  let th = 0;
  const cs = [c1, c2, c3];
  for (let k = 0; k < 3; k++) {
    th += cs[k] * D2R;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const L = LEN[i][k];
    x += L * dx * c;
    y += L * dy * c;
    z += L * s;
    out[o + 3 + k * 3] = x;
    out[o + 4 + k * 3] = y;
    out[o + 5 + k * 3] = z;
  }
}

// F: the thumb tip meets the curled index tip.
{
  const tmp = new Float32Array(12);
  const f = SHAPES_RAW.F.f[0];
  finger(0, f[0], f[1], f[2], f[3], tmp, 0);
  const tip: V3 = [tmp[9] - 0.004, tmp[10] + 0.006, tmp[11] + 0.012];
  const mcp: V3 = [-0.1, -0.11, 0.05];
  const ip: V3 = [(mcp[0] + tip[0]) / 2 - 0.028, (mcp[1] + tip[1]) / 2, (mcp[2] + tip[2]) / 2 + 0.025];
  SHAPES_RAW.F.t = [mcp, ip, tip];
}

/** Shape vector: 16 finger values then 9 thumb values. */
export const SHAPE_N = 25;
export const SHAPES = Object.fromEntries(
  Object.entries(SHAPES_RAW).map(([k, s]) => [k, [...s.f.flat(), ...s.t.flat()]]),
) as Record<Shape, number[]>;

// ---------------------------------------------------------------- pose vectors

/** A hand key: wrist target, handshape, and orientation in degrees. */
export type HandPose = {
  /** Wrist [outward, down, forward] in shoulder widths, from the shoulder-line midpoint. */
  p: V3;
  hs: Shape;
  /** In-plane rotation: 0 = fingers up, 90 = fingers toward the midline, 180 = down. */
  a?: number;
  /** Pitch of the fingers toward the viewer: 90 = pointing at the camera. */
  tilt?: number;
  /** Roll about the hand axis: 0 = palm to the viewer, 90 = palm to the midline, 180 = palm to the signer. */
  face?: number;
};
export type HeadPose = { yaw?: number; pitch?: number; roll?: number; dx?: number; dy?: number };

export const HAND_N = 6 + SHAPE_N; // 31
export const HEAD_N = 5;

export function handVec(h: HandPose): Float32Array {
  const v = new Float32Array(HAND_N);
  v[0] = h.p[0];
  v[1] = h.p[1];
  v[2] = h.p[2];
  v[3] = h.a ?? 0;
  v[4] = h.tilt ?? 0;
  v[5] = h.face ?? 0;
  v.set(SHAPES[h.hs], 6);
  return v;
}
export function headVec(h: HeadPose): Float32Array {
  return Float32Array.from([h.yaw ?? 0, h.pitch ?? 0, h.roll ?? 0, h.dx ?? 0, h.dy ?? 0]);
}

// ---------------------------------------------------------------- tracks

export type Key = { t: number; v: Float32Array; thru?: boolean };
export type CompiledClip = { dur: number; d: Key[]; n: Key[]; h: Key[] };
export type Track = { t: number[]; v: Float32Array[]; m: (Float32Array | null)[] };
export type Timeline = { d: Track; n: Track; h: Track; words: number[]; signEnd: number; end: number };
export type PoseVecs = { d: Float32Array; n: Float32Array; h: Float32Array };

const track = (): Track => ({ t: [], v: [], m: [] });

/**
 * Lays the clips end to end. Each track eases from its last key into the next clip's first key over
 * the transition (which also gives the ~150 ms breath between words), then back to `rest`.
 */
export function buildTimeline(clips: CompiledClip[], from: PoseVecs, rest: PoseVecs, restIn = 0.5): Timeline {
  const tr = { d: track(), n: track(), h: track() };
  const thru: Record<'d' | 'n' | 'h', boolean[]> = { d: [], n: [], h: [] };
  const push = (k: 'd' | 'n' | 'h', t: number, v: Float32Array, th = false) => {
    tr[k].t.push(t);
    tr[k].v.push(v);
    thru[k].push(th);
  };
  (['d', 'n', 'h'] as const).forEach((k) => push(k, 0, Float32Array.from(from[k])));
  const words: number[] = [];
  let cursor = 0;
  clips.forEach((c, i) => {
    words.push(cursor);
    const off = cursor + (i === 0 ? 0.36 : 0.27);
    (['d', 'n', 'h'] as const).forEach((k) => c[k].forEach((key) => push(k, off + key.t, key.v, key.thru)));
    cursor = off + c.dur;
  });
  const signEnd = cursor;
  const end = cursor + restIn;
  (['d', 'n', 'h'] as const).forEach((k) => push(k, end, rest[k]));
  // Tangents: zero (ease in-out stop) unless a key is marked `thru` (continuous paths, circles).
  (['d', 'n', 'h'] as const).forEach((k) => {
    const T = tr[k];
    for (let i = 0; i < T.t.length; i++) {
      if (!thru[k][i] || i === 0 || i === T.t.length - 1) {
        T.m.push(null);
        continue;
      }
      const a = T.v[i - 1];
      const b = T.v[i + 1];
      const dt = T.t[i + 1] - T.t[i - 1];
      const m = new Float32Array(a.length);
      for (let j = 0; j < a.length; j++) m[j] = (b[j] - a[j]) / dt;
      T.m.push(m);
    }
  });
  return { ...tr, words, signEnd, end };
}

/** Cubic Hermite per channel; zero tangents give a smooth ease in-out between keys. */
export function evalTrack(T: Track, t: number, out: Float32Array) {
  const n = T.t.length;
  if (t <= T.t[0]) return void out.set(T.v[0]);
  if (t >= T.t[n - 1]) return void out.set(T.v[n - 1]);
  let i = 0;
  while (i < n - 2 && t >= T.t[i + 1]) i++;
  const t0 = T.t[i];
  const h = T.t[i + 1] - t0;
  if (h <= 1e-6) return void out.set(T.v[i + 1]);
  const s = (t - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const a = T.v[i];
  const b = T.v[i + 1];
  const ma = T.m[i];
  const mb = T.m[i + 1];
  for (let j = 0; j < out.length; j++) {
    out[j] = h00 * a[j] + h01 * b[j] + (ma ? h10 * h * ma[j] : 0) + (mb ? h11 * h * mb[j] : 0);
  }
}

export function evalTimeline(tl: Timeline, t: number, out: PoseVecs) {
  evalTrack(tl.d, t, out.d);
  evalTrack(tl.n, t, out.n);
  evalTrack(tl.h, t, out.h);
}

// ---------------------------------------------------------------- solve

/** Projected 2D points in body units (x right, y down). */
export type Frame = {
  /** 0 neck base, 1 head bottom, 2 shoulder L, 3 shoulder R, 4 elbow L, 5 elbow R. */
  body: Float32Array;
  /** Torso outline per side: neck side, trapezius, shoulder tip | armpit, ribs, waist, hip. L then R. */
  torso: Float32Array;
  /** 21 MediaPipe-order landmarks per hand. [0] = screen-left (dominant), [1] = screen-right. */
  hands: [Float32Array, Float32Array];
  handZ: [number, number];
  /** cx, cy, rx, ry, rotation° */
  head: Float32Array;
  /** Face meridian (7 points) then brow line (7 points). */
  face: Float32Array;
};

export function newFrame(): Frame {
  return {
    body: new Float32Array(12),
    torso: new Float32Array(28),
    hands: [new Float32Array(42), new Float32Array(42)],
    handZ: [0, 0],
    head: new Float32Array(5),
    face: new Float32Array(28),
  };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

// scratch
const L = new Float32Array(63);
const P3 = new Float32Array(3);
let swC = 1,
  swS = 0,
  rlC = 1,
  rlS = 0;

/** Body sway (yaw about the spine, roll about the hips) then the soft perspective. Writes 2D at o. */
function place(x: number, y: number, z: number, out: Float32Array, o: number) {
  // yaw
  const x1 = x * swC + z * swS;
  const z1 = -x * swS + z * swC;
  // roll about the hip centre
  const yy = y - HIP_Y;
  const x2 = x1 * rlC - yy * rlS;
  const y2 = x1 * rlS + yy * rlC + HIP_Y;
  const k = CAM / (CAM - z1);
  out[o] = x2 * k;
  out[o + 1] = CAM_Y + (y2 - CAM_Y) * k;
  return z1;
}

/** 2-bone IK in 3D with a pole pulling the elbow out, down and slightly back. Writes elbow + wrist. */
function solveArm(sx: number, sy: number, sz: number, tx: number, ty: number, tz: number, out: Float32Array) {
  let dx = tx - sx;
  let dy = ty - sy;
  let dz = tz - sz;
  let d = Math.hypot(dx, dy, dz) || 1e-6;
  const maxD = (UPPER + FORE) * 0.995;
  const minD = Math.abs(UPPER - FORE) + 0.02;
  const cd = Math.min(maxD, Math.max(minD, d));
  const ux = dx / d;
  const uy = dy / d;
  const uz = dz / d;
  d = cd;
  // pole: outward, down, back; remove the component along u
  let px = 0.3,
    py = 1,
    pz = -0.35;
  const pu = px * ux + py * uy + pz * uz;
  px -= pu * ux;
  py -= pu * uy;
  pz -= pu * uz;
  const pl = Math.hypot(px, py, pz) || 1e-6;
  px /= pl;
  py /= pl;
  pz /= pl;
  const cosA = (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  out[0] = sx + UPPER * (cosA * ux + sinA * px);
  out[1] = sy + UPPER * (cosA * uy + sinA * py);
  out[2] = sz + UPPER * (cosA * uz + sinA * pz);
  out[3] = sx + ux * d;
  out[4] = sy + uy * d;
  out[5] = sz + uz * d;
}

const ARM = new Float32Array(6);
const TORSO_PTS: [number, number][] = [
  [0.09, -0.17],
  [0.3, -0.05],
  [0.53, 0.03],
  [0.47, 0.33],
  [0.43, 0.62],
  [0.37, 0.92],
  [0.41, 1.3],
];

/**
 * Turns the three pose vectors into a frame. `tt` is wall time (seconds) for breathing and the
 * tiny idle drift; `act` (0..1) scales that drift (smaller while signing).
 */
export function solve(pose: PoseVecs, tt: number, act: number, fr: Frame) {
  const TAU = Math.PI * 2;
  const breath = Math.sin((tt * TAU) / 4.2);
  const dv = pose.d;
  const nv = pose.n;
  const hv = pose.h;

  // body sway: the dominant shoulder turns forward when its hand reaches forward
  const yaw = Math.max(-5, Math.min(5, 5 * (dv[2] - nv[2]))) + act * 0.6 * Math.sin((tt * TAU) / 8.3);
  const roll = 0.5 * Math.sin((tt * TAU) / 7.3 + 1.2) + 1.2 * (smooth((0.2 - dv[1]) / 0.7) - smooth((0.2 - nv[1]) / 0.7));
  swC = Math.cos(yaw * D2R);
  swS = Math.sin(yaw * D2R);
  rlC = Math.cos(roll * D2R);
  rlS = Math.sin(roll * D2R);

  const lift = -0.006 * breath;
  place(0, -0.03 + lift, 0, fr.body, 0);

  for (let hi = 0; hi < 2; hi++) {
    const side = hi === 0 ? -1 : 1;
    const v = hi === 0 ? dv : nv;
    const rise = 0.05 * smooth((0.05 - v[1]) / 0.55) - lift;
    const fwd = 0.05 * smooth((v[2] - 0.3) / 0.4);
    const sy = -rise;
    place(side * 0.5, sy, fwd, fr.body, 4 + hi * 2);
    solveArm(0.5, sy, fwd, v[0], v[1], v[2], ARM);
    place(side * ARM[0], ARM[1], ARM[2], fr.body, 8 + hi * 2);
    const wx = ARM[3];
    const wy = ARM[4];
    const wz = ARM[5];

    // torso outline for this side
    for (let k = 0; k < 7; k++) {
      const [tx, ty] = TORSO_PTS[k];
      place(side * tx, k < 3 ? ty - rise * (k / 2) * 0.8 : ty, 0, fr.torso, hi * 14 + k * 2);
    }

    // hand: local points
    for (let f = 0; f < 4; f++) {
      const o = 6 + f * 4;
      finger(f, v[o], v[o + 1], v[o + 2], v[o + 3], L, 15 + f * 12);
    }
    L[0] = 0;
    L[1] = 0;
    L[2] = 0;
    L[3] = CMC[0];
    L[4] = CMC[1];
    L[5] = CMC[2];
    for (let k = 0; k < 9; k++) L[6 + k] = v[22 + k];

    // rotation R = Rz(-a) · Rx(-tilt) · Ry(-face)
    const fa = -v[5] * D2R;
    const ta = -v[4] * D2R;
    const aa = -v[3] * D2R;
    const cf = Math.cos(fa),
      sf = Math.sin(fa),
      ct = Math.cos(ta),
      st = Math.sin(ta),
      ca = Math.cos(aa),
      sa = Math.sin(aa);
    const out = fr.hands[hi];
    let zSum = 0;
    for (let p = 0; p < 21; p++) {
      let x = L[p * 3] * HAND;
      let y = L[p * 3 + 1] * HAND;
      let z = L[p * 3 + 2] * HAND;
      // Ry
      let x1 = x * cf + z * sf;
      let z1 = -x * sf + z * cf;
      x = x1;
      z = z1;
      // Rx
      const y1 = y * ct - z * st;
      z1 = y * st + z * ct;
      y = y1;
      z = z1;
      // Rz
      x1 = x * ca - y * sa;
      const y2 = x * sa + y * ca;
      zSum += place(side * (wx + x1), wy + y2, wz + z, out, p * 2);
    }
    fr.handZ[hi] = zSum / 21;
  }

  // head: rotates about the top of the neck
  const hy = (hv[0] + act * (1.6 * Math.sin((tt * TAU) / 6.3) + 0.6 * Math.sin((tt * TAU) / 2.9 + 1))) * D2R;
  const hp = (hv[1] + act * 0.9 * Math.sin((tt * TAU) / 5.1 + 2)) * D2R;
  const hr = (hv[2] + act * 0.8 * Math.sin((tt * TAU) / 7.7 + 0.5)) * D2R;
  const cy_ = Math.cos(hy),
    sy_ = Math.sin(hy),
    cp = Math.cos(hp),
    sp = Math.sin(hp),
    cr = Math.cos(hr),
    sr = Math.sin(hr);
  // R = Rz(roll) · Rx(pitch) · Ry(yaw), applied to a head-local vector into P3
  const rot = (x: number, y: number, z: number) => {
    const x1 = x * cy_ + z * sy_;
    const z1 = -x * sy_ + z * cy_;
    const y1 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    P3[0] = x1 * cr - y1 * sr;
    P3[1] = x1 * sr + y1 * cr;
    P3[2] = z2;
  };
  const pvx = hv[3];
  const pvy = -0.3 + hv[4] + lift;
  rot(0, -0.28, 0.04);
  const hcx = pvx + P3[0];
  const hcy = pvy + P3[1];
  const hcz = P3[2];
  place(hcx, hcy, hcz, fr.head, 0);
  const k = CAM / (CAM - hcz);
  fr.head[2] = HEAD_RX * k;
  fr.head[3] = HEAD_RY * k;
  fr.head[4] = (hr * 180) / Math.PI + roll;
  rot(0, HEAD_RY * 0.96, -0.02);
  place(hcx + P3[0], hcy + P3[1], hcz + P3[2], fr.body, 2);

  // face: a faint meridian and brow line on the head ellipsoid, so turns and nods read
  const RZ = 0.2;
  for (let i = 0; i < 7; i++) {
    const lat = (-55 + i * 20) * D2R;
    rot(0, -HEAD_RY * Math.sin(lat), RZ * Math.cos(lat));
    place(hcx + P3[0], hcy + P3[1], hcz + P3[2], fr.face, i * 2);
    const lon = (-60 + i * 20) * D2R;
    const bl = 14 * D2R;
    rot(HEAD_RX * Math.cos(bl) * Math.sin(lon), -HEAD_RY * Math.sin(bl), RZ * Math.cos(bl) * Math.cos(lon));
    place(hcx + P3[0], hcy + P3[1], hcz + P3[2], fr.face, 14 + i * 2);
  }
}
