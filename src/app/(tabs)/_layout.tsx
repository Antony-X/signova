import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { useApp } from '@/theme/app-context';

export default function TabLayout() {
  const { t, c, wide } = useApp();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: t.translateTab }} />
      <Tabs.Screen name="learning" options={{ title: t.learningTab }} />
      <Tabs.Screen name="history" options={{ title: t.historyTab }} />
      <Tabs.Screen name="profile" options={{ title: t.profileTab }} />
    </Tabs>
  );
}
