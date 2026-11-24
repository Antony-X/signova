import type { StyleProp, ViewStyle } from 'react-native';

/** Live numbers from the tracker, reported to the parent about 5 times a second. */
export type PoseStats = {
  /** Models loaded and camera running. */
  ready: boolean;
  fps: number;
  /** 0 or 33 (pose landmarks visible). */
  body: number;
  /** 0..2 */
  hands: number;
  /** 0 or 478 */
  face: number;
  /** 0..1 smoothed hand motion energy (wrist + fingertip speed); about 0.3+ means clearly signing. */
  motion: number;
  /** Top GestureRecognizer category, when not 'None'. */
  gesture?: { name: string; score: number };
  error?: 'denied' | 'unsupported' | 'load';
};

export type PoseCameraProps = {
  style?: StyleProp<ViewStyle>;
  /** Default true; false pauses inference (the camera keeps running). */
  active?: boolean;
  /** The student is signing now: stronger skeleton, longer trails, a "Reading signs" frame. */
  focus?: boolean;
  /** Default true. */
  showHud?: boolean;
  /** Shown in the HUD, e.g. 'GESL'. */
  signLanguage?: string;
  /** Default: on while the device keeps up. Draws a sparse face contour. */
  face?: boolean;
  /** Throttled to about 5 Hz. */
  onStats?: (s: PoseStats) => void;
};

export const IDLE_STATS: PoseStats = { ready: false, fps: 0, body: 0, hands: 0, face: 0, motion: 0 };
