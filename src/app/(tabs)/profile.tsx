import { Captions, Gauge, Hand, Languages, Moon, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Enter, Label, Segmented, Txt, webTransition } from '@/components/ui';
import { usePageFrame, useScreens } from '@/i18n/screens';
import { useApp } from '@/theme/app-context';
import { motion, radius, space } from '@/theme/tokens';

type Speed = 'slow' | 'normal' | 'fast';

export default function SettingsScreen() {
  const { c, lang, setLang, isDark, setIsDark } = useApp();
  const s = useScreens().settings;
  const { gutter, narrow, wide } = usePageFrame();
  const insets = useSafeAreaInsets();
  const [signLang, setSignLang] = useState<'gesl' | 'asl'>('gesl');
  const [captions, setCaptions] = useState(true);
  const [speed, setSpeed] = useState<Speed>('normal');

  const groups: { label: string; rows: ReactNode[] }[] = [
    {
      label: s.groupLanguage,
      rows: [
        <Row key="app" Icon={Languages} title={s.appLang} sub={s.appLangSub} stack={narrow}>
          <Segmented
            options={[
              { value: 'en', label: 'English' },
              { value: 'ka', label: 'ქართული' },
            ]}
            value={lang}
            onChange={setLang}
            style={narrow ? null : { width: 232 }}
          />
        </Row>,
        <Row key="sign" Icon={Hand} title={s.signLang} sub={s.signLangSub} stack={narrow}>
          <Segmented
            options={[
              { value: 'gesl', label: 'GESL' },
              { value: 'asl', label: 'ASL' },
            ]}
            value={signLang}
            onChange={setSignLang}
            style={narrow ? null : { width: 232 }}
          />
        </Row>,
      ],
    },
    {
      label: s.groupDisplay,
      rows: [
        <Row key="dark" Icon={Moon} title={s.dark} sub={s.darkSub} toggle={{ value: isDark, onChange: setIsDark }}>
          <Toggle value={isDark} />
        </Row>,
        <Row key="cap" Icon={Captions} title={s.captions} sub={s.captionsSub} toggle={{ value: captions, onChange: setCaptions }}>
          <Toggle value={captions} />
        </Row>,
      ],
    },
    {
      label: s.groupAvatar,
      rows: [
        <Row key="speed" Icon={Gauge} title={s.speed} sub={s.speedSub} stack={narrow}>
          <Segmented
            options={[
              { value: 'slow', label: s.slow },
              { value: 'normal', label: s.normal },
              { value: 'fast', label: s.fast },
            ]}
            value={speed}
            onChange={setSpeed}
            style={narrow ? null : { width: 312 }}
          />
        </Row>,
      ],
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        paddingTop: wide ? space[7] : insets.top + space[5],
        paddingBottom: space[8],
        paddingHorizontal: gutter,
      }}>
      <View style={{ width: '100%', maxWidth: 760 }}>
        <Enter from="line">
          <Txt v="h2">{s.title}</Txt>
        </Enter>
        <Enter delay={120} style={{ marginTop: space[6], gap: space[6] }}>
          {groups.map((g) => (
            <View key={g.label}>
              <Label style={{ marginBottom: space[3] }}>{g.label}</Label>
              <Card padded={false}>
                {g.rows.map((row, i) => (
                  <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : null}>
                    {row}
                  </View>
                ))}
              </Card>
            </View>
          ))}
          <Txt v="small" muted>
            {s.footer}
          </Txt>
        </Enter>
      </View>
    </ScrollView>
  );
}

/**
 * One settings row: icon, title and a short line on the left, the control on the right (below it on phones).
 * A switch row is one tap target: the whole row flips the switch.
 */
function Row({
  Icon,
  title,
  sub,
  stack,
  toggle,
  children,
}: {
  Icon: LucideIcon;
  title: string;
  sub: string;
  stack?: boolean;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  children: ReactNode;
}) {
  const { c } = useApp();
  const text = (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
      <Icon size={20} strokeWidth={1.75} color={c.muted} />
      <View style={{ flex: 1 }}>
        <Txt>{title}</Txt>
        <Txt v="small" muted>
          {sub}
        </Txt>
      </View>
    </View>
  );
  const style = {
    minHeight: 72,
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    flexDirection: stack ? 'column' : 'row',
    alignItems: stack ? 'stretch' : 'center',
    gap: stack ? space[4] : space[5],
  } as const;
  if (!toggle) {
    return (
      <View style={style}>
        {text}
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: toggle.value }}
      onPress={() => toggle.onChange(!toggle.value)}
      style={(st) => [style, { backgroundColor: (st as { hovered?: boolean }).hovered ? c.raised : 'transparent' }, webTransition()]}>
      {text}
      {children}
    </Pressable>
  );
}

/** On/off switch drawn from the palette: the accent track when on, a neutral track when off. Its row takes the tap. */
function Toggle({ value }: { value: boolean }) {
  const { c, isDark } = useApp();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, {
      toValue: value ? 1 : 0,
      duration: motion.slide,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [value, x]);
  return (
    <View
      style={{
        width: 48,
        height: 28,
        borderRadius: radius.pill,
        padding: 3,
        backgroundColor: value ? c.accent : c.lineStrong,
      }}>
      <Animated.View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.pill,
          backgroundColor: value ? c.accentInk : isDark ? c.ink : c.bg,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }}
      />
    </View>
  );
}
