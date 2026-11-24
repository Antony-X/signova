import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppContext, AppProvider, useApp } from '@/theme/app-context';

/** Kept for older imports: the language/theme context now lives in `@/theme/app-context`. */
export const LanguageContext = AppContext;

function Shell() {
  const { c, isDark } = useApp();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'SIGNOVA: sign language translator for the classroom';
    document.body.style.backgroundColor = c.bg;
    document.documentElement.style.backgroundColor = c.bg;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = c.bg;
  }, [c.bg, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  return (
    <SafeAreaProvider>
      <AppProvider>{loaded ? <Shell /> : <View style={{ flex: 1, backgroundColor: '#0f0f0f' }} />}</AppProvider>
    </SafeAreaProvider>
  );
}
