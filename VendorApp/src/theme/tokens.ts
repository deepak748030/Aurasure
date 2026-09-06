export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const typography = {
  display: { fontSize: 30, lineHeight: 36, weight: 'extrabold' as FontWeightKey, letterSpacing: -0.5 },
  h1: { fontSize: 25, lineHeight: 31, weight: 'bold' as FontWeightKey, letterSpacing: -0.3 },
  h2: { fontSize: 20, lineHeight: 26, weight: 'bold' as FontWeightKey, letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 23, weight: 'semibold' as FontWeightKey, letterSpacing: 0 },
  title: { fontSize: 15, lineHeight: 21, weight: 'semibold' as FontWeightKey, letterSpacing: 0 },
  subtitle: { fontSize: 14, lineHeight: 20, weight: 'medium' as FontWeightKey, letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 21, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  bodySm: { fontSize: 13, lineHeight: 18, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, weight: 'medium' as FontWeightKey, letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, weight: 'bold' as FontWeightKey, letterSpacing: 1.1 },
  button: { fontSize: 15, lineHeight: 20, weight: 'bold' as FontWeightKey, letterSpacing: 0.1 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const layout = {
  screenMaxWidth: 560,
  contentHorizontalPadding: 18,
  headerHeight: 56,
};
