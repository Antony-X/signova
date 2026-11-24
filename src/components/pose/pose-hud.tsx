/**
 * The camera HUD, shared by the web and native PoseCamera: three mono chips, the stage messages
 * (loading, camera off, tracker failed) and the "Step into the frame" hint.
 * The stage is always dark, so everything inside it renders in the dark grade.
 */
import { CameraOff } from 'lucide-react-native';
import { useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, LiveDot, Txt } from '@/components/ui';
import { AppContext, useApp } from '@/theme/app-context';
import { LIME, motion, radius, space, type } from '@/theme/tokens';

import type { PoseStats } from './types';

const isWeb = Platform.OS === 'web';
const CHIP_BG = 'rgba(10,10,10,0.62)';
const NB = ' ';

/** Forces the dark grade for everything on the camera stage. */
export function StageGrade({ children }: { children: ReactNode }) {
  const ctx = useContext(AppContext);
  const value = useMemo(() => (ctx ? { ...ctx, isDark: true } : ctx), [ctx]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function HudChip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useApp();
  return (
    <View
      style={[
        {
          height: 28,
          paddingHorizontal: space[3],
          borderRadius: radius.sm,
          backgroundColor: CHIP_BG,
          borderWidth: 1,
          borderColor: c.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
        },
        isWeb ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any) : null,
        style,
      ]}>
      {children}
    </View>
  );
}

/** A mono readout: muted label, white value, padded so the chip width never jumps. */
function Read({ label, value, pad }: { label: string; value: number; pad: number }) {
  const { c } = useApp();
  return (
    <Text style={[type.mono, { color: c.muted }]}>
      {label}
      {NB}
      <Text style={{ color: value ? c.ink : c.muted }}>{String(value).padEnd(pad, NB)}</Text>
    </Text>
  );
}

export function PoseHud({ stats, signLanguage, faceOn }: { stats: PoseStats; signLanguage?: string; faceOn: boolean }) {
  const { c } = useApp();
  const inset = space[4];
  const sep = <Text style={[type.mono, { color: c.lineStrong }]}>·</Text>;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <HudChip style={{ position: 'absolute', left: inset, top: inset }}>
        <LiveDot color={LIME} size={7} />
        <Text style={[type.mono, { color: c.ink }]}>Live</Text>
        {signLanguage ? (
          <>
            {sep}
            <Text style={[type.mono, { color: c.muted }]}>{signLanguage}</Text>
          </>
        ) : null}
      </HudChip>
      <HudChip style={{ position: 'absolute', right: inset, top: inset }}>
        <Text style={[type.mono, { color: c.ink }]}>
          {String(Math.round(stats.fps)).padStart(2, NB)}
          <Text style={{ color: c.muted }}>{NB}fps</Text>
        </Text>
      </HudChip>
      <HudChip style={{ position: 'absolute', left: inset, bottom: inset }}>
        <Read label="Body" value={stats.body} pad={2} />
        {sep}
        <Read label="Hands" value={stats.hands} pad={1} />
        {faceOn ? (
          <>
            {sep}
            <Read label="Face" value={stats.face} pad={3} />
          </>
        ) : null}
      </HudChip>
    </View>
  );
}

/** A thin lime bar; `progress` undefined makes it indeterminate. */
export function ProgressLine({ progress, width = 168 }: { progress?: number; width?: number }) {
  const { c } = useApp();
  const slide = useRef(new Animated.Value(0)).current;
  const indeterminate = progress == null;
  useEffect(() => {
    if (!indeterminate) return;
    const loop = Animated.loop(
      Animated.timing(slide, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: !isWeb }),
    );
    loop.start();
    return () => loop.stop();
  }, [indeterminate, slide]);
  return (
    <View style={{ width, height: 2, borderRadius: radius.pill, backgroundColor: c.line, overflow: 'hidden' }}>
      {indeterminate ? (
        <Animated.View
          style={{
            width: width * 0.32,
            height: 2,
            backgroundColor: LIME,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.32, width] }) }],
          }}
        />
      ) : (
        <View
          style={[
            { width: `${Math.round(progress * 1000) / 10}%`, height: 2, backgroundColor: LIME },
            isWeb ? ({ transitionProperty: 'width', transitionDuration: '420ms', transitionTimingFunction: motion.ease } as any) : null,
          ]}
        />
      )}
    </View>
  );
}

export function LoadingPanel({ progress }: { progress?: number }) {
  const { c } = useApp();
  return (
    <View pointerEvents="none" style={centre}>
      <View style={{ alignItems: 'center', gap: space[3] }}>
        <Txt v="label" color={c.ink}>
          Loading the tracker
        </Txt>
        <ProgressLine progress={progress} />
        <Txt v="mono" color={c.muted}>
          {progress == null ? 'Starting the camera' : `${String(Math.round(progress * 100)).padStart(2, NB)}%`}
        </Txt>
      </View>
    </View>
  );
}

export function StageMessage({
  title,
  body,
  action,
  onAction,
  icon = true,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  icon?: boolean;
}) {
  const { c } = useApp();
  return (
    <View style={centre}>
      <View style={{ alignItems: 'center', gap: space[3], maxWidth: 320, paddingHorizontal: space[4] }}>
        {icon ? <CameraOff size={22} strokeWidth={1.5} color={c.muted} /> : null}
        <Txt v="h3" color={c.ink} style={{ textAlign: 'center' }}>
          {title}
        </Txt>
        <Txt v="small" color={c.muted} style={{ textAlign: 'center' }}>
          {body}
        </Txt>
        {action && onAction ? <Button label={action} onPress={onAction} style={{ marginTop: space[2], alignSelf: 'center' }} /> : null}
      </View>
    </View>
  );
}

/** "Step into the frame": fades in after a pause, sits low and centred. */
export function FrameHint({ visible }: { visible: boolean }) {
  const { c } = useApp();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.slide : motion.out * 2,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: !isWeb,
    }).start();
  }, [a, visible]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: '68%', alignItems: 'center', opacity: a }}>
      <HudChip>
        <Text style={[type.label, { color: c.ink }]}>Step into the frame</Text>
      </HudChip>
    </Animated.View>
  );
}

/** The dark edge that keeps the HUD readable over any video. */
export const VIGNETTE_CSS =
  'radial-gradient(ellipse 120% 95% at 50% 46%, rgba(10,10,10,0) 58%, rgba(10,10,10,0.5) 100%),' +
  'linear-gradient(to bottom, rgba(10,10,10,0.42), rgba(10,10,10,0) 96px),' +
  'linear-gradient(to top, rgba(10,10,10,0.42), rgba(10,10,10,0) 96px)';

const centre: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
};
