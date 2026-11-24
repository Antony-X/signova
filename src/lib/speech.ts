/** Read a line aloud with the browser's speech voices, when a voice for the language exists. */
import { Platform } from 'react-native';

function voices(): SpeechSynthesisVoice[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function hasVoice(lang: 'ka' | 'en') {
  return voices().some((v) => v.lang.toLowerCase().startsWith(lang));
}

export function speak(text: string, lang: 'ka' | 'en') {
  const v = voices().find((x) => x.lang.toLowerCase().startsWith(lang));
  if (!v) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Voices load late in some browsers (Edge's Georgian neural voices too): ask early. */
export function warmVoices() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}
