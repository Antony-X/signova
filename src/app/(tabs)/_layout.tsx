import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useContext } from 'react';
import { dict } from '../../translations';
import { LanguageContext } from '../_layout';

export default function TabLayout() {
  const { lang, isDark } = useContext(LanguageContext);
  const t = dict[lang];

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#3b82f6', 
      tabBarInactiveTintColor: isDark ? '#9ca3af' : '#8a8a8a',
      tabBarStyle: {
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderTopColor: isDark ? '#1f2937' : '#e5e7eb',
      },
      headerShown: false 
    }}>
      <Tabs.Screen name="index" options={{ title: t.translateTab, tabBarIcon: ({ color }) => <FontAwesome name="hand-paper-o" size={24} color={color} /> }} />
      <Tabs.Screen name="learning" options={{ title: t.learningTab, tabBarIcon: ({ color }) => <FontAwesome name="graduation-cap" size={24} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: t.historyTab, tabBarIcon: ({ color }) => <FontAwesome name="history" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t.profileTab, tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} /> }} />
    </Tabs>
  );
}