/**
 * SIGNOVA signing avatar: a front-view upper body drawn the way the tracker draws a person
 * (white bones with joint dots, lime hands with finger chains and fingertip dots), animated from
 * sign clips by keyframes, 2-bone IK and handshape blending. react-native-svg only, no DOM APIs.
 *
 * Driven by requestAnimationFrame. The parent provides the dark stage behind it.
 */
import { memo, useEffect, useId, useMemo, useReducer, useRef, useState, type JSX } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LIME } from '@/theme/tokens';
import { clipFor, GLOSSES, REST_POSE } from './clips';
import { buildTimeline, evalTimeline, newFrame, solve, type Frame, type PoseVecs, type Timeline } from './rig';

export { GLOSSES };
export { CLIP_SECONDS, SIGN_NOTES } from './clips';

export type SignAvatarProps = {
  /** Clip keys to sign in order, e.g. ['which','step','not','understand']. */
  glosses: string[];
  /** false: idle pose (gentle breathing, hands resting low, tiny head motion). */
  playing: boolean;
  /** Repeat the sequence with a short rest between loops. */
  loop?: boolean;
  /** 1 = normal; 0.75 slow, 1.25 fast. */
  speed?: number;
  /** Fired when gloss i starts. */
  onWord?: (index: number) => void;
  /** Fired when the sequence ends and the hands are back at rest (not when looping). */
  onDone?: () => void;
  /** The avatar fills this box and keeps its aspect (centred, upper body). */
  style?: StyleProp<ViewStyle>;
};

// ---------------------------------------------------------------- layout

/**
 * Content box in shoulder widths. Vertically it runs from just above the head (headroom for nods
 * and raised hands) to the resting fingertips, so head-to-hips fills about 91% of the box height.
 * Horizontally it is the arms' reach; a box narrower than that scales the figure down to fit.
 */
const FIT = { x0: -1.05, x1: 1.05, y0: -0.92, y1: 1.42 };
const ASPECT = (FIT.x1 - FIT.x0) / (FIT.y1 - FIT.y0);

