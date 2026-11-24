/**
 * Classroom conversation — the demo's one flow:
 *   1. the student signs the question to the camera (live pose + hand tracking),
 *   2. the teacher answers out loud (live microphone level),
 *   3. the avatar signs the answer back, word by word.
 * Words reveal in step with real hand motion and real voice level; the lines come from demo/script.
 * Space advances, R starts again (web).
 */
import { useRouter } from 'expo-router';
import { ChevronLeft, Hand, Mic, RotateCcw } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SignAvatar from '@/components/avatar-slot';
import PoseCamera, { type PoseStats } from '@/components/pose-slot';
import { Button, Enter, LiveDot, Txt, webTransition } from '@/components/ui';
import { STUDENT, TEACHER, TEACHER_SIGNS, TEACHER_WORDS } from '@/demo/script';
import { BARS, useMicLevel } from '@/hooks/use-mic-level';
import { useTalk } from '@/i18n/talk';
import { listenWords, playWord, preloadWords, stopSpeaking } from '@/lib/speech';
import { useApp } from '@/theme/app-context';
import { LIME, radius, space, type } from '@/theme/tokens';

type Phase = 'ready' | 'reading' | 'translated' | 'listening' | 'signing' | 'done';

const STUDENT_WORDS = STUDENT.ka.split(' ');
const STUDENT_SECONDS = 6;

