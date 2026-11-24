/**
 * The one system: text, buttons, cards, segmented control, chips, the entrance and the mark.
 * Every screen builds from these; no screen defines its own button or card look.
 *
 * Hover/press numbers follow tasteskill motion.md: a linked card lifts 2px, a button steps up 1px
 * on hover and presses 1px down at scale .985. Hover is web-only (fine pointer); native gets press.
 */
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useApp } from '@/theme/app-context';
import { font, LIME, motion, radius, space, type } from '@/theme/tokens';

const isWeb = Platform.OS === 'web';

/** Web-only CSS transition so hover states ease instead of jumping. */
export const webTransition = (ms: number = motion.in): any =>
  isWeb
    ? {
        transitionProperty: 'transform, background-color, border-color, opacity, color',
        transitionDuration: `${ms}ms`,
        transitionTimingFunction: motion.ease,
      }
    : null;

type PState = { pressed: boolean; hovered?: boolean; focused?: boolean };

// ---------------------------------------------------------------- Text

type Variant = keyof typeof type;

export function Txt({
  v = 'body',
  color,
  muted,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const { c } = useApp();
  return <Text {...rest} style={[type[v], { color: color ?? (muted ? c.muted : c.ink) }, style]} />;
}

// ---------------------------------------------------------------- Button

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  kind?: 'primary' | 'secondary';
  arrow?: boolean;
  icon?: ReactNode;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * `arrow` button look (dealt): the primary is the one filled accent with a drawn arrow;
 * the secondary is a text link with an underline that keeps still.
 */
export function Button({ label, kind = 'primary', arrow = kind === 'primary', icon, full, style, ...rest }: ButtonProps) {
  const { c } = useApp();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
      style={(s) => {
        const { pressed, hovered } = s as PState;
        const lift = primary ? (pressed ? 1 : hovered ? -1 : 0) : 0;
        return [
          {
            height: 48,
            paddingHorizontal: primary ? space[5] : space[1],
            borderRadius: radius.btn,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space[2],
            alignSelf: full ? 'stretch' : 'flex-start',
            backgroundColor: primary ? (hovered ? mix(c.action, c.ink, 0.14) : c.action) : 'transparent',
            opacity: rest.disabled ? 0.45 : 1,
            transform: [{ translateY: lift }, { scale: pressed ? 0.985 : 1 }],
          },
          webTransition(pressed ? motion.press : motion.in),
          style,
        ];
      }}>
      {(s) => {
        const { hovered } = s as PState;
        return (
          <>
            {icon}
            <Text
              style={[
                type.label,
                {
                  fontSize: 16,
                  lineHeight: 20,
                  color: primary ? c.actionInk : c.ink,
                  textDecorationLine: primary ? 'none' : 'underline',
                  textDecorationColor: primary ? undefined : hovered ? c.ink : c.lineStrong,
                } as TextStyle,
              ]}>
              {label}
            </Text>
            {arrow && (
              <View style={[{ transform: [{ translateX: hovered ? 3 : 0 }] }, webTransition()]}>
                <ArrowRight size={16} strokeWidth={1.75} color={primary ? c.actionInk : c.ink} />
              </View>
            )}
          </>
        );
      }}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Card

/** One card recipe: surface ground, 1px line, radius lg. A card with onPress lifts 2px on hover. */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useApp();
  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.line,
    padding: padded ? space[5] : 0,
    overflow: 'hidden',
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={(s) => {
        const { pressed, hovered } = s as PState;
        return [
          base,
          {
            borderColor: hovered ? c.lineStrong : c.line,
            transform: [{ translateY: pressed ? 0 : hovered ? -2 : 0 }, { scale: pressed ? 0.995 : 1 }],
          },
          isWeb && hovered ? ({ boxShadow: '0 12px 24px rgba(0,0,0,0.10)' } as any) : null,
          webTransition(hovered ? 180 : motion.out),
          style,
        ];
      }}>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Segmented control

/** Click-only tabs: one ink pill marks the choice. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useApp();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, gap: 4 },
        style,
      ]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={(s) => {
              const { hovered } = s as PState;
              return [
                {
                  flex: 1,
                  minHeight: 40,
                  paddingHorizontal: space[3],
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? c.ink : hovered ? c.raised : 'transparent',
                },
                webTransition(motion.slide),
              ];
            }}>
            <Text numberOfLines={1} style={[type.label, { fontSize: 14, color: on ? c.bg : c.muted }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- Chip

export function Chip({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  const { c } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(s) => {
        const { hovered, pressed } = s as PState;
        return [
          {
            minHeight: 44,
            paddingHorizontal: space[4],
            paddingVertical: space[2],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: active ? c.ink : hovered ? c.lineStrong : c.line,
            backgroundColor: active ? c.raised : 'transparent',
            justifyContent: 'center',
            transform: [{ translateY: pressed ? 1 : hovered ? -1 : 0 }],
          },
          webTransition(),
        ];
      }}>
      <Text style={[type.small, { color: c.ink }]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Live dot (a ring grows and fades, 2.4s)

export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: !isWeb }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

// ---------------------------------------------------------------- Entrance

/**
 * The hero entrance (motion.md): a block fades up 12px over 520ms on the enter ease, once.
 * `from` lets a picture settle from scale .98 instead of rising.
 */
export function Enter({
  children,
  delay = 0,
  from = 'up',
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: 'up' | 'settle' | 'line';
  style?: StyleProp<ViewStyle>;
}) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: from === 'settle' ? 900 : from === 'line' ? motion.enterLine : motion.enter,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: !isWeb,
    }).start();
  }, [a, delay, from]);
  const anim =
    from === 'settle'
      ? { opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }
      : {
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [from === 'line' ? 28 : 12, 0] }) }],
        };
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------- Brand mark + wordmark

/** Dealt mark: `initial` — the name's first letter on a small accent tile. */
export function Mark({ size = 28 }: { size?: number }) {
  const { c } = useApp();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        // The brand tile keeps the lime in both grades; the letter stays near-black on it.
        backgroundColor: LIME,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: font.semibold, fontSize: size * 0.6, lineHeight: size * 0.75, color: '#0f0f0f', marginTop: -size * 0.02 }}>S</Text>
    </View>
  );
}

export function Wordmark({ size = 20 }: { size?: number }) {
  const { c } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
      <Mark size={Math.round(size * 1.4)} />
      <Text style={{ fontFamily: font.medium, fontSize: size, letterSpacing: -size * 0.02, color: c.ink }}>SIGNOVA</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Section label (13px / 500, sentence case)

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useApp();
  return <Text style={[type.label, { color: c.muted }, style]}>{children}</Text>;
}

// ---------------------------------------------------------------- helpers

/** Mix two hex colours (a toward b by t). */
export function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  if (!pa || !pb) return a;
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
function hex(h: string) {
  const s = h.replace('#', '');
  if (s.length !== 6) return null;
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
