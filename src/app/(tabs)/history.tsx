import { useContext } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { dict } from '../../translations';
import { LanguageContext } from '../_layout';

export default function HistoryScreen() {
  const { lang, isDark } = useContext(LanguageContext);
  const t = dict[lang] || dict.en;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>{t.historyTitle}</Text>

      <FlatList
        data={t.historyItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.historyItem, isDark && styles.itemDark]}>
            <View style={styles.header}>
              <Text style={styles.time}>{item.time}</Text>
              <View style={[styles.badge, isDark && styles.badgeDark]}>
                <Text style={[styles.badgeText, isDark && styles.badgeTextDark]}>{item.type}</Text>
              </View>
            </View>
            <Text style={[styles.text, isDark && styles.textDark]}>{item.text}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 28, paddingTop: 24 },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginBottom: 18 },
  listContent: { paddingBottom: 30 },
  historyItem: { backgroundColor: '#ffffff', padding: 18, borderRadius: 16, marginBottom: 12, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  time: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  text: { fontSize: 16, color: '#1e293b', lineHeight: 22 },

  containerDark: { backgroundColor: '#020617' },
  itemDark: { backgroundColor: '#0f172a' },
  textDark: { color: '#f8fafc' },
  badgeDark: { backgroundColor: '#1e3a8a' },
  badgeTextDark: { color: '#93c5fd' },
});