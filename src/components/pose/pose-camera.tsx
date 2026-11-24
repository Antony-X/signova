/**
 * PoseCamera (native): the front camera with the same HUD. Tracking runs on the web build only,
 * so stats stay `ready: false` here. Same props as the web version (pose-camera.web.tsx).
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useApp } from '@/theme/app-context';

import { LoadingPanel, PoseHud, StageGrade, StageMessage } from './pose-hud';
import { IDLE_STATS, type PoseCameraProps, type PoseStats } from './types';

export type { PoseCameraProps, PoseStats } from './types';

export default function PoseCamera(props: PoseCameraProps) {
  return (
    <StageGrade>
      <Stage {...props} />
    </StageGrade>
  );
}

function Stage({ style, active = true, showHud = true, signLanguage, face, onStats }: PoseCameraProps) {
  const { c } = useApp();
  const [perm, request] = useCameraPermissions();
  const granted = !!perm?.granted;
  const denied = !!perm && !perm.granted && !perm.canAskAgain;
  const cb = useRef(onStats);
  cb.current = onStats;

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) request();
  }, [perm, request]);

  useEffect(() => {
    const s: PoseStats = { ...IDLE_STATS, error: perm && !perm.granted ? 'denied' : undefined };
    cb.current?.(s);
  }, [perm]);

  return (
    <View style={[{ flex: 1, backgroundColor: c.stage, overflow: 'hidden' }, style]}>
      {granted ? <CameraView style={{ flex: 1 }} facing="front" active={active} /> : null}
      <Vignette />
      {granted && showHud ? <PoseHud stats={IDLE_STATS} signLanguage={signLanguage} faceOn={face ?? true} /> : null}
      {!perm ? <LoadingPanel /> : null}
      {perm && !granted ? (
        <StageMessage
          title="Camera access is off"
          body={denied ? 'Allow the camera for SIGNOVA in Settings, then come back.' : 'Allow the camera so SIGNOVA can read signs.'}
          action="Allow the camera"
          onAction={request}
        />
      ) : null}
    </View>
  );
}

function Vignette() {
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <RadialGradient id="v" cx="50%" cy="46%" rx="60%" ry="48%">
          <Stop offset="0.58" stopColor="#0a0a0a" stopOpacity={0} />
          <Stop offset="1" stopColor="#0a0a0a" stopOpacity={0.5} />
        </RadialGradient>
        <LinearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0a0a0a" stopOpacity={0.42} />
          <Stop offset="0.12" stopColor="#0a0a0a" stopOpacity={0} />
          <Stop offset="0.88" stopColor="#0a0a0a" stopOpacity={0} />
          <Stop offset="1" stopColor="#0a0a0a" stopOpacity={0.42} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#v)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#t)" />
    </Svg>
  );
}
