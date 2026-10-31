export const colors = {
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
  danger: '#B3261E',
  switchOff: '#C5D0CB',
  white: '#FFFFFF',
} as const;

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
