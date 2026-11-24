import { router } from 'expo-router';
import { ArrowRight, CaseSensitive, ChevronLeft, GraduationCap, MessageCircle, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Enter, Txt } from '@/components/ui';
import { usePageFrame, useScreens, type LessonKey } from '@/i18n/screens';
import { useApp } from '@/theme/app-context';
import { radius, space } from '@/theme/tokens';

const CATS: { key: LessonKey; Icon: LucideIcon }[] = [
  { key: 'alphabet', Icon: CaseSensitive },
  { key: 'basics', Icon: MessageCircle },
  { key: 'school', Icon: GraduationCap },
];

export default function LessonsScreen() {
  const { c } = useApp();
  const s = useScreens().lessons;
  const { gutter, maxWidth, narrow, wide } = usePageFrame();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<LessonKey | null>(null);

  const cat = open ? s.cats[open] : null;
  const items = open ? s.items[open] : [];

  return (
    <ScrollView
      key={open ?? 'all'}
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        paddingTop: wide ? space[7] : insets.top + space[5],
        paddingBottom: space[8],
        paddingHorizontal: gutter,
      }}>
      <View style={{ width: '100%', maxWidth }}>
        {cat ? (
          <>
            <Enter from="line">
              <Button
                kind="secondary"
                arrow={false}
                label={s.back}
                icon={<ChevronLeft size={18} strokeWidth={1.75} color={c.ink} />}
                onPress={() => setOpen(null)}
                style={{ marginLeft: -space[1], marginBottom: space[4] }}
              />
              <Txt v="h2">{cat.title}</Txt>
              <Txt v="lead" muted style={{ marginTop: space[2] }}>
                {cat.line}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: space[5], marginTop: space[3] }}>
                <Txt v="mono" muted>
                  {s.meta(items.length, cat.min)}
                </Txt>
                <Button kind="secondary" label={s.practice} onPress={() => router.push('/')} style={{ marginLeft: -space[1] }} />
              </View>
            </Enter>
            <Enter delay={120} style={{ marginTop: space[6], gap: space[4] }}>
              {rows(items, wide ? 2 : 1).map((row, r) => (
                <View key={r} style={{ flexDirection: 'row', gap: space[4] }}>
                  {row.map((it, i) => (
                    <Card key={it.id} style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[3] }}>
                        <Txt v="mono" muted style={{ width: 22 }}>
                          {String(r * (wide ? 2 : 1) + i + 1).padStart(2, '0')}
                        </Txt>
                        <Txt v="h3" style={{ flex: 1 }}>
                          {it.name}
                        </Txt>
                      </View>
                      <Txt style={{ marginTop: space[2], marginLeft: 22 + space[3] }}>{it.how}</Txt>
                    </Card>
                  ))}
                  {wide && row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </Enter>
          </>
        ) : (
          <>
            <Enter from="line">
              <Txt v="h2">{s.title}</Txt>
              <Txt v="lead" muted style={{ marginTop: space[2] }}>
                {s.sub}
              </Txt>
            </Enter>
            <Enter delay={120} style={{ marginTop: space[6], flexDirection: wide ? 'row' : 'column', gap: space[4] }}>
              {CATS.map(({ key, Icon }) => {
                const k = s.cats[key];
                const meta = s.meta(s.items[key].length, k.min);
                const tile = (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: c.raised,
                      borderWidth: 1,
                      borderColor: c.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon size={20} strokeWidth={1.75} color={c.ink} />
                  </View>
                );
                return (
                  <Card key={key} onPress={() => setOpen(key)} accessibilityLabel={k.title} style={wide ? { flex: 1 } : null}>
                    {wide ? (
                      <>
                        {tile}
                        <Txt v="h3" style={{ marginTop: space[5] }}>
                          {k.title}
                        </Txt>
                        <Txt style={{ marginTop: space[1] }}>{k.line}</Txt>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: space[5] }}>
                          <Txt v="mono" muted>
                            {meta}
                          </Txt>
                          <ArrowRight size={16} strokeWidth={1.75} color={c.muted} />
                        </View>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
                        {tile}
                        <View style={{ flex: 1 }}>
                          <Txt v="h3">{k.title}</Txt>
                          <Txt style={{ marginTop: 2 }}>{k.line}</Txt>
                          <Txt v="mono" muted style={{ marginTop: space[2] }}>
                            {meta}
                          </Txt>
                        </View>
                        {!narrow && <ArrowRight size={16} strokeWidth={1.75} color={c.muted} />}
                      </View>
                    )}
                  </Card>
                );
              })}
            </Enter>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function rows<T>(list: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}
