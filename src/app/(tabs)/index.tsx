import { CameraView, useCameraPermissions } from 'expo-camera';
import { useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { dict } from '../../translations';
import { LanguageContext } from '../_layout';

export default function TranslateScreen() {
  const { lang, isDark } = useContext(LanguageContext);
  const t = dict[lang] || dict.en;
  const [permission, requestPermission] = useCameraPermissions();

  const [activeMode, setActiveMode] = useState<'textVoice' | 'gesture' | null>(null);
  const [direction, setDirection] = useState<'g2t' | 't2g'>('g2t');
  const [textLang, setTextLang] = useState('EN');
  const [signLang, setSignLang] = useState('GESL');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState(t.waiting);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    setTranslatedText(t.waiting);
    setDemoIndex(0);
  }, [lang, activeMode]);

  const handleNextDemo = () => {
    const phrases = t.demoPhrases || ['Hello! I have a question about the lesson.'];
    setTranslatedText(phrases[demoIndex % phrases.length]);
    setDemoIndex((prev) => prev + 1);
  };

  if (activeMode === null) {
    return (
      <ScrollView
        style={[styles.fullBg, isDark && styles.bgDark]}
        contentContainerStyle={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, isDark && styles.textDark]}>{t.title}</Text>
        <Text style={[styles.subtitle, isDark && styles.subTextDark]}>{t.subtitle}</Text>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[styles.modeCard, isDark && styles.cardDark]}
            onPress={() => setActiveMode('textVoice')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, isDark && styles.iconCircleDark]}>
              <Text style={styles.modeCardIcon}>💬</Text>
            </View>
            <Text style={[styles.modeCardText, isDark && styles.textDark]}>{t.modeTextVoice}</Text>
            <Text style={[styles.modeCardDesc, isDark && styles.subTextDark]}>{t.modeTextVoiceDesc}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, isDark && styles.cardDark]}
            onPress={() => setActiveMode('gesture')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, isDark && styles.iconCircleDark]}>
              <Text style={styles.modeCardIcon}>🤲</Text>
            </View>
            <Text style={[styles.modeCardText, isDark && styles.textDark]}>{t.modeGesture}</Text>
            <Text style={[styles.modeCardDesc, isDark && styles.subTextDark]}>{t.modeGestureDesc}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!permission) return <View style={[styles.fullBg, isDark && styles.bgDark]} />;
  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, isDark && styles.bgDark]}>
        <Text style={[styles.alertText, isDark && styles.textDark]}>{t.needCamera}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>{t.allowCamera}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.bgDark]}>
      <View style={styles.mediaColumn}>
        {activeMode === 'textVoice' && direction === 't2g' ? (
          <View style={styles.avatarSection}>
            <Text style={styles.avatarEmoji}>🤖</Text>
            <Text style={styles.avatarText}>{t.avatarMock}</Text>
            {inputText.length > 0 && (
              <View style={styles.avatarBubble}>
                <Text style={styles.avatarBubbleText}>"{inputText}"</Text>
              </View>
            )}
          </View>
        ) : (
          <CameraView style={styles.camera} facing="front" />
        )}
      </View>

      <ScrollView
        style={styles.controlsColumn}
        contentContainerStyle={styles.controlsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backButton, isDark && styles.btnDark]} onPress={() => setActiveMode(null)}>
            <Text style={[styles.backButtonText, isDark && styles.btnTextDark]}>{t.backBtn}</Text>
          </TouchableOpacity>
          <Text style={[styles.activeModeTitle, isDark && styles.textDark]} numberOfLines={1}>
            {activeMode === 'textVoice' ? t.modeTextVoice : t.modeGesture}
          </Text>
        </View>

        {activeMode === 'textVoice' && (
          <View style={styles.configArea}>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.pill, isDark && styles.btnDark, direction === 'g2t' && styles.pillActive]}
                onPress={() => setDirection('g2t')}
              >
                <Text style={[styles.pillText, isDark && styles.btnTextDark, direction === 'g2t' && styles.pillTextActive]}>
                  {t.dirG2T}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, isDark && styles.btnDark, direction === 't2g' && styles.pillActive]}
                onPress={() => setDirection('t2g')}
              >
                <Text style={[styles.pillText, isDark && styles.btnTextDark, direction === 't2g' && styles.pillTextActive]}>
                  {t.dirT2G}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, isDark && styles.subTextDark]}>{t.textLangTitle}</Text>
            <View style={styles.toggleRow}>
              {['EN', 'KA'].map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.pill, isDark && styles.btnDark, textLang === l && styles.pillActive]}
                  onPress={() => setTextLang(l)}
                >
                  <Text style={[styles.pillText, isDark && styles.btnTextDark, textLang === l && styles.pillTextActive]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeMode === 'gesture' && (
          <View style={styles.configArea}>
            <Text style={[styles.label, isDark && styles.subTextDark]}>{t.signLangTitle}</Text>
            <View style={styles.toggleRow}>
              {['GESL', 'ASL'].map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.pill, isDark && styles.btnDark, signLang === l && styles.pillActive]}
                  onPress={() => setSignLang(l)}
                >
                  <Text style={[styles.pillText, isDark && styles.btnTextDark, signLang === l && styles.pillTextActive]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeMode === 'textVoice' && direction === 't2g' ? (
          <View>
            <TextInput
              style={[styles.textInput, isDark && styles.inputDark]}
              placeholder={t.typeText}
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Text style={[styles.label, isDark && styles.subTextDark]}>{t.quickExamplesTitle}</Text>
            <View style={styles.chipsWrap}>
              {(t.teacherExamples || []).map((phrase: string, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.chip, isDark && styles.btnDark]}
                  onPress={() => setInputText(phrase)}
                >
                  <Text style={[styles.chipText, isDark && styles.btnTextDark]}>{phrase}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <View style={[styles.chatBox, isDark && styles.cardDark]}>
              <Text style={[styles.translationText, isDark && styles.textDark]}>{translatedText}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleNextDemo}>
              <Text style={styles.buttonText}>{t.testBtn}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullBg: { flex: 1, backgroundColor: '#f8fafc' },
  menuContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 6, marginBottom: 28 },
  cardsRow: { flexDirection: 'row', gap: 20, width: '100%', maxWidth: 680, justifyContent: 'center' },
  modeCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircleDark: { backgroundColor: '#1e293b' },
  modeCardIcon: { fontSize: 32 },
  modeCardText: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  modeCardDesc: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },

  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertText: { fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#0f172a' },

  mediaColumn: { flex: 1.05, backgroundColor: '#000' },
  camera: { flex: 1 },
  avatarSection: { flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', padding: 20 },
  avatarEmoji: { fontSize: 52, marginBottom: 12 },
  avatarText: { color: '#cbd5e1', fontSize: 18, fontWeight: '600', textAlign: 'center', lineHeight: 26 },
  avatarBubble: { marginTop: 16, backgroundColor: '#0f172a', padding: 12, borderRadius: 12, maxWidth: '90%' },
  avatarBubbleText: { color: '#93c5fd', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },

  controlsColumn: { flex: 1 },
  controlsContent: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#e2e8f0', borderRadius: 10 },
  backButtonText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  activeModeTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 },

  configArea: { marginBottom: 12 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pill: { flex: 1, paddingVertical: 10, backgroundColor: '#e2e8f0', borderRadius: 12, alignItems: 'center' },
  pillActive: { backgroundColor: '#2563eb' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  pillTextActive: { color: '#ffffff' },

  chatBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    minHeight: 100,
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 2,
  },
  textInput: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    minHeight: 90,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 14,
    color: '#0f172a',
    elevation: 2,
  },
  chipsWrap: { gap: 8, marginBottom: 14 },
  chip: { backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  chipText: { fontSize: 13, color: '#334155', fontWeight: '500' },

  translationText: { fontSize: 18, color: '#1e293b', lineHeight: 26 },
  button: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  bgDark: { backgroundColor: '#020617' },
  textDark: { color: '#f8fafc' },
  subTextDark: { color: '#94a3b8' },
  cardDark: { backgroundColor: '#0f172a' },
  btnDark: { backgroundColor: '#1e293b' },
  btnTextDark: { color: '#cbd5e1' },
  inputDark: { backgroundColor: '#0f172a', color: '#f8fafc' },
});