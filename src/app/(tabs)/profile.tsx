import { useContext } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { dict } from '../../translations';
import { LanguageContext } from '../_layout';

export default function ProfileScreen() {
  const { lang, setLang, isDark, setIsDark } = useContext(LanguageContext);
  const t = dict[lang] || dict.en;

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, isDark && styles.textDark]}>{t.profileTitle}</Text>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, isDark && styles.textDark]}>{t.themeToggle}</Text>
          <Switch
            value={isDark}
            onValueChange={setIsDark}
            trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
            thumbColor={'#ffffff'}
          />
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{t.langSelect}</Text>
        <View style={styles.langButtons}>
          <TouchableOpacity
            style={[styles.button, isDark && styles.buttonDark, lang === 'en' && styles.buttonActive]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark, lang === 'en' && styles.textActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isDark && styles.buttonDark, lang === 'ka' && styles.buttonActive]}
            onPress={() => setLang('ka')}
          >
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark, lang === 'ka' && styles.textActive]}>
              ქართული
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 28, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 20, elevation: 2, maxWidth: 640 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 17, color: '#0f172a', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 18 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 12, fontWeight: '600' },
  langButtons: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center' },
  buttonActive: { backgroundColor: '#2563eb' },
  buttonText: { fontSize: 15, color: '#475569', fontWeight: '700' },
  textActive: { color: '#ffffff' },

  containerDark: { backgroundColor: '#020617' },
  cardDark: { backgroundColor: '#0f172a' },
  textDark: { color: '#f8fafc' },
  dividerDark: { backgroundColor: '#1e293b' },
  subtitleDark: { color: '#94a3b8' },
  buttonDark: { backgroundColor: '#1e293b' },
  buttonTextDark: { color: '#cbd5e1' },
});