type View2 = { W: number; H: number; sc: number; ox: number; oy: number; w: number };
function fitView(W: number, H: number): View2 {
  const sc = Math.min(W / (FIT.x1 - FIT.x0), H / (FIT.y1 - FIT.y0));
  const oy = H / 2 - ((FIT.y0 + FIT.y1) / 2) * sc;
  const w = Math.max(1.5, Math.min(3.2, sc / 58));
  return { W, H, sc, ox: W / 2, oy, w };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- trails

const TRAIL_N = 40;
const TIPS = [4, 8, 12, 16, 20];
const BANDS = [0, 0.12, 0.26, 0.42];
const BAND_ALPHA = [0.3, 0.15, 0.06];

type Trail = { t: Float64Array; p: Float32Array; head: number; count: number };
const newTrail = (): Trail => ({ t: new Float64Array(TRAIL_N), p: new Float32Array(TRAIL_N * 20), head: 0, count: 0 });

function pushTrail(tr: Trail, time: number, fr: Frame) {
  const i = tr.head;
  tr.t[i] = time;
  const o = i * 20;
  for (let h = 0; h < 2; h++) {
    const H = fr.hands[h];
    for (let j = 0; j < 5; j++) {
      tr.p[o + h * 10 + j * 2] = H[TIPS[j] * 2];
      tr.p[o + h * 10 + j * 2 + 1] = H[TIPS[j] * 2 + 1];
    }
  }
  tr.head = (i + 1) % TRAIL_N;
  tr.count = Math.min(TRAIL_N, tr.count + 1);
}

/** Three opacity bands per hand: newer segments brighter, so the trail fades out behind the tips. */
function trailPaths(tr: Trail, now: number, hand: number, v: View2): string[] {
  const out = ['', '', ''];
  if (tr.count < 2) return out;
  for (let j = 0; j < 5; j++) {
    for (let b = 0; b < 3; b++) {
      let d = '';
      let n = 0;
      let minX = 1e9,
        maxX = -1e9,
        minY = 1e9,
        maxY = -1e9;
      for (let k = 0; k < tr.count; k++) {
        const idx = (tr.head - 1 - k + TRAIL_N * 2) % TRAIL_N;
        const age = now - tr.t[idx];
        if (age < BANDS[b] - 0.02) continue;
        const x = tr.p[idx * 20 + hand * 10 + j * 2];
        const y = tr.p[idx * 20 + hand * 10 + j * 2 + 1];
        d += (n === 0 ? 'M' : 'L') + r1(v.ox + x * v.sc) + ',' + r1(v.oy + y * v.sc);
        n++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (age > BANDS[b + 1]) break;
      }
      if (n > 1 && maxX - minX + (maxY - minY) > 0.01) out[b] += d;
    }
  }
  return out;
}

// ---------------------------------------------------------------- path builders

function dots(pts: Float32Array, idx: number[], r: number, v: View2): string {
  let d = '';
  const rr = r1(r);
  const r2 = r1(r * 2);
  for (const i of idx) {
    const x = v.ox + pts[i * 2] * v.sc;
    const y = v.oy + pts[i * 2 + 1] * v.sc;
    d += `M${r1(x - r)},${r1(y)}a${rr},${rr} 0 1,0 ${r2},0a${rr},${rr} 0 1,0 ${-r2},0`;
  }
  return d;
}

function poly(pts: Float32Array, idx: number[], v: View2, close = false): string {
  let d = '';
  idx.forEach((i, k) => {
    d += (k === 0 ? 'M' : 'L') + r1(v.ox + pts[i * 2] * v.sc) + ',' + r1(v.oy + pts[i * 2 + 1] * v.sc);
  });
  return close ? d + 'Z' : d;
}

/** Catmull-Rom through points (as cubic Béziers), for the soft torso outline. */
function smoothPath(pts: Float32Array, idx: number[], v: View2): string {
  const X = (i: number) => v.ox + pts[idx[Math.max(0, Math.min(idx.length - 1, i))] * 2] * v.sc;
  const Y = (i: number) => v.oy + pts[idx[Math.max(0, Math.min(idx.length - 1, i))] * 2 + 1] * v.sc;
  let d = `M${r1(X(0))},${r1(Y(0))}`;
  for (let i = 0; i < idx.length - 1; i++) {
    const c1x = X(i) + (X(i + 1) - X(i - 1)) / 6;
    const c1y = Y(i) + (Y(i + 1) - Y(i - 1)) / 6;
    const c2x = X(i + 1) - (X(i + 2) - X(i)) / 6;
    const c2y = Y(i + 1) - (Y(i + 2) - Y(i)) / 6;
    d += `C${r1(c1x)},${r1(c1y)} ${r1(c2x)},${r1(c2y)} ${r1(X(i + 1))},${r1(Y(i + 1))}`;
  }
  return d;
}

/** Rotated ellipse as four cubic arcs. */
function ellipse(h: Float32Array, v: View2): string {
  const cx = v.ox + h[0] * v.sc;
  const cy = v.oy + h[1] * v.sc;
  const rx = h[2] * v.sc;
  const ry = h[3] * v.sc;
  const th = (h[4] * Math.PI) / 180;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const K = 0.5523;
  const P = (a: number): [number, number, number, number] => {
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    const dx = -rx * Math.sin(a);
    const dy = ry * Math.cos(a);
    return [cx + ex * c - ey * s, cy + ex * s + ey * c, dx * c - dy * s, dx * s + dy * c];
  };
  let d = '';
  for (let q = 0; q < 4; q++) {
    const a = P((q * Math.PI) / 2);
    const b = P(((q + 1) * Math.PI) / 2);
    if (q === 0) d += `M${r1(a[0])},${r1(a[1])}`;
    d += `C${r1(a[0] + K * a[2])},${r1(a[1] + K * a[3])} ${r1(b[0] - K * b[2])},${r1(b[1] - K * b[3])} ${r1(b[0])},${r1(b[1])}`;
  }
  return d + 'Z';
}

const HAND_CHAINS = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [0, 17, 18, 19, 20],
  [5, 9, 13, 17],
];
const HAND_JOINTS = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19];
const HAND_TIPS = [0, 4, 8, 12, 16, 20];
const PALM = [0, 1, 5, 9, 13, 17];