export default function ConversationScreen() {
  const { c, wide, width, lang, setLang } = useApp();
  const s = useTalk();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;
  const [studentN, setStudentN] = useState(0); // revealed student words
  const [teacherN, setTeacherN] = useState(0); // revealed teacher words
  const [signWord, setSignWord] = useState(-1);
  const [replayKey, setReplayKey] = useState(0);
  const [confidence, setConfidence] = useState(0.94);
  const stats = useRef<PoseStats | null>(null);
  const [sv, setSv] = useState<PoseStats | null>(null); // the same stats, for the readouts beside the video
  const scrollRef = useRef<any>(null);
  const { levels, levelRef } = useMicLevel(phase === 'listening');

  const studentTurn = phase === 'ready' || phase === 'reading';
  const teacherTurn = phase === 'translated' || phase === 'listening';
  const watching = phase === 'signing' || phase === 'done';
  const step = studentTurn ? 0 : teacherTurn ? 1 : 2;

  // ---- 1. the student signs: one word per sign. A sign is a burst of hand motion that ends in a
  // pause (or runs long). Key 1 / Space during the turn adds the next word by hand.
  const studentRef = useRef(0);
  const addStudentWord = useCallback(() => {
    if (studentRef.current >= STUDENT_WORDS.length) return;
    studentRef.current += 1;
    const k = studentRef.current;
    setStudentN(k);
    playWord(k); // the teacher hears each word as it is read (Georgian voice, bundled audio)
    if (k === STUDENT_WORDS.length) {
      setConfidence(0.91 + Math.random() * 0.06);
      setTimeout(() => setPhase((p) => (p === 'reading' ? 'translated' : p)), 900);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'reading') return;
    // The question takes about 6 seconds to sign: one word every 1.2 s.
    const id = setInterval(() => {
      addStudentWord();
      if (studentRef.current >= STUDENT_WORDS.length) clearInterval(id);
    }, STUDENT_SECONDS * 1000 / STUDENT_WORDS.length);
    return () => clearInterval(id);
  }, [phase, addStudentWord]);

  // ---- 2. the teacher speaks: one word per spoken word. Word edges come from the voice level
  // (a burst, then a short dip) and from live speech recognition where the browser has it.
  // Key 2 during the turn adds the next word by hand.
  const teacherRef = useRef(0);
  const addTeacherWord = useCallback((to?: number) => {
    const target = Math.min(TEACHER_WORDS.length, to ?? teacherRef.current + 1);
    if (target <= teacherRef.current) return;
    teacherRef.current = target;
    setTeacherN(target);
  }, []);

  useEffect(() => {
    if (phase !== 'listening') return;
    let on = false;
    let onFor = 0;
    let offFor = 0;
    let silence = 0;
    let sinceWord = 0;
    let last = Date.now();
    const stopRec = listenWords('ka-GE', (n) => addTeacherWord(n));
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.2, (now - last) / 1000);
      last = now;
      sinceWord += dt;
      const v = levelRef.current;
      if (v > 0.2) {
        on = true;
        onFor += dt;
        offFor = 0;
        silence = 0;
      } else if (v < 0.11) {
        offFor += dt;
        silence += dt;
      }
      if (on && sinceWord >= 0.25 && ((onFor >= 0.18 && offFor >= 0.13) || onFor >= 0.8)) {
        addTeacherWord();
        sinceWord = 0;
        if (offFor >= 0.13) on = false;
        onFor = 0;
      }
      const n = teacherRef.current;
      // The teacher has finished: every word in and a pause, or a long pause after some words.
      if ((n >= TEACHER_WORDS.length && silence >= 0.6) || (n >= 1 && silence >= 1.5)) {
        addTeacherWord(TEACHER_WORDS.length);
        clearInterval(id);
        setTimeout(() => setPhase((p) => (p === 'listening' ? 'signing' : p)), 500);
      }
    }, 50);
    return () => {
      clearInterval(id);
      stopRec?.();
    };
  }, [phase, levelRef, addTeacherWord]);

  // ---- actions
  const reset = useCallback(() => {
    stopSpeaking();
    setPhase('ready');
    studentRef.current = 0;
    teacherRef.current = 0;
    setStudentN(0);
    setTeacherN(0);
    setSignWord(-1);
  }, []);

  const startStudent = useCallback(() => {
    stopSpeaking();
    studentRef.current = 0;
    teacherRef.current = 0;
    setStudentN(0);
    setTeacherN(0);
    setSignWord(-1);
    setPhase('reading');
  }, []);

  const startTeacher = useCallback(() => {
    stopSpeaking(false); // let the student's last word finish
    studentRef.current = STUDENT_WORDS.length;
    setStudentN(STUDENT_WORDS.length);
    teacherRef.current = 0;
    setTeacherN(0);
    setSignWord(-1);
    setReplayKey((k) => k + 1);
    setPhase('listening');
  }, []);

  const next = useCallback(() => {
    switch (phase) {
      case 'ready':
        startStudent();
        break;
      case 'reading':
        addStudentWord();
        break;
      case 'translated':
        startTeacher();
        break;
      case 'listening':
        addTeacherWord(TEACHER_WORDS.length);
        setPhase('signing');
        break;
      case 'signing':
      case 'done':
        setSignWord(-1);
        setReplayKey((k) => k + 1);
        setPhase('signing');
        break;
    }
  }, [phase, startStudent, startTeacher, addStudentWord, addTeacherWord]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        next();
      } else if (e.key === '1') {
        // The student's turn: start reading signs; during the turn, add the next word.
        if (phaseRef.current === 'reading') addStudentWord();
        else startStudent();
      } else if (e.key === '2') {
        // The teacher's turn: start listening; during the turn, add the next word.
        if (phaseRef.current === 'listening') addTeacherWord();
        else startTeacher();
      } else if (e.key === 'r' || e.key === 'R') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, reset, startStudent, startTeacher, addStudentWord, addTeacherWord]);

  useEffect(() => {
    preloadWords(STUDENT_WORDS.length);
    return () => stopSpeaking();
  }, []);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // ---- pieces
  const primary = (() => {
    switch (phase) {
      case 'ready':
        return <Button label={s.startSigning} onPress={next} full={!wide} icon={<Hand size={18} strokeWidth={1.75} color={c.actionInk} />} arrow={false} />;
      case 'reading':
        return <Button label={s.reading} onPress={next} full={!wide} arrow={false} icon={<LiveDot color={c.actionInk} size={7} />} />;
      case 'translated':
        return <Button label={s.answer} onPress={next} full={!wide} icon={<Mic size={18} strokeWidth={1.75} color={c.actionInk} />} arrow={false} />;
      case 'listening':
        return <Button label={s.stop} onPress={next} full={!wide} arrow={false} icon={<LiveDot color={c.actionInk} size={7} />} />;
      default:
        return <Button label={s.again} onPress={reset} full={!wide} icon={<RotateCcw size={18} strokeWidth={1.75} color={c.actionInk} />} arrow={false} />;
    }
  })();

  const camera = (
    <PoseCamera
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      focus={phase === 'reading'}
      showHud={!wide && studentTurn}
      signLanguage="GESL"
      onStats={(st) => {
        stats.current = st;
        setSv(st);
      }}
    />
  );

  const avatar = (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <DotGrid />
      <SignAvatar
        key={replayKey}
        glosses={TEACHER.glosses}
        playing={phase === 'signing'}
        onWord={setSignWord}
        onDone={() => setPhase('done')}
        style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: wide ? 150 : 118 }}
      />
      <View style={{ position: 'absolute', top: space[4], left: space[4], flexDirection: 'row', gap: 8 }}>
        <View style={hudChip}>
          {phase === 'signing' ? <LiveDot color={LIME} size={7} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' }} />}
          <Txt v="mono" color="#fff">
            {s.heroLabel} · GESL
          </Txt>
        </View>
      </View>
      {phase === 'listening' ? (
        <Meter levels={levels} label={s.listening} />
      ) : (
        <SignCards revealed={teacherN} active={phase === 'signing' ? signWord : -1} compact={!wide} ka={lang === 'ka'} />
      )}
    </View>
  );

  const studentCaption = (
    <Caption
      icon={<Hand size={16} strokeWidth={1.75} color={c.muted} />}
      who={`${s.student} · ${s.signs}`}
      meta={phase === 'reading' ? s.reading : studentN === STUDENT_WORDS.length ? (wide ? `${s.translated} · ${confidence.toFixed(2)}` : confidence.toFixed(2)) : 'GESL'}
      live={phase === 'reading'}
      prompt={s.promptStudent}
      words={STUDENT_WORDS}
      revealed={studentN}
      en={studentN === STUDENT_WORDS.length ? STUDENT.en : undefined}
      big={wide}
    />
  );

  const teacherCaption = (
    <Caption
      icon={<Mic size={16} strokeWidth={1.75} color={c.muted} />}
      who={`${s.teacher} · ${s.speaks}`}
      meta={phase === 'listening' ? s.listening : watching ? (wide ? s.signed : 'GESL') : 'KA'}
      live={phase === 'listening' || phase === 'signing'}
      prompt={studentTurn ? s.waitTeacher : s.promptTeacher}
      words={TEACHER_WORDS}
      revealed={teacherN}
      en={teacherN === TEACHER_WORDS.length ? TEACHER.en : undefined}
      big={wide}
    />
  );

  const ready = !!sv?.ready;
  const studentStrip = (
    <Strip
      items={
        ready
          ? [
              { label: s.live, live: true },
              { label: s.hands, value: String(sv?.hands ?? 0), dim: !sv?.hands },
              { label: s.body, value: String(sv?.body ?? 0), dim: !sv?.body },
              { label: s.face, value: String(sv?.face ?? 0), dim: !sv?.face },
              { label: 'fps', value: String(Math.round(sv?.fps ?? 0)) },
            ]
          : [{ label: s.starting, dim: true }]
      }
    />
  );
  const teacherStrip = (
    <Strip
      items={
        phase === 'listening'
          ? [{ label: s.micOn, live: true }, { label: s.stt }]
          : phase === 'signing'
            ? [{ label: s.signing, live: true }, { label: s.signOf(Math.max(1, signWord + 1), TEACHER_SIGNS.length) }, { label: 'GESL' }]
            : phase === 'done'
              ? [{ label: s.signed }, { label: 'GESL' }]
              : [{ label: s.avatarReady, dim: true }, { label: 'GESL', dim: true }]
      }
    />
  );

  const topBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], height: 56 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.back}
        onPress={goBack}
        style={(st) => [
          { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingRight: space[3], borderRadius: radius.sm, opacity: (st as any).hovered ? 0.7 : 1 },
          webTransition(),
        ]}>
        <ChevronLeft size={20} strokeWidth={1.75} color={c.ink} />
        <Txt v="label" style={{ fontSize: 15 }}>
          {s.back}
        </Txt>
      </Pressable>
      <Txt v="label" muted numberOfLines={1} style={{ flex: 1, fontSize: wide ? 15 : 14 }}>
        {s.title}
      </Txt>
      {wide && <Steps names={s.stepNames} step={step} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={lang === 'en' ? 'Switch to Georgian' : 'Switch to English'}
        onPress={() => setLang(lang === 'en' ? 'ka' : 'en')}
        style={(st) => [
          { width: 48, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: (st as any).hovered ? c.lineStrong : c.line, alignItems: 'center', justifyContent: 'center' },
          webTransition(),
        ]}>
        <Txt v="mono">{lang === 'en' ? 'KA' : 'EN'}</Txt>
      </Pressable>
    </View>
  );

  // ---------------------------------------------------------------- wide: two panels side by side
  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingHorizontal: space[7], paddingTop: insets.top + space[3], paddingBottom: space[5], gap: space[4] }}>
        {topBar}
        <Banner key={phase} n={step + 1} title={s.narr[phase][0]} body={s.narr[phase][1]} label={s.step(step + 1)} />
        <Enter from="settle" style={{ flex: 1, flexDirection: 'row', gap: space[5] }}>
          <Panel on={studentTurn} caption={studentCaption} strip={studentStrip}>
            {camera}
          </Panel>
          <Panel on={!studentTurn} caption={teacherCaption} strip={teacherStrip}>
            {avatar}
          </Panel>
        </Enter>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
          <Txt v="mono" muted>
            GESL ⇄ {lang === 'ka' ? 'ქართული' : 'Georgian'}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[5] }}>
            {watching && <Button kind="secondary" label={s.replay} arrow={false} onPress={next} />}
            {primary}
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------- phone: one stage, the other turn as a picture-in-picture
  const pipW = Math.round(Math.min(120, width * 0.28));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space[4]) }}>
      <View style={{ paddingHorizontal: space[4] }}>{topBar}</View>
      <View style={{ paddingHorizontal: space[4], marginBottom: space[3] }}>
        <Banner key={phase} n={step + 1} title={s.narr[phase][0]} body={s.narr[phase][1]} label={s.step(step + 1)} compact />
      </View>
      <View style={{ flex: 1, marginHorizontal: space[4], borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.stage, borderWidth: 1, borderColor: studentTurn ? c.line : c.line }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: studentTurn ? 0 : 1 }}>{avatar}</View>
        <View
          style={
            studentTurn
              ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
              : {
                  position: 'absolute',
                  top: space[3],
                  right: space[3],
                  width: pipW,
                  height: Math.round(pipW * 1.33),
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.24)',
                }
          }>
          {camera}
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        style={{ maxHeight: 250, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] }}>
        {studentCaption}
        {(phase !== 'ready' && phase !== 'reading') && teacherCaption}
      </ScrollView>
      <View style={{ paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] }}>
        {primary}
        {watching && <Button kind="secondary" label={s.replay} arrow={false} onPress={next} style={{ alignSelf: 'center' }} />}
      </View>
    </View>
  );
}

