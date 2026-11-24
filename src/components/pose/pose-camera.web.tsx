/**
 * PoseCamera (web): the selfie camera with a live MediaPipe body, hand and face skeleton on top.
 *
 * DOM inside RN Views (react-native-web renders React DOM): a mirrored <video> with
 * object-fit: cover, a vignette, a DPR-sharp <canvas> that maps landmarks with the same cover
 * crop, and the RN HUD. One rAF loop runs inference on each new video frame and draws every
 * display frame, so trails fade smoothly even when the tracker is slower than the screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useApp } from '@/theme/app-context';
import { LIME, radius, space, type } from '@/theme/tokens';

import { getTracker, loadTracker, onTrackerProgress, trackerProgress, type Tracker } from './pose-engine.web';
import { FrameHint, LoadingPanel, PoseHud, StageGrade, StageMessage, VIGNETTE_CSS } from './pose-hud';
import { Scene } from './pose-scene.web';
import { IDLE_STATS, type PoseCameraProps, type PoseStats } from './types';

export type { PoseCameraProps, PoseStats } from './types';

type Cam = 'starting' | 'on' | 'denied' | 'insecure' | 'missing' | 'busy';

export default function PoseCamera(props: PoseCameraProps) {
  return (
    <StageGrade>
      <Stage {...props} />
    </StageGrade>
  );
}

function Stage({ style, active = true, focus = false, showHud = true, signLanguage, face, onStats }: PoseCameraProps) {
  const { c } = useApp();
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const alive = useRef(true);

  const [cam, setCam] = useState<Cam>('starting');
  const [model, setModel] = useState<'loading' | 'ready' | 'error'>(() => (getTracker() ? 'ready' : 'loading'));
  const [progress, setProgress] = useState(trackerProgress);
  const [stats, setStats] = useState<PoseStats>(IDLE_STATS);
  const [empty, setEmpty] = useState(false);
  const [autoFace, setAutoFace] = useState(true);
  const [retried, setRetried] = useState(false);
  const faceOn = face ?? autoFace;

  // Live values for the loop without restarting it.
  const live = useRef({ active, focus, faceOn, onStats, hud: showHud });
  live.current = { active, focus, faceOn, onStats, hud: showHud };

  // ---- camera
  const startCamera = useCallback(async () => {
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia) {
      setCam(typeof window !== 'undefined' && window.isSecureContext === false ? 'insecure' : 'missing');
      return;
    }
    setCam('starting');
    try {
      let stream: MediaStream;
      try {
        stream = await md.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        if ((e as Error)?.name !== 'OverconstrainedError') throw e;
        stream = await md.getUserMedia({ video: true, audio: false });
      }
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.muted = true;
        v.playsInline = true;
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setCam('on');
    } catch (e) {
      const name = (e as Error)?.name;
      setCam(
        name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'missing'
          : name === 'NotReadableError' || name === 'AbortError'
            ? 'busy'
            : 'denied',
      );
    }
  }, []);

  const startModels = useCallback(() => {
    setModel(getTracker() ? 'ready' : 'loading');
    loadTracker().then(
      () => alive.current && setModel('ready'),
      () => alive.current && setModel('error'),
    );
  }, []);

  useEffect(() => {
    alive.current = true;
    const off = onTrackerProgress(setProgress);
    startCamera();
    startModels();
    return () => {
      alive.current = false;
      off();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startCamera, startModels]);

  // Face model loads after the main two, only when it is wanted.
  useEffect(() => {
    if (model === 'ready' && faceOn) getTracker()?.loadFace();
  }, [model, faceOn]);

  // Errors and the not-ready state reach the parent right away.
  const error: PoseStats['error'] =
    cam === 'denied' ? 'denied' : cam === 'insecure' || cam === 'missing' || cam === 'busy' ? 'unsupported' : model === 'error' ? 'load' : undefined;
  useEffect(() => {
    if (cam === 'on' && model === 'ready') return;
    live.current.onStats?.({ ...IDLE_STATS, error });
  }, [cam, model, error]);

  // ---- the loop
  useEffect(() => {
    if (cam !== 'on' || model !== 'ready') return;
    const tracker = getTracker() as Tracker;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const box = boxRef.current!;
    const ctx = canvas.getContext('2d')!;
    const scene = new Scene();
    let W = 0;
    let H = 0;
    let dpr = 1;
    const fit = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    let raf = 0;
    let lastVT = -1;
    let lastTs = 0;
    let frame = 0;
    let busy = false;
    let failed = false;
    let fps = 0;
    let fpsN = 0;
    let fpsT = performance.now();
    let statT = 0;
    let emptySince = 0;
    let slowSince = 0;
    let faceSince = 0;
    let shownEmpty = false;
    let last = { ...IDLE_STATS };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const L = live.current;
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Inference on each new camera frame.
      if (L.active && !busy && !failed && vw && video.readyState >= 2 && video.currentTime !== lastVT) {
        lastVT = video.currentTime;
        frame++;
        if (L.faceOn) scene.setFaceEdges(tracker.edges.face);
        const ts = (lastTs = Math.max(now, lastTs + 1));
        try {
          const d = tracker.detect(video, ts, {
            pose: fps >= 20 || frame % 2 === 0,
            face: L.faceOn && tracker.hasFace() && frame % (fps >= 30 ? 2 : 3) === 0,
          });
          scene.feed(d, now / 1000, vw / vh);
          fpsN++;
        } catch {
          // A GPU that built but cannot run: move everything to the CPU once.
          busy = true;
          tracker.fallBack().then(
            () => (busy = false),
            () => {
              failed = true;
              if (alive.current) setModel('error');
            },
          );
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const out = scene.draw(ctx, { W, H, vw, vh, focus: L.focus, face: L.faceOn, safeTop: live.current.hud ? 92 : 48, safeBottom: live.current.hud ? 60 : 24 }, now / 1000);
      const tag = tagRef.current;
      if (tag) {
        if (out.tag) {
          tag.style.opacity = out.tag.a.toFixed(3);
          tag.style.transform = `translate(${out.tag.x.toFixed(1)}px, ${(out.tag.y - 32).toFixed(1)}px)`;
        } else tag.style.opacity = '0';
      }

      // fps over half-second windows.
      if (now - fpsT >= 500) {
        const f = (fpsN * 1000) / (now - fpsT);
        fps = fps ? fps * 0.5 + f * 0.5 : f;
        fpsN = 0;
        fpsT = now;
        // Face off by default on devices that cannot keep up.
        // (judged only once the face model runs and its warmup is over)
        if (L.faceOn && tracker.hasFace() && !faceSince) faceSince = now;
        const judging = L.active && L.faceOn && !!faceSince && now - faceSince > 4000;
        slowSince = judging && fps < 10 ? slowSince || now : 0;
        if (slowSince && now - slowSince > 4000) setAutoFace(false);
      }

      // Stats at 5 Hz; React state only when a HUD number changes.
      if (now - statT >= 200) {
        statT = now;
        const s = scene.stats(L.faceOn);
        const next: PoseStats = { ready: true, fps: Math.round(fps), ...s, motion: Math.round(s.motion * 1000) / 1000 };
        L.onStats?.(next);
        if (next.fps !== last.fps || next.body !== last.body || next.hands !== last.hands || next.face !== last.face) setStats(next);
        last = next;
        const isEmpty = scene.empty && L.active;
        emptySince = isEmpty ? emptySince || now : 0;
        const show = !!emptySince && now - emptySince > 1200;
        if (show !== shownEmpty) setEmpty((shownEmpty = show));
      }
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible') {
        scene.reset();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [cam, model]);

  const running = cam === 'on' && model === 'ready';
  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;

  let message = null;
  if (cam === 'denied')
    message = (
      <StageMessage
        title="Camera access is off"
        body={
          retried
            ? 'If nothing happens, allow the camera from the icon in the address bar, then try again.'
            : 'Allow the camera so SIGNOVA can read signs. The video stays on this device.'
        }
        action="Allow the camera"
        onAction={() => {
          setRetried(true);
          startCamera();
        }}
      />
    );
  else if (cam === 'insecure')
    message = <StageMessage title="The camera needs a secure page" body="Open SIGNOVA over https to use the camera." />;
  else if (cam === 'missing')
    message = <StageMessage title="No camera found" body="Connect a camera, then try again." action="Try again" onAction={startCamera} />;
  else if (cam === 'busy')
    message = (
      <StageMessage title="The camera is busy" body="Another app is using the camera. Close it, then try again." action="Try again" onAction={startCamera} />
    );
  else if (model === 'error')
    message = (
      <StageMessage title="The tracker did not load" body="Check the connection, then try again." action="Try again" onAction={startModels} icon={false} />
    );

  return (
    <View style={[{ flex: 1, backgroundColor: c.stage, overflow: 'hidden' }, style]}>
      <div ref={boxRef} style={{ ...fill, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            ...fill,
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            opacity: cam === 'on' ? (running ? 1 : 0.4) : 0,
            transition: 'opacity 520ms cubic-bezier(.22,1,.36,1)',
            backgroundColor: c.stage,
          }}
        />
        <div style={{ ...fill, background: VIGNETTE_CSS, pointerEvents: 'none' }} />
        <canvas ref={canvasRef} style={{ ...fill, pointerEvents: 'none' }} />
        <div
          ref={tagRef}
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform, opacity' }}>
          <View
            style={{
              height: 24,
              paddingHorizontal: space[2],
              borderRadius: radius.sm,
              backgroundColor: 'rgba(10,10,10,0.62)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LIME }} />
            <Text style={[type.mono, { color: LIME }]}>Reading signs</Text>
          </View>
        </div>
      </div>
      {running && showHud ? <PoseHud stats={stats} signLanguage={signLanguage} faceOn={faceOn} /> : null}
      {running ? <FrameHint visible={empty && active} /> : null}
      {!message && !running ? <LoadingPanel progress={model === 'ready' ? undefined : progress} /> : null}
      {message}
    </View>
  );
}
