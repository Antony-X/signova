/**
 * What the canvas draws: smoothed body, hands, face contour, motion trails and the focus frame.
 *
 * Landmarks pass a one-euro filter at inference rate, then the drawn points chase the filtered
 * ones at display rate (40 ms), so a 15-30 Hz tracker still moves smoothly on a 60 Hz screen.
 * Every part fades in and out instead of popping, so a missed frame never flickers.
 */

import type { Detection, Edge, Lm } from './pose-engine.web';

const TAU = Math.PI * 2;
/** Upper body only: shoulders, arms, torso. The hand model draws the hands, the face model the face. */
const BODY_EDGES: Edge[] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];
const ARM_JOINTS = [11, 12, 13, 14, 15, 16];
const TIPS = [4, 8, 12, 16, 20];
const MOTION_PTS = [0, 4, 8, 12, 16, 20];
const BOX_PTS = [0, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const lime = (a: number) => `rgba(218,250,156,${a.toFixed(3)})`;
const white = (a: number) => `rgba(255,255,255,${a.toFixed(3)})`;
const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** One-euro filter over n 2D points (normalized coords, t in seconds). Speed is measured in frame heights/s. */
class Euro {
  x: Float32Array;
  dx: Float32Array;
  t = -1;
  constructor(readonly n: number, readonly minCut: number, readonly beta: number) {
    this.x = new Float32Array(n * 2);
    this.dx = new Float32Array(n * 2);
  }
  step(src: Lm[], idx: number[] | null, t: number, ax: number) {
    const { x, dx, n } = this;
    if (this.t < 0) {
      for (let i = 0; i < n; i++) {
        const p = src[idx ? idx[i] : i];
        x[i * 2] = p.x;
        x[i * 2 + 1] = p.y;
      }
      dx.fill(0);
      this.t = t;
      return;
    }
    const dt = Math.max(t - this.t, 1e-3);
    this.t = t;
    const aD = 1 / (1 + 1 / (TAU * 1.0 * dt));
    for (let i = 0; i < n; i++) {
      const p = src[idx ? idx[i] : i];
      const j = i * 2;
      const vx = (dx[j] += aD * ((p.x - x[j]) / dt - dx[j]));
      const vy = (dx[j + 1] += aD * ((p.y - x[j + 1]) / dt - dx[j + 1]));
      const cut = this.minCut + this.beta * Math.hypot(vx * ax, vy);
      const a = 1 / (1 + 1 / (TAU * cut * dt));
      x[j] += a * (p.x - x[j]);
      x[j + 1] += a * (p.y - x[j + 1]);
    }
  }
  /** Mean speed (frame heights per second) over some points. */
  speed(pts: number[], ax: number) {
    let s = 0;
    for (const i of pts) s += Math.hypot(this.dx[i * 2] * ax, this.dx[i * 2 + 1]);
    return s / pts.length;
  }
}

/** A tracked set of points with a presence fade. `hold` is how long a missed detection keeps it lit. */
class Track {
  euro: Euro;
  pos: Float32Array;
  vis: Float32Array;
  visT: Float32Array;
  seen = -1e9;
  a = 0;
  constructor(readonly n: number, minCut: number, beta: number, readonly hold: number, readonly idx: number[] | null = null) {
    this.euro = new Euro(n, minCut, beta);
    this.pos = new Float32Array(n * 2);
    this.vis = new Float32Array(n);
    this.visT = new Float32Array(n);
  }
  feed(lm: Lm[], t: number, ax: number) {
    const fresh = t - this.seen > Math.max(0.35, this.hold) || this.a < 0.02;
    if (fresh) this.euro.t = -1;
    this.euro.step(lm, this.idx, t, ax);
    for (let i = 0; i < this.n; i++) {
      const v = lm[this.idx ? this.idx[i] : i].visibility;
      this.visT[i] = v == null || Number.isNaN(v) ? 1 : clamp((v - 0.4) / 0.35, 0, 1);
    }
    if (fresh) {
      this.pos.set(this.euro.x);
      this.vis.set(this.visT);
    }
    this.seen = t;
  }
  tick(t: number, dt: number) {
    const k = ease(dt, 0.04);
    const { pos, euro, vis, visT } = this;
    for (let j = 0; j < pos.length; j++) pos[j] += (euro.x[j] - pos[j]) * k;
    const kv = ease(dt, 0.12);
    for (let i = 0; i < vis.length; i++) vis[i] += (visT[i] - vis[i]) * kv;
    const on = t - this.seen < this.hold;
    this.a += ((on ? 1 : 0) - this.a) * ease(dt, on ? 0.09 : 0.2);
  }
  get live() {
    return this.a > 0.5;
  }
}

type TrailPt = { x: number; y: number; t: number };
class Hand extends Track {
  trails: TrailPt[][] = [[], []];
  gesture?: { name: string; score: number };
  constructor() {
    super(21, 1.4, 6, 0.2);
  }
}

export type SceneView = {
  W: number;
  H: number;
  vw: number;
  vh: number;
  focus: boolean;
  face: boolean;
  /** Keep the focus frame clear of the HUD rows. */
  safeTop: number;
  safeBottom: number;
};
export type SceneOut = { tag: { x: number; y: number; a: number } | null };
export type SceneStats = { body: number; hands: number; face: number; motion: number; gesture?: { name: string; score: number } };

export class Scene {
  body = new Track(33, 1.0, 5, 0.3);
  hands = [new Hand(), new Hand()];
  face: Track | null = null;
  motion = 0;
  private faceEdges: Edge[] = [];
  private box = { x0: 0, y0: 0, x1: 0, y1: 0, ok: false };
  private focusA = 0;
  private lastDraw = 0;
  private lastFeed = 0;

  setFaceEdges(edges: Edge[]) {
    if (this.face) return;
    const ids = [...new Set(edges.flat())];
    const at = new Map(ids.map((id, i) => [id, i]));
    this.faceEdges = edges.map(([a, b]) => [at.get(a)!, at.get(b)!] as const);
    this.face = new Track(ids.length, 1.2, 5, 0.45, ids);
  }

  reset() {
    for (const tr of [this.body, ...this.hands, this.face]) {
      if (!tr) continue;
      tr.a = 0;
      tr.seen = -1e9;
    }
    this.hands.forEach((h) => (h.trails = [[], []]));
    this.motion = 0;
  }

  /** Feed one inference result. t in seconds; ax = video width / height. */
  feed(d: Detection, t: number, ax: number) {
    if (d.pose) this.body.feed(d.pose, t, ax);
    if (d.face && this.face) this.face.feed(d.face, t, ax);

    // Keep hand identity: match detections to the two slots by wrist distance.
    const slots = this.hands;
    const near = (h: Hand, lm: Lm[]) =>
      t - h.seen < 0.5 ? Math.hypot((h.euro.x[0] - lm[0].x) * ax, h.euro.x[1] - lm[0].y) : 9;
    let order = d.hands.map((_, i) => i);
    if (d.hands.length === 2) {
      const [p, q] = d.hands;
      const keep = near(slots[0], p.lm) + near(slots[1], q.lm);
      const swap = near(slots[0], q.lm) + near(slots[1], p.lm);
      order = swap < keep ? [1, 0] : [0, 1];
    } else if (d.hands.length === 1) {
      order = near(slots[1], d.hands[0].lm) < near(slots[0], d.hands[0].lm) ? [-1, 0] : [0];
    }
    order.forEach((di, si) => {
      if (di < 0) return;
      const h = slots[si];
      const hit = d.hands[di];
      h.feed(hit.lm, t, ax);
      h.gesture = hit.gesture;
    });

    // Motion energy: wrist + fingertip speed of the busiest hand, eased.
    let s = 0;
    for (const h of slots) if (t - h.seen < 0.05) s = Math.max(s, h.euro.speed(MOTION_PTS, ax));
    const raw = 1 - Math.exp(-s / 0.55);
    const dt = this.lastFeed ? Math.min(t - this.lastFeed, 0.25) : 0.033;
    this.lastFeed = t;
    this.motion += (raw - this.motion) * ease(dt, 0.35);
  }

  stats(faceOn: boolean): SceneStats {
    const live = this.hands.filter((h) => h.live);
    const g = live.map((h) => h.gesture).filter((x) => !!x).sort((p, q) => q!.score - p!.score)[0];
    return {
      body: this.body.live ? 33 : 0,
      hands: live.length,
      face: faceOn && this.face?.live ? 478 : 0,
      motion: live.length ? this.motion : this.motion * 0.5,
      gesture: g,
    };
  }

  get empty() {
    return this.body.a < 0.1 && this.hands.every((h) => h.a < 0.1);
  }

  draw(ctx: CanvasRenderingContext2D, v: SceneView, now: number): SceneOut {
    const dt = this.lastDraw ? clamp(now - this.lastDraw, 0, 0.1) : 0.016;
    this.lastDraw = now;
    const { W, H, vw, vh, focus } = v;
    ctx.clearRect(0, 0, W, H);
    if (!vw || !vh) return { tag: null };

    // object-fit: cover, mirrored: the same crop as the <video> under the canvas.
    const s = Math.max(W / vw, H / vh);
    const dw = vw * s;
    const dh = vh * s;
    const ox = (W - dw) / 2;
    const oy = (H - dh) / 2;
    const X = (nx: number) => ox + (1 - nx) * dw;
    const Y = (ny: number) => oy + ny * dh;

    this.body.tick(now, dt);
    this.hands.forEach((h) => h.tick(now, dt));
    this.face?.tick(now, dt);
    this.focusA += ((focus ? 1 : 0) - this.focusA) * ease(dt, 0.18);
    const fa = this.focusA;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ---- face: a sparse contour, hairlines at low opacity
    const fc = this.face;
    if (v.face && fc && fc.a > 0.01) {
      const p = fc.pos;
      ctx.strokeStyle = white((0.26 + 0.1 * fa) * fc.a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [a, b] of this.faceEdges) {
        ctx.moveTo(X(p[a * 2]), Y(p[a * 2 + 1]));
        ctx.lineTo(X(p[b * 2]), Y(p[b * 2 + 1]));
      }
      ctx.stroke();
    }

    // ---- body
    const bd = this.body;
    const bp = bd.pos;
    const handWrist = (i: number): [number, number] | null => {
      // Join a forearm to the hand model's wrist when that hand sits at this pose wrist.
      let best: [number, number] | null = null;
      let bestD = 0.09;
      for (const h of this.hands) {
        if (h.a < 0.3) continue;
        const d = Math.hypot((h.pos[0] - bp[i * 2]) * (vw / vh), h.pos[1] - bp[i * 2 + 1]);
        if (d < bestD) {
          bestD = d;
          best = [X(h.pos[0]), Y(h.pos[1])];
        }
      }
      return best;
    };
    if (bd.a > 0.01) {
      const P = (i: number): [number, number] => (i === 15 || i === 16 ? handWrist(i) : null) ?? [X(bp[i * 2]), Y(bp[i * 2 + 1])];
      // A joint counts when the model sees it and it sits inside the picture (hips are often below it).
      const inFrame = (i: number) => clamp((0.985 - bp[i * 2 + 1]) / 0.04, 0, 1) * bd.vis[i];
      ctx.lineWidth = 3;
      for (const [a, b] of BODY_EDGES) {
        const al = bd.a * Math.min(inFrame(a), inFrame(b));
        if (al < 0.02) continue;
        const [x0, y0] = P(a);
        const [x1, y1] = P(b);
        ctx.strokeStyle = lime(0.85 * al);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      // Neck: from between the shoulders most of the way to the nose.
      const na = bd.a * Math.min(bd.vis[11], bd.vis[12], bd.vis[0]);
      if (na > 0.02) {
        const mx = (bp[22] + bp[24]) / 2;
        const my = (bp[23] + bp[25]) / 2;
        ctx.strokeStyle = lime(0.85 * na);
        ctx.beginPath();
        ctx.moveTo(X(mx), Y(my));
        ctx.lineTo(X(mx + (bp[0] - mx) * 0.6), Y(my + (bp[1] - my) * 0.6));
        ctx.stroke();
      }
      for (const i of [23, 24]) dot(ctx, X(bp[i * 2]), Y(bp[i * 2 + 1]), 4, bd.a * inFrame(i));
      for (const i of ARM_JOINTS) {
        if ((i === 15 || i === 16) && handWrist(i)) continue;
        dot(ctx, X(bp[i * 2]), Y(bp[i * 2 + 1]), 4, bd.a * inFrame(i));
      }
    }

    // ---- hands: trails under the bones. They sample the drawn (smoothed) wrist and index tip
    // every display frame, so they curve cleanly.
    const trailDur = 0.75 + 0.25 * fa;
    for (const h of this.hands) {
      for (let k = 0; k < 2; k++) {
        const tr = h.trails[k];
        const j = k === 1 ? 16 : 0;
        if (h.a > 0.3) tr.push({ x: h.pos[j], y: h.pos[j + 1], t: now });
        while (tr.length && now - tr[0].t > trailDur) tr.shift();
        if (tr.length < 3) continue;
        const base = (k === 1 ? 0.9 : 0.55) * h.a;
        for (let i = 1; i < tr.length; i++) {
          const f = clamp(1 - (now - tr[i].t) / trailDur, 0, 1);
          if (f <= 0) continue;
          ctx.strokeStyle = lime(base * Math.pow(f, 1.3));
          ctx.lineWidth = 0.75 + 2.25 * f;
          ctx.beginPath();
          ctx.moveTo(X(tr[i - 1].x), Y(tr[i - 1].y));
          ctx.lineTo(X(tr[i].x), Y(tr[i].y));
          ctx.stroke();
        }
      }
    }
    for (const h of this.hands) {
      if (h.a < 0.01) continue;
      const p = h.pos;
      ctx.strokeStyle = lime(h.a);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [a, b] of HAND_EDGES) {
        ctx.moveTo(X(p[a * 2]), Y(p[a * 2 + 1]));
        ctx.lineTo(X(p[b * 2]), Y(p[b * 2 + 1]));
      }
      ctx.stroke();
      for (let i = 0; i < 21; i++) dot(ctx, X(p[i * 2]), Y(p[i * 2 + 1]), TIPS.includes(i) ? 5 : 3.5, h.a);
    }

    // ---- focus frame: eased corner brackets around the upper body
    let tag: SceneOut['tag'] = null;
    const tgt = this.targetBox(X, Y, v);
    const b = this.box;
    if (tgt) {
      if (!b.ok) Object.assign(b, tgt, { ok: true });
      const k = ease(dt, 0.22);
      b.x0 += (tgt.x0 - b.x0) * k;
      b.y0 += (tgt.y0 - b.y0) * k;
      b.x1 += (tgt.x1 - b.x1) * k;
      b.y1 += (tgt.y1 - b.y1) * k;
    }
    const people = Math.max(bd.a, ...this.hands.map((h) => h.a));
    if (!tgt && people < 0.02) b.ok = false;
    const ba = fa * people;
    if (b.ok && ba > 0.01) {
      const grow = (1 - fa) * 10; // settles inward as focus eases in
      const x0 = b.x0 - grow;
      const y0 = b.y0 - grow;
      const x1 = b.x1 + grow;
      const y1 = b.y1 + grow;
      const L = clamp(0.14 * Math.min(x1 - x0, y1 - y0), 14, 34);
      ctx.strokeStyle = lime(0.95 * ba);
      ctx.lineWidth = 2;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      for (const [cx, cy, sx, sy] of [
        [x0, y0, 1, 1],
        [x1, y0, -1, 1],
        [x0, y1, 1, -1],
        [x1, y1, -1, -1],
      ]) {
        ctx.moveTo(cx, cy + sy * L);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + sx * L, cy);
      }
      ctx.stroke();
      tag = { x: x0, y: y0, a: ba };
    }
    return { tag };
  }

  private targetBox(X: (n: number) => number, Y: (n: number) => number, v: SceneView) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let n = 0;
    const add = (x: number, y: number) => {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      n++;
    };
    const bd = this.body;
    let shoulder = 0;
    if (bd.a > 0.3) {
      for (const i of BOX_PTS) if (bd.vis[i] > 0.5) add(X(bd.pos[i * 2]), Y(bd.pos[i * 2 + 1]));
      if (bd.vis[11] > 0.5 && bd.vis[12] > 0.5) shoulder = Math.abs(X(bd.pos[22]) - X(bd.pos[24]));
    }
    for (const h of this.hands) if (h.a > 0.3) for (let i = 0; i < 21; i++) add(X(h.pos[i * 2]), Y(h.pos[i * 2 + 1]));
    if (n < 3) return null;
    const pad = Math.max(18, 0.12 * (x1 - x0), shoulder * 0.12);
    const head = Math.max(pad, shoulder * 0.55); // the head reaches well above the eyes
    const m = 16;
    const out = {
      x0: clamp(x0 - pad, m, v.W - m),
      y0: clamp(y0 - head, v.safeTop, v.H - v.safeBottom),
      x1: clamp(x1 + pad, m, v.W - m),
      y1: clamp(y1 + pad, v.safeTop, v.H - v.safeBottom),
    };
    if (out.x1 - out.x0 < 60 || out.y1 - out.y0 < 60) return null;
    return out;
  }
}

/** MediaPipe's 21-point hand topology. */
const HAND_EDGES: Edge[] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

/** A joint: a lime ring around a white core, with a faint dark edge so it reads on skin and bright walls. */
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a < 0.02) return;
  ctx.beginPath();
  ctx.arc(x, y, r + 1, 0, TAU);
  ctx.fillStyle = `rgba(10,10,10,${(0.3 * a).toFixed(3)})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = lime(a);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, 0, TAU);
  ctx.fillStyle = white(a);
  ctx.fill();
}