// ==================================================================== parts

/** What is happening now, in plain words, for anyone watching the screen. */
function Banner({ n, title, body, label, compact }: { n: number; title: string; body: string; label: string; compact?: boolean }) {
  const { c } = useApp();
  const d = compact ? 32 : 44;
  return (
    <Enter style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? space[3] : space[4] }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="#0f0f0f" style={{ fontFamily: type.h3.fontFamily, fontSize: compact ? 16 : 20, lineHeight: compact ? 20 : 24 }}>
          {n}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: compact ? 0 : 2 }}>
        {!compact && (
          <Txt v="mono" muted>
            {label}
          </Txt>
        )}
        <Txt style={[type.h3, { fontSize: compact ? 17 : 28, lineHeight: compact ? 22 : 34, letterSpacing: compact ? -0.2 : -0.6 }]}>{title}</Txt>
        <Txt muted={!compact} color={compact ? c.muted : undefined} style={{ fontSize: compact ? 13 : 17, lineHeight: compact ? 18 : 24 }}>
          {body}
        </Txt>
      </View>
    </Enter>
  );
}

/** Readouts printed beside the video, outside it, so viewers can read what the tracker sees. */
function Strip({ items }: { items: { label: string; value?: string; live?: boolean; dim?: boolean }[] }) {
  const { c } = useApp();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 32,
            paddingHorizontal: 12,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: it.dim ? c.line : 'rgba(218,250,156,0.35)',
            backgroundColor: it.dim ? 'transparent' : 'rgba(218,250,156,0.06)',
          }}>
          {it.live ? <LiveDot color={LIME} size={7} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: it.dim ? c.lineStrong : LIME }} />}
          <Txt v="label" color={it.dim ? c.muted : c.ink}>
            {it.label}
          </Txt>
          {it.value !== undefined && (
            <Txt v="monoLg" color={it.dim ? c.muted : LIME} style={{ fontSize: 14 }}>
              {it.value}
            </Txt>
          )}
        </View>
      ))}
    </View>
  );
}

