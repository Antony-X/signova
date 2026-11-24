import { useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { dict } from '../../translations';
import { LanguageContext } from '../_layout';

type CategoryKey = 'alphabet' | 'basics' | 'medical';

export default function LearningScreen() {
  const { lang, isDark } = useContext(LanguageContext);
  const t = dict[lang] || dict.en;
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  const categories: { key: CategoryKey; icon: string; title: string; desc: string }[] = [
    { key: 'alphabet', icon: '🔤', title: t.catAlphabet, desc: t.catAlphabetDesc },
    { key: 'basics', icon: '👋', title: t.catBasics, desc: t.catBasicsDesc },
    { key: 'medical', icon: '🏥', title: t.catMedical, desc: t.catMedicalDesc },
  ];

  if (selectedCategory) {
    const activeCat = categories.find((c) => c.key === selectedCategory);
    const items = t.lessons[selectedCategory] || [];

    return (
      <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, isDark && styles.btnDark]} onPress={() => setSelectedCategory(null)}>
            <Text style={[styles.backBtnText, isDark && styles.btnTextDark]}>{t.backBtn}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, isDark && styles.textDark]}>{activeCat?.title}</Text>
        </View>

        <View style={styles.grid}>
          {items.map((item: { id: string; title: string; desc: string }) => (
            <View key={item.id} style={[styles.lessonCard, isDark && styles.cardDark]}>
              <Text style={[styles.lessonTitle, isDark && styles.textDark]}>{item.title}</Text>
              <Text style={[styles.lessonDesc, isDark && styles.subTextDark]}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, isDark && styles.textDark]}>{t.learningTitle}</Text>
      <Text style={[styles.subtitle, isDark && styles.subTextDark]}>{t.learningSub}</Text>

      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.card, isDark && styles.cardDark]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, isDark && styles.iconBoxDark]}>
              <Text style={styles.icon}>{cat.icon}</Text>
            </View>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>{cat.title}</Text>
            <Text style={[styles.cardDesc, isDark && styles.subTextDark]}>{cat.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 28, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 4, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  card: {
    width: '31%',
    minWidth: 190,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 22,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBoxDark: { backgroundColor: '#1e293b' },
  icon: { fontSize: 28 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },

  backBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#e2e8f0', borderRadius: 10 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  lessonCard: {
    width: '31%',
    minWidth: 200,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 18,
    elevation: 2,
  },
  lessonTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  lessonDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },

  containerDark: { backgroundColor: '#020617' },
  textDark: { color: '#f8fafc' },
  subTextDark: { color: '#94a3b8' },
  cardDark: { backgroundColor: '#0f172a' },
  btnDark: { backgroundColor: '#1e293b' },
  btnTextDark: { color: '#cbd5e1' },
});