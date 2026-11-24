import { Hand, Mic } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Enter, Label, Txt } from '@/components/ui';
import { usePageFrame, useScreens, type Message } from '@/i18n/screens';
import { useApp } from '@/theme/app-context';
import { radius, space } from '@/theme/tokens';

export default function HistoryScreen() {
  const { c } = useApp();
  const s = useScreens().history;
  const { gutter, wide } = usePageFrame();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        paddingTop: wide ? space[7] : insets.top + space[5],
        paddingBottom: space[8],
        paddingHorizontal: gutter,
      }}>
      <View style={{ width: '100%', maxWidth: 720 }}>
        <Enter from="line">
          <Txt v="h2">{s.title}</Txt>
          <Txt v="lead" muted style={{ marginTop: space[2] }}>
            {s.sub}
          </Txt>
        </Enter>
        <Enter delay={120} style={{ marginTop: space[6], gap: space[7] }}>
          {s.days.map((day) => (
            <View key={day.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[5] }}>
                <Label>{day.label}</Label>
                <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
              </View>
              <View style={{ gap: space[5] }}>
                {day.items.map((m) => (
                  <Row key={m.id} m={m} who={m.who === 'student' ? s.student : s.teacher} />
                ))}
              </View>
            </View>
          ))}
        </Enter>
      </View>
    </ScrollView>
  );
}

function Row({ m, who }: { m: Message; who: string }) {
  const { c } = useApp();
  const Icon = m.who === 'student' ? Hand : Mic;
  return (
    <View style={{ flexDirection: 'row', gap: space[4] }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.pill,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={16} strokeWidth={1.75} color={c.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 20 }}>
          <Label style={{ flex: 1 }}>{who}</Label>
          <Txt v="mono" muted>
            {m.time}
          </Txt>
        </View>
        <Txt v="lead" style={{ marginTop: space[1] }}>
          {m.ka}
        </Txt>
        <Txt muted>{m.en}</Txt>
      </View>
    </View>
  );
}
