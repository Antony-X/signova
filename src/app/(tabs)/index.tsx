import { useRouter } from 'expo-router';
import { Hand, Mic, ScanEye } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SignAvatar from '@/components/avatar-slot';
import { Button, Enter, LiveDot, Txt, Wordmark } from '@/components/ui';
import { STUDENT } from '@/demo/script';
import { useTalk } from '@/i18n/talk';
import { useApp } from '@/theme/app-context';
import { LIME, radius, space, type } from '@/theme/tokens';

const STEP_ICONS = [Hand, Mic, ScanEye];
const STUDENT_WORDS = STUDENT.ka.split(' ');

export default function HomeScreen() {
  const { c, wide, width, height } = useApp();
  const s = useTalk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [word, setWord] = useState(0);

  const gutter = wide ? space[7] : space[5];
  const h1Size = wide ? Math.min(56, Math.max(40, width * 0.036)) : width < 380 ? 32 : 36;

  const words = (
    <View style={{ gap: wide ? space[5] : space[4] }}>
      <Enter from="line">
        <Txt
          accessibilityRole="header"
          style={[type.display, { fontSize: h1Size, lineHeight: h1Size * 1.06, letterSpacing: -h1Size * 0.03, maxWidth: 620 }]}>
          {s.h1}
        </Txt>
      </Enter>
      <Enter delay={300}>
        <Txt v="lead" style={{ maxWidth: 540, fontSize: wide ? 18 : 16, lineHeight: wide ? 28 : 25 }}>
          {s.lead}
        </Txt>
      </Enter>
      <Enter delay={360} style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', columnGap: space[3], rowGap: 4 }}>
        {s.facts.map((f, i) => (
          <Txt key={i} v="mono" muted>
            {i > 0 && wide ? '·  ' : ''}
            {f}
          </Txt>
        ))}
      </Enter>
      <Enter delay={420} style={{ flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: wide ? space[5] : space[3], marginTop: space[2] }}>
        <Button label={s.start} onPress={() => router.push('/conversation')} full={!wide} />
        <Button label={s.practise} kind="secondary" onPress={() => router.push('/learning')} style={wide ? undefined : { alignSelf: 'center' }} />
      </Enter>
    </View>
  );

  const steps = (
    <Enter delay={480} style={{ borderTopWidth: 1, borderTopColor: c.line }}>
      {s.steps.map((st, i) => {
        const Icon = STEP_ICONS[i];
        return (
          <View
            key={i}
            style={{ flexDirection: 'row', gap: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: c.line, alignItems: 'flex-start' }}>
            <Txt v="mono" muted style={{ width: 24, paddingTop: 2 }}>
              0{i + 1}
            </Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="body" style={{ fontFamily: type.label.fontFamily }}>
                {st.title}
              </Txt>
              <Txt v="small" muted>
                {st.body}
              </Txt>
            </View>
            <Icon size={20} strokeWidth={1.75} color={c.muted} />
          </View>
        );
      })}
    </Enter>
  );

  const stage = (
    <Enter from="settle" style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          minHeight: wide ? undefined : Math.min(420, Math.max(300, width * 0.95)),
          backgroundColor: c.stage,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.line,
          overflow: 'hidden',
        }}>
        <DotGrid />
        <SignAvatar glosses={STUDENT.glosses} playing loop onWord={setWord} style={{ position: 'absolute', top: 40, left: 0, right: 0, bottom: 72 }} />
        {/* HUD */}
        <View style={{ position: 'absolute', top: space[4], left: space[4], right: space[4], flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={hudChip}>
            <LiveDot color={LIME} size={7} />
            <Txt v="mono" color="#fff">
              {s.heroLabel} · GESL
            </Txt>
          </View>
          <View style={hudChip}>
            <Txt v="mono" color="rgba(255,255,255,0.7)">
              {String(word + 1).padStart(2, '0')} / {String(STUDENT_WORDS.length).padStart(2, '0')}
            </Txt>
          </View>
        </View>
        <View style={{ position: 'absolute', left: space[4], right: space[4], bottom: space[4], flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {STUDENT_WORDS.map((w, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 10,
                height: 32,
                borderRadius: radius.sm,
                justifyContent: 'center',
                backgroundColor: i === word ? LIME : 'rgba(255,255,255,0.06)',
              }}>
              <Txt v="small" color={i === word ? '#0f0f0f' : 'rgba(255,255,255,0.72)'} style={{ fontFamily: type.label.fontFamily }}>
                {w}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </Enter>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, flexDirection: 'row', padding: gutter, paddingTop: insets.top + space[6], gap: space[7] }}>
        <ScrollView style={{ flex: 1, maxWidth: 600 }} contentContainerStyle={{ flexGrow: 1, gap: space[7], justifyContent: 'space-between' }} showsVerticalScrollIndicator={false}>
          <Wordmark />
          {words}
          {steps}
        </ScrollView>
        <View style={{ flex: 1.1, minHeight: Math.min(760, height - insets.top - gutter * 2) }}>{stage}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: insets.top + space[4], paddingBottom: space[7], gap: space[6] }}
      showsVerticalScrollIndicator={false}>
      <Wordmark size={18} />
      {words}
      <View style={{ height: Math.min(440, Math.max(320, width * 1.0)) }}>{stage}</View>
      {steps}
    </ScrollView>
  );
}

const hudChip = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
  height: 30,
  paddingHorizontal: 10,
  borderRadius: radius.sm,
  backgroundColor: 'rgba(255,255,255,0.06)',
};

/** A faint dot grid on the stage: the floor the avatar stands on. */
function DotGrid() {
  const dots = [];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 18; x++) dots.push({ x: (x + 0.5) / 18, y: (y + 0.5) / 14 });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${d.x * 100}%`,
            top: `${d.y * 100}%`,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.07)',
          }}
        />
      ))}
    </View>
  );
}
