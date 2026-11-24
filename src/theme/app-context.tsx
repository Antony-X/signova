import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { dict } from '@/translations';
import { palettes, WIDE, type Palette } from './tokens';

type Lang = 'en' | 'ka';

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  isDark: boolean;
  setIsDark: (v: boolean) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  // Dark is the default grade: the camera stage and the lime skeleton are built for it.
  const [isDark, setIsDark] = useState(true);
  const value = useMemo(() => ({ lang, setLang, isDark, setIsDark }), [lang, isDark]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Everything a screen needs: language, grade, palette, strings and the layout breakpoint. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  const { width, height } = useWindowDimensions();
  const c: Palette = ctx.isDark ? palettes.dark : palettes.light;
  const t = dict[ctx.lang] || dict.en;
  return { ...ctx, c, t, width, height, wide: width >= WIDE };
}