// ---------------------------------------------------------------- drawing

const CORE = '#ffffff';
const STAGE = '#0a0a0a';

/** Static backdrop: a faint dot grid fading out from the figure, a soft light and a floor shadow. */
const Backdrop = memo(function Backdrop({ v, gid }: { v: View2; gid: string }) {
  const g = Math.max(14, Math.round(v.sc * 0.16));
  const cx = v.ox;
  const cy = v.oy + 0.3 * v.sc;
  const R = 1.45 * v.sc;
  const rings = ['', '', ''];
  const x0 = cx - Math.floor(cx / g) * g;
  const y0 = cy - Math.floor(cy / g) * g;
  for (let y = y0; y < v.H; y += g) {
    for (let x = x0; x < v.W; x += g) {
      const d = Math.hypot((x - cx) / R, (y - cy) / (R * 1.1));
      const b = d < 0.55 ? 0 : d < 0.85 ? 1 : d < 1.15 ? 2 : -1;
      if (b >= 0) rings[b] += `M${r1(x - 0.8)},${r1(y)}a0.8,0.8 0 1,0 1.6,0a0.8,0.8 0 1,0 -1.6,0`;
    }
  }
  return (
    <>
      <Defs>
        <RadialGradient id={`glow${gid}`} cx={cx} cy={cy} r={R} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.06} />
          <Stop offset="0.6" stopColor="#ffffff" stopOpacity={0.02} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`shadow${gid}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.8} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`torso${gid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#5c5c5c" />
          <Stop offset="0.5" stopColor="#bdbdbd" />
          <Stop offset="1" stopColor="#5c5c5c" />
        </LinearGradient>
        <LinearGradient id={`fade${gid}`} x1="0" y1={v.oy + 0.9 * v.sc} x2="0" y2={v.oy + 1.38 * v.sc} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={STAGE} stopOpacity={0} />
          <Stop offset="1" stopColor={STAGE} stopOpacity={0.94} />
        </LinearGradient>
        <RadialGradient id={`head${gid}`} cx="36%" cy="30%" r="78%">
          <Stop offset="0" stopColor="#e8e8e8" />
          <Stop offset="0.55" stopColor="#8a8a8a" />
          <Stop offset="1" stopColor="#4a4a4a" />
        </RadialGradient>
        <RadialGradient id={`ball${gid}`} cx="36%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#d6d6d6" />
          <Stop offset="0.6" stopColor="#8c8c8c" />
          <Stop offset="1" stopColor="#4e4e4e" />
        </RadialGradient>
        <LinearGradient id={`palm${gid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#f2f2f2" />
          <Stop offset="1" stopColor="#a8a8a8" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={v.W} height={v.H} fill={`url(#glow${gid})`} />
      <Path d={rings[0]} fill="#ffffff" fillOpacity={0.1} />
      <Path d={rings[1]} fill="#ffffff" fillOpacity={0.06} />
      <Path d={rings[2]} fill="#ffffff" fillOpacity={0.028} />
      <Ellipse cx={v.ox} cy={v.oy + 1.36 * v.sc} rx={1.0 * v.sc} ry={0.13 * v.sc} fill={`url(#shadow${gid})`} />
    </>
  );
});

const px = (pts: Float32Array, i: number, v: View2) => v.ox + pts[i * 2] * v.sc;
const py = (pts: Float32Array, i: number, v: View2) => v.oy + pts[i * 2 + 1] * v.sc;

/** A capsule segment; with `off`, the same line nudged toward the light (top-left) for a highlight. */
function seg(ax: number, ay: number, bx: number, by: number, off = 0): string {
  if (off) {
    let nx = -(by - ay);
    let ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (nx + ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    ax += nx * off;
    ay += ny * off;
    bx += nx * off;
    by += ny * off;
  }
  return `M${r1(ax)},${r1(ay)}L${r1(bx)},${r1(by)}`;
}

function chainSeg(pts: Float32Array, idx: number[], v: View2, off = 0): string {
  let d = '';
  for (let k = 0; k < idx.length - 1; k++) d += seg(px(pts, idx[k], v), py(pts, idx[k], v), px(pts, idx[k + 1], v), py(pts, idx[k + 1], v), off);
  return d;
}

/** Pinky to thumb, so nearer-the-thumb fingers draw over their neighbours. */
const FINGERS = [
  [17, 18, 19, 20],
  [13, 14, 15, 16],
  [9, 10, 11, 12],
  [5, 6, 7, 8],
  [1, 2, 3, 4],
];

function Arm({ B, H, side, v, gid }: { B: Float32Array; H: Float32Array; side: number; v: View2; gid: string }) {
  const sx = px(B, 2 + side, v),
    sy = py(B, 2 + side, v),
    ex = px(B, 4 + side, v),
    ey = py(B, 4 + side, v),
    wx = px(H, 0, v),
    wy = py(H, 0, v);
  const tu = 0.26 * v.sc;
  const tf = 0.21 * v.sc;
  const up = seg(sx, sy, ex, ey);
  const fo = seg(ex, ey, wx, wy);
  return (
    <>
      <Path d={up} stroke="#262626" strokeWidth={tu + 2} strokeLinecap="round" />
      <Path d={fo} stroke="#262626" strokeWidth={tf + 2} strokeLinecap="round" />
      <Path d={up} stroke="#7a7a7a" strokeWidth={tu} strokeLinecap="round" />
      <Path d={fo} stroke="#848484" strokeWidth={tf} strokeLinecap="round" />
      <Path d={seg(sx, sy, ex, ey, tu * 0.2)} stroke="#c4c4c4" strokeOpacity={0.7} strokeWidth={tu * 0.38} strokeLinecap="round" />
      <Path d={seg(ex, ey, wx, wy, tf * 0.2)} stroke="#c8c8c8" strokeOpacity={0.7} strokeWidth={tf * 0.38} strokeLinecap="round" />
      <Circle cx={ex} cy={ey} r={tf * 0.56} fill={`url(#ball${gid})`} />
      <Circle cx={sx} cy={sy} r={tu * 0.56} fill={`url(#ball${gid})`} />
    </>
  );
}

function Hand({ H, v, gid }: { H: Float32Array; v: View2; gid: string }) {
  const t = 0.066 * v.sc;
  const rim = Math.max(1.2, v.w * 0.6);
  const palm = poly(H, PALM, v, true);
  const fingers = FINGERS.map((f, i) => (i === 4 ? [1, ...f] : f));
  const all = fingers.map((f) => chainSeg(H, f, v)).join('');
  return (
    <>
      <Path d={palm} fill={LIME} stroke={LIME} strokeWidth={t * 0.9 + rim * 2} strokeLinejoin="round" />
      <Path d={all} stroke={LIME} strokeWidth={t + rim * 2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={palm} fill={`url(#palm${gid})`} stroke="#c6c6c6" strokeWidth={t * 0.9} strokeLinejoin="round" />
      {fingers.map((f, i) => {
        const d = chainSeg(H, f, v);
        return (
          <G key={i}>
            <Path d={d} stroke="#3a3a3a" strokeWidth={t + 1.2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={d} stroke="#b4b4b4" strokeWidth={t} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={chainSeg(H, f, v, t * 0.16)} stroke="#f2f2f2" strokeOpacity={0.85} strokeWidth={t * 0.38} strokeLinecap="round" />
          </G>
        );
      })}
    </>
  );
}

function Figure({ fr, tr, now, v, gid }: { fr: Frame; tr: Trail | null; now: number; v: View2; gid: string }) {
  const w = v.w;
  const B = fr.body;
  const T = fr.torso;
  const torso = smoothPath(T, [0, 1, 2, 3, 4, 5, 6, 13, 12, 11, 10, 9, 8, 7, 0], v) + 'Z';
  const rimLight = smoothPath(T, [9, 10, 11, 12, 13], v);
  const neck = seg(px(B, 0, v), py(B, 0, v) + 0.04 * v.sc, px(B, 1, v), py(B, 1, v));
  const hd = fr.head;
  const hr = new Float32Array(10);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4 + (hd[4] * Math.PI) / 180;
    hr[i * 2] = hd[0] + hd[2] * Math.cos(a);
    hr[i * 2 + 1] = hd[1] + hd[3] * Math.sin(a);
  }
  const order = fr.handZ[0] <= fr.handZ[1] ? [0, 1] : [1, 0];

  // the tracked skeleton, faint on top
  const fx = (h: number) => r1(px(fr.hands[h], 0, v)) + ',' + r1(py(fr.hands[h], 0, v));
  const bones =
    poly(B, [2, 0, 3], v) +
    poly(B, [0, 1], v) +
    poly(B, [2, 4], v) +
    poly(B, [3, 5], v) +
    `M${r1(px(B, 4, v))},${r1(py(B, 4, v))}L${fx(0)}M${r1(px(B, 5, v))},${r1(py(B, 5, v))}L${fx(1)}`;
  let chains = '';
  let tips = '';
  for (let h = 0; h < 2; h++) {
    for (const c of HAND_CHAINS) chains += poly(fr.hands[h], c, v);
    tips += dots(fr.hands[h], HAND_TIPS, w * 0.9, v);
  }
  const rimW = Math.max(1.2, w * 0.6);

  return (
    <>
      <Path d={torso} fill={`url(#torso${gid})`} stroke="#262626" strokeWidth={1.5} />
      <Path d={rimLight} stroke={LIME} strokeOpacity={0.3} strokeWidth={rimW} fill="none" strokeLinecap="round" />
      <Rect x={0} y={v.oy + 0.9 * v.sc} width={v.W} height={v.H} fill={`url(#fade${gid})`} />
      <Path d={neck} stroke="#262626" strokeWidth={0.17 * v.sc + 2} strokeLinecap="round" />
      <Path d={neck} stroke="#7a7a7a" strokeWidth={0.17 * v.sc} strokeLinecap="round" />
      <Path d={ellipse(hd, v)} fill={`url(#head${gid})`} stroke="#262626" strokeWidth={1.5} />
      <Path d={smoothPath(hr, [0, 1, 2, 3, 4], v)} stroke={LIME} strokeOpacity={0.3} strokeWidth={rimW} fill="none" strokeLinecap="round" />
      {order.map((h) => (
        <Arm key={`a${h}`} B={B} H={fr.hands[h]} side={h} v={v} gid={gid} />
      ))}
      {order.map((h) => (
        <Hand key={`h${h}`} H={fr.hands[h]} v={v} gid={gid} />
      ))}
      <Path d={bones} stroke={LIME} strokeOpacity={0.35} strokeWidth={w * 0.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={chains} stroke={LIME} strokeOpacity={0.35} strokeWidth={w * 0.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={dots(B, [0, 2, 3, 4, 5], w * 1.2, v)} fill={LIME} fillOpacity={0.45} />
      <Path d={dots(B, [0, 2, 3, 4, 5], w * 0.55, v)} fill={CORE} fillOpacity={0.6} />
      <Path d={tips} fill={LIME} fillOpacity={0.55} />
      {tr
        ? [0, 1].map((h) =>
            trailPaths(tr, now, h, v).map((d, b) =>
              d ? <Path key={`t${h}${b}`} d={d} stroke={LIME} strokeOpacity={BAND_ALPHA[b]} strokeWidth={w * 0.75} fill="none" strokeLinejoin="round" /> : null,
            ),
          )
        : null}
    </>
  );
}

function useBox() {
  const [box, setBox] = useState<{ W: number; H: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (!box || Math.abs(box.W - width) > 0.5 || Math.abs(box.H - height) > 0.5)) {
      setBox({ W: width, H: height });
    }
  };
  return [box, onLayout] as const;
}

const clonePose = (p: PoseVecs): PoseVecs => ({ d: Float32Array.from(p.d), n: Float32Array.from(p.n), h: Float32Array.from(p.h) });

function sequence(glosses: string[], from: PoseVecs): Timeline {
  return buildTimeline(glosses.map(clipFor), from, REST_POSE);
}

// ---------------------------------------------------------------- live component

type Engine = {
  tl: Timeline;
  t: number;
  tt: number;
  word: number;
  done: boolean;
  act: number;
  last: number;
  pose: PoseVecs;
  frame: Frame;
  trail: Trail;
};

export default function SignAvatar({ glosses, playing, loop = false, speed = 1, onWord, onDone, style }: SignAvatarProps): JSX.Element {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, onLayout] = useBox();
  const [, tick] = useReducer((x: number) => (x + 1) % 1e9, 0);

  const eng = useRef<Engine | null>(null);
  if (!eng.current) {
    const pose = clonePose(REST_POSE);
    const frame = newFrame();
    solve(pose, 0, 1, frame);
    eng.current = { tl: buildTimeline([], pose, REST_POSE), t: 0, tt: 0, word: 0, done: true, act: 1, last: 0, pose, frame, trail: newTrail() };
  }

  const props = useRef({ glosses, playing, loop, speed, onWord, onDone });
  props.current = { glosses, playing, loop, speed, onWord, onDone };

  const gkey = glosses.join('|');
  useEffect(() => {
    const e = eng.current!;
    e.tl = playing ? sequence(props.current.glosses, clonePose(e.pose)) : buildTimeline([], clonePose(e.pose), REST_POSE, 0.45);
    e.t = 0;
    e.word = 0;
    e.done = !playing;
  }, [gkey, playing]);

  useEffect(() => {
    let raf = 0;
    let alive = true;
    const step = (now: number) => {
      if (!alive) return;
      const e = eng.current!;
      const P = props.current;
      const dt = e.last ? Math.min(0.05, Math.max(0, (now - e.last) / 1000)) : 0;
      e.last = now;
      e.tt += dt;
      e.t += dt * (P.speed > 0 ? P.speed : 1);
      if (P.playing) {
        while (e.word < e.tl.words.length && e.t >= e.tl.words[e.word]) P.onWord?.(e.word++);
        if (e.t >= e.tl.end) {
          if (P.loop) {
            if (e.t >= e.tl.end + 0.7) {
              e.tl = sequence(P.glosses, clonePose(e.pose));
              e.t = 0;
              e.word = 0;
            }
          } else if (!e.done) {
            e.done = true;
            P.onDone?.();
          }
        }
      }
      evalTimeline(e.tl, e.t, e.pose);
      const target = P.playing && e.t < e.tl.end ? 0.4 : 1;
      e.act += (target - e.act) * Math.min(1, dt * 2.5);
      solve(e.pose, e.tt, e.act, e.frame);
      pushTrail(e.trail, e.tt, e.frame);
      tick();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const v = useMemo(() => (box ? fitView(box.W, box.H) : null), [box]);
  const e = eng.current;
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout} pointerEvents="none">
      {v ? (
        <Svg width={v.W} height={v.H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Backdrop v={v} gid={gid} />
          <Figure fr={e.frame} tr={e.trail} now={e.tt} v={v} gid={gid} />
        </Svg>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- still (posters, thumbnails, tests)

/** The sequence frozen at `t` seconds (speed 1), trails included. No animation loop. */
export function SignAvatarStill({ glosses, t, style }: { glosses: string[]; t: number; style?: StyleProp<ViewStyle> }): JSX.Element {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, onLayout] = useBox();
  const v = useMemo(() => (box ? fitView(box.W, box.H) : null), [box]);
  let fig: JSX.Element | null = null;
  if (v) {
    const tl = sequence(glosses, clonePose(REST_POSE));
    const pose = clonePose(REST_POSE);
    const fr = newFrame();
    const tr = newTrail();
    const act = glosses.length && t < tl.end ? 0.4 : 1;
    for (let k = 26; k >= 0; k--) {
      const tk = Math.max(0, t - k / 60);
      evalTimeline(tl, tk, pose);
      solve(pose, tk, act, fr);
      pushTrail(tr, tk, fr);
    }
    fig = <Figure fr={fr} tr={tr} now={t} v={v} gid={gid} />;
  }
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout} pointerEvents="none">
      {v ? (
        <Svg width={v.W} height={v.H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Backdrop v={v} gid={gid} />
          {fig}
        </Svg>
      ) : null}
    </View>
  );
}

/** Width over height of the figure's content box (about 0.9). Wider boxes are fine: the figure fills the height. */
export const AVATAR_ASPECT = ASPECT;
