import { Appearance } from 'react-native';
import { useSettings } from '@/store/settings';

const lightColors = {
  ink: '#0E1A17',
  primary: '#0B5C55',
  mint: '#5FD3B5',
  canvas: '#F2F6F4',
  card: '#FFFFFF',
  border: '#E1E9E5',
  borderStrong: '#DCE5E1',
  track: '#E7EDEA',
  text: '#10201C',
  textSoft: '#44544D',
  muted: '#5A6B65',
  onInkMuted: '#A9C2BA',
  income: '#0B6E64',
  incomeTint: '#E1F3EE',
  expense: '#B8460A',
  expenseTint: '#FBEBDD',
  expenseText: '#8A3306',
  savings: '#2B5BA8',
  savingsTint: '#E5EDF9',
  savingsText: '#1F4A8C',
  editAction: '#2B5BA8',
  danger: '#B3261E',
  switchOff: '#C5D0CB',
  white: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.12)',
} as const;

/** Dark palette: same shapes as the light palette, darker backgrounds and lighter text. */
export const darkColors = {
  ...lightColors,
  ink: '#14221E',
  canvas: '#0B1210',
  card: '#14221E',
  border: '#243832',
  borderStrong: '#334C44',
  track: '#162822',
  text: '#EAF5EF',
  textSoft: '#B5C8BF',
  muted: '#7C9088',
  onInkMuted: '#7D968D',
  switchOff: '#34443D',
  income: '#73D8C5',
  incomeTint: '#173A33',
  expense: '#FFAD78',
  expenseTint: '#3A281D',
  expenseText: '#FFD3B8',
  savings: '#9DBBFF',
  savingsTint: '#1D2D49',
  savingsText: '#C5D8FF',
  editAction: '#294F93',
  danger: '#FF8A80',
  backdrop: 'rgba(0, 0, 0, 0.32)',
} as const;

/** True when the app is in dark mode: the user picked dark, or system is dark while on "auto". */
export function isDark(): boolean {
  const mode = useSettings.getState().theme;
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

/**
 * The palette used by the whole app. Reads the current colors on every access, so
 * screens pick up a theme change when the root layout re-renders the tree.
 */
export const colors = new Proxy(lightColors, {
  get: (target, prop, receiver) => (isDark() ? Reflect.get(darkColors, prop) : Reflect.get(target, prop, receiver)),
});

export const radius = { chip: 14, card: 20, hero: 24, sheet: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: font.extrabold, fontSize: 32, letterSpacing: -0.6 },
  title: { fontFamily: font.extrabold, fontSize: 28, letterSpacing: -0.5 },
  heading: { fontFamily: font.extrabold, fontSize: 20 },
  subheading: { fontFamily: font.bold, fontSize: 15 },
  body: { fontFamily: font.semibold, fontSize: 15 },
  caption: { fontFamily: font.medium, fontSize: 13 },
  label: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.6 },
} as const;

export const hit = 44; // minimum touch target
