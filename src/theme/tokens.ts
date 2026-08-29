// Spacing, radius, typography scale and soft elevation tokens.
// Per design brief: keep border radius subtle (low) and lists tight (gap 0).

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 24,
};

// Low, refined radii
export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  pill: 999,
};

export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const typography = {
  display: { fontSize: 30, lineHeight: 36, weight: 'extrabold' as FontWeightKey, letterSpacing: -0.4 },
  h1: { fontSize: 24, lineHeight: 30, weight: 'bold' as FontWeightKey, letterSpacing: -0.3 },
  h2: { fontSize: 20, lineHeight: 26, weight: 'bold' as FontWeightKey, letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 22, weight: 'semibold' as FontWeightKey, letterSpacing: -0.1 },
  title: { fontSize: 15, lineHeight: 20, weight: 'semibold' as FontWeightKey, letterSpacing: 0 },
  subtitle: { fontSize: 14, lineHeight: 20, weight: 'medium' as FontWeightKey, letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 21, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  bodySm: { fontSize: 13, lineHeight: 18, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, weight: 'medium' as FontWeightKey, letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, weight: 'bold' as FontWeightKey, letterSpacing: 1 },
  button: { fontSize: 15, lineHeight: 20, weight: 'semibold' as FontWeightKey, letterSpacing: 0.1 },
} as const;

export type TypographyVariant = keyof typeof typography;

// Soft, low-profile elevation (no harsh shadows — fits the subtle radius language)
export const shadow = {
  xs: {
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
};

export const layout = {
  screenMaxWidth: 480,
  contentHorizontalPadding: 16,
  headerHeight: 56,
};