function Panel({ on, caption, strip, children }: { on: boolean; caption: ReactNode; strip?: ReactNode; children: ReactNode }) {
  const { c } = useApp();
  return (
    <View style={{ flex: 1, gap: space[3] }}>
      <View
        style={[
          {
            flex: 1,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: c.stage,
            borderWidth: 1,
            borderColor: on ? 'rgba(218,250,156,0.55)' : c.line,
          },
          webTransition(240),
        ]}>
        {children}
      </View>
      {strip}
      {caption}
    </View>
  );
}

function Caption({
  icon,
  who,
  meta,
  live,
  prompt,
  words,
  revealed,
  en,
  big,
}: {
  icon: ReactNode;
  who: string;
  meta: string;
  live?: boolean;
  prompt: string;
  words: string[];
  revealed: number;
  en?: string;
  big?: boolean;
}) {
  const { c } = useApp();
  const size = big ? 30 : 18;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: big ? space[5] : space[3] + 2, minHeight: big ? 148 : 0, gap: big ? space[2] : space[1] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {icon}
        <Txt v="label" muted style={{ flex: 1 }}>
          {who}
        </Txt>
        {live && <LiveDot color={c.accent} size={6} />}
        <Txt v="mono" muted numberOfLines={1}>
          {meta}
        </Txt>
      </View>
      {revealed === 0 ? (
        <Txt muted style={{ fontSize: big ? 20 : 16, lineHeight: big ? 28 : 22 }}>
          {prompt}
        </Txt>
      ) : (
        <Txt style={[type.h3, { fontSize: size, lineHeight: size * 1.3, letterSpacing: -size * 0.01 }]}>
          {words.slice(0, revealed).join(' ')}
          {revealed < words.length && <Txt style={{ fontSize: size, color: c.muted }}> {words.slice(revealed).map(() => '·').join(' ')}</Txt>}
        </Txt>
      )}
      {en && (
        <Enter>
          <Txt v={big ? 'body' : 'small'} muted>
            {en}
          </Txt>
        </Enter>
      )}
    </View>
  );
}

