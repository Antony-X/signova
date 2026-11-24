import { Slot } from 'expo-router';
import { createContext, useState } from 'react';

// Теперь контекст хранит и язык, и тему!
export const LanguageContext = createContext<any>(null);

export default function RootLayout() {
  const [lang, setLang] = useState('en'); 
  const [isDark, setIsDark] = useState(false); // Глобальное состояние темы

  return (
    <LanguageContext.Provider value={{ lang, setLang, isDark, setIsDark }}>
      <Slot />
    </LanguageContext.Provider>
  );
}