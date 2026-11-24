/** Read a line aloud with the browser's speech voices, when a voice for the language exists. */
import { Platform } from 'react-native';

function voices(): SpeechSynthesisVoice[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  // Natural (neural) voices first, e.g. Edge's "Microsoft Eka Online (Natural) - Georgian".
  return [...window.speechSynthesis.getVoices()].sort((x, y) => Number(/natural|online/i.test(y.name)) - Number(/natural|online/i.test(x.name)));
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

/** Queue a word or line without cutting off what is already being said. */
export function say(text: string, lang: 'ka' | 'en') {
  const v = voices().find((x) => x.lang.toLowerCase().startsWith(lang));
  if (!v) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.rate = 1;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Live speech recognition (Chrome and Edge). Reports how many words have been heard so far,
 * which paces the teacher's words on screen. Returns a stop function, or null when unsupported.
 */
export function listenWords(lang: string, onWords: (count: number) => void): (() => void) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  let stopped = false;
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e: any) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += ' ' + e.results[i][0].transcript;
    onWords(text.trim().split(/\s+/).filter(Boolean).length);
  };
  rec.onerror = () => {};
  rec.onend = () => {
    if (!stopped) {
      try {
        rec.start();
      } catch {}
    }
  };
  try {
    rec.start();
  } catch {
    return null;
  }
  return () => {
    stopped = true;
    try {
      rec.stop();
    } catch {}
  };
}

/** Voices load late in some browsers (Edge's Georgian neural voices too): ask early. */
export function warmVoices() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}