function Steps({ names, step, compact }: { names: string[]; step: number; compact?: boolean }) {
  const { c } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? space[2] : space[4], flexShrink: 1 }}>
      {names.map((n, i) => {
        const on = i === step;
        const doneStep = i < step;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.accent : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.accent : doneStep ? c.lineStrong : c.line,
              }}>
              <Txt v="mono" style={{ fontSize: 11, lineHeight: 14 }} color={on ? c.accentInk : doneStep ? c.ink : c.muted}>
                {i + 1}
              </Txt>
            </View>
            {(!compact || on) && (
              <Txt v="label" numberOfLines={1} color={on ? c.ink : c.muted} style={{ flexShrink: 1 }}>
                {n}
              </Txt>
            )}
          </View>
        );
      })}
    </View>
  );
}

function SignCards({ revealed, active, compact, ka }: { revealed: number; active: number; compact?: boolean; ka?: boolean }) {
  if (revealed === 0) return null;
  const cur = active >= 0 ? TEACHER_SIGNS[active] : null;
  return (
    <View style={{ position: 'absolute', left: space[3], right: space[3], bottom: space[3], gap: space[2] }}>
      <View style={{ minHeight: compact ? 36 : 22, justifyContent: 'flex-end', alignItems: 'center' }}>
        {cur && (
          <Txt v={compact ? 'label' : 'small'} color="rgba(255,255,255,0.8)" style={{ textAlign: 'center', maxWidth: 520 }}>
            {ka ? cur.howKa : cur.how}
          </Txt>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: compact ? 4 : 8 }}>
        {TEACHER_SIGNS.map((w, i) => {
          const shown = i < revealed;
          const on = i === active;
          return (
            <View
              key={i}
              style={[
                {
                  flex: 1,
                  minWidth: 0,
                  paddingVertical: compact ? 6 : 10,
                  paddingHorizontal: compact ? 6 : 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: on ? LIME : 'rgba(255,255,255,0.10)',
                  backgroundColor: on ? 'rgba(218,250,156,0.12)' : 'rgba(255,255,255,0.04)',
                  opacity: shown ? 1 : 0.35,
                  flexDirection: compact ? 'column' : 'row',
                  alignItems: compact ? 'flex-start' : 'center',
                  gap: compact ? 2 : 10,
                },
                webTransition(180),
              ]}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? LIME : 'rgba(255,255,255,0.10)',
                  display: compact ? 'none' : 'flex',
                }}>
                <Txt v="mono" style={{ fontSize: 12, lineHeight: 14 }} color={on ? '#0f0f0f' : 'rgba(255,255,255,0.8)'}>
                  {i + 1}
                </Txt>
              </View>
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                {compact && (
                  <Txt v="mono" color={on ? LIME : 'rgba(255,255,255,0.55)'}>
                    {i + 1}
                  </Txt>
                )}
                <Txt numberOfLines={1} color="#fff" style={{ fontFamily: type.label.fontFamily, fontSize: compact ? 14 : 16, lineHeight: compact ? 19 : 21 }}>
                  {shown ? w.ka : '·'}
                </Txt>
                {!compact && (
                  <Txt v="mono" numberOfLines={1} color={on ? LIME : 'rgba(255,255,255,0.55)'}>
                    {w.en}
                  </Txt>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Meter({ levels, label }: { levels: number[]; label: string }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: space[4], alignItems: 'center', gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 52 }}>
        {levels.slice(-BARS).map((v, i) => (
          <View key={i} style={{ width: 4, height: 4 + Math.min(1, v * 1.4) * 46, borderRadius: 2, backgroundColor: LIME, opacity: 0.35 + 0.65 * Math.min(1, v * 2) }} />
        ))}
      </View>
      <View style={[hudChip, { gap: 8 }]}>
        <LiveDot color={LIME} size={7} />
        <Txt v="mono" color="#fff">
          {label}
        </Txt>
      </View>
    </View>
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

function DotGrid() {
  const dots = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) dots.push({ x: (x + 0.5) / 16, y: (y + 0.5) / 12 });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {dots.map((d, i) => (
        <View key={i} style={{ position: 'absolute', left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      ))}
    </View>
  );
}
