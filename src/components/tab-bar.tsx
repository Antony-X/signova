/**
 * One navigation: a left rail on wide screens, a bottom bar on phones.
 * Opaque ground and a 1px hairline from the first paint; no blur, no floating pill.
 */
import type { Tabs } from 'expo-router';
import { BookOpen, Clock3, MessagesSquare, Settings2, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { webTransition } from '@/components/ui';
import { useApp } from '@/theme/app-context';
import { radius, space, type } from '@/theme/tokens';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const ICONS: Record<string, LucideIcon> = {
  index: MessagesSquare,
  learning: BookOpen,
  history: Clock3,
  profile: Settings2,
};

type PState = { pressed: boolean; hovered?: boolean };

export function TabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const { c, wide, lang, setLang } = useApp();
  const insets = useSafeAreaInsets();

  const items = state.routes.map((route, index) => {
    const focused = index === state.index;
    const { options } = descriptors[route.key];
    const label = (typeof options.title === 'string' ? options.title : route.name) as string;
    const Icon = ICONS[route.name] ?? MessagesSquare;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={(s) => {
          const { hovered, pressed } = s as PState;
          return [
            {
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: radius.md,
              ...(wide ? { width: 72, height: 64 } : { flex: 1, height: 56 }),
              backgroundColor: focused && wide ? c.surface : hovered ? c.surface : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            webTransition(),
          ];
        }}>
        <Icon size={22} strokeWidth={1.75} color={focused ? c.ink : c.muted} />
        <Text numberOfLines={1} style={[type.label, { fontSize: 12, lineHeight: 16, color: focused ? c.ink : c.muted }]}>
          {label}
        </Text>
      </Pressable>
    );
  });

  const langToggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lang === 'en' ? 'Switch to Georgian' : 'Switch to English'}
      onPress={() => setLang(lang === 'en' ? 'ka' : 'en')}
      style={(s) => {
        const { hovered } = s as PState;
        return [
          {
            width: 48,
            height: 44,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: hovered ? c.lineStrong : c.line,
            alignItems: 'center',
            justifyContent: 'center',
          },
          webTransition(),
        ];
      }}>
      <Text style={[type.mono, { color: c.ink }]}>{lang === 'en' ? 'KA' : 'EN'}</Text>
    </Pressable>
  );

  if (wide) {
    return (
      <View
        style={{
          width: 88,
          paddingTop: insets.top + space[5],
          paddingBottom: insets.bottom + space[5],
          backgroundColor: c.bg,
          borderRightWidth: 1,
          borderRightColor: c.line,
          alignItems: 'center',
          gap: space[2],
        }}>
        {items}
        <View style={{ flex: 1 }} />
        {langToggle}
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: space[2],
        paddingTop: space[1],
        paddingBottom: Math.max(insets.bottom, space[2]),
        backgroundColor: c.bg,
        borderTopWidth: 1,
        borderTopColor: c.line,
      }}>
      {items}
    </View>
  );
}
