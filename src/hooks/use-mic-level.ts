/**
 * Live microphone level (0..1) for the "teacher speaks" turn.
 * Web: getUserMedia + AnalyserNode RMS. If the mic is refused or missing (or on native),
 * it falls back to a speech-like synthetic level so the meter still reads on video.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const BARS = 28;

export function useMicLevel(active: boolean) {
  const [levels, setLevels] = useState<number[]>(() => new Array(BARS).fill(0));
  const [real, setReal] = useState(false);
  const levelRef = useRef(0);

  useEffect(() => {
    if (!active) {
      levelRef.current = 0;
      setLevels(new Array(BARS).fill(0));
      return;
    }
    let raf = 0;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let buf: Float32Array<ArrayBuffer> | null = null;
    const hist: number[] = new Array(BARS).fill(0);
    let smooth = 0;
    let last = 0;
    const t0 = Date.now();

    const synthetic = (t: number) => {
      // Syllable-like bursts with pauses between words.
      const s = t / 1000;
      const word = Math.max(0, Math.sin(s * 2.1)) ** 0.6;
      const syl = 0.55 + 0.45 * Math.abs(Math.sin(s * 11.3 + Math.sin(s * 3.7)));
      return Math.min(1, word * syl * (0.75 + Math.random() * 0.25));
    };

    const tick = () => {
      if (stopped) return;
      let v: number;
      if (analyser && buf) {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        v = Math.min(1, rms * 9);
      } else {
        v = synthetic(Date.now() - t0);
      }
      smooth = smooth * 0.6 + v * 0.4;
      levelRef.current = smooth;
      const now = Date.now();
      if (now - last > 50) {
        last = now;
        hist.shift();
        hist.push(smooth);
        setLevels(hist.slice());
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          if (stopped) {
            stream.getTracks().forEach((tr) => tr.stop());
            return;
          }
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          ctx = new AC() as AudioContext;
          await ctx.resume().catch(() => {});
          const src = ctx.createMediaStreamSource(stream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          buf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
          src.connect(analyser);
          setReal(true);
        } catch {
          setReal(false);
        }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      ctx?.close().catch(() => {});
    };
  }, [active]);

  return { levels, levelRef, real };
}
