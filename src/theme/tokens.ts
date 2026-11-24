/**
 * SIGNOVA design tokens.
 *
 * Dealt with tasteskill 2.5 (`start.mjs deal --page software`):
 *   palette  soot-pale-lime  — near-black ground, one lime accent. The lime is the colour the
 *            pose tracker draws in, so the interface and the live skeleton read as one system.
 *   type     plex            — IBM Plex Sans for words, IBM Plex Mono for every live readout.
 *   radius   soft            — 8 / 12 / 20.
 *   buttons  arrow           — one filled primary with a drawn arrow, secondaries as text links.
 *   mark     initial         — the name's first letter on an accent tile.
 *
 * The light grade is the palette's own inverse block, printed by the same deal.
 */
import { Platform } from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentInk: string;
  action: string;
  actionInk: string;
  /** Colour of skeleton bones drawn over the camera (always on dark video). */
  bone: string;
  danger: string;
  stage: string;
};

const dark: Palette = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  raised: '#232323',
  ink: '#ffffff',
  muted: '#8f8f8f',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.24)',
  accent: '#dafa9c',
  accentInk: '#0f0f0f',
  action: '#dafa9c',
  actionInk: '#0f0f0f',
  bone: '#ffffff',
  danger: '#ff8a7a',
  stage: '#0a0a0a',
};

const light: Palette = {
  bg: '#ffffff',
  surface: '#ececec',
  raised: '#f6f6f6',
  ink: '#0f0f0f',
  muted: '#5f5f5f',
  line: 'rgba(15,15,15,0.13)',
  lineStrong: 'rgba(15,15,15,0.26)',
  accent: '#0f0f0f',
  accentInk: '#ffffff',
  action: '#0f0f0f',
  actionInk: '#ffffff',
  bone: '#ffffff',
  danger: '#b42318',
  stage: '#0f0f0f',
};

export const palettes = { dark, light };

/** The lime the tracker draws in, in both grades (it always sits on video or the dark stage). */
export const LIME = '#dafa9c';

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128 } as const;

export const radius = { sm: 8, md: 12, lg: 20, btn: 8, pill: 999 } as const;

/** Font family names as registered by @expo-google-fonts in the root layout. */
const georgianFallback = Platform.OS === 'web' ? ', "Noto Sans Georgian", "Sylfaen", system-ui, sans-serif' : '';
const monoFallback = Platform.OS === 'web' ? ', ui-monospace, Menlo, Consolas, monospace' : '';

export const font = {
  regular: 'IBMPlexSans_400Regular' + georgianFallback,
  medium: 'IBMPlexSans_500Medium' + georgianFallback,
  semibold: 'IBMPlexSans_600SemiBold' + georgianFallback,
  mono: 'IBMPlexMono_400Regular' + monoFallback,
  monoMedium: 'IBMPlexMono_500Medium' + monoFallback,
} as const;

export const type = {
  display: { fontFamily: font.medium, fontSize: 56, lineHeight: 58, letterSpacing: -56 * 0.035 },
  displaySm: { fontFamily: font.medium, fontSize: 38, lineHeight: 42, letterSpacing: -38 * 0.03 },
  h2: { fontFamily: font.medium, fontSize: 32, lineHeight: 36, letterSpacing: -32 * 0.025 },
  h3: { fontFamily: font.medium, fontSize: 20, lineHeight: 26, letterSpacing: -20 * 0.01 },
  lead: { fontFamily: font.regular, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 25 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: font.mono, fontSize: 13, lineHeight: 18 },
  monoLg: { fontFamily: font.monoMedium, fontSize: 15, lineHeight: 20 },
} as const;

/** tasteskill motion tokens (motion.md). */
export const motion = {
  in: 150,
  out: 120,
  press: 90,
  slide: 240,
  enter: 520,
  enterLine: 700,
  cycle: 3200,
  ease: 'cubic-bezier(.2,.8,.2,1)',
  easeEnter: 'cubic-bezier(.22,1,.36,1)',
} as const;

export const WIDE = 900;
