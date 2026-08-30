// Spacing, radius and typography tokens.
// Flat design language: no drop shadows anywhere and tight side padding, but
// real radii - CTAs are pills and surfaces round. This scale is the single
// source of truth, so a bump here lands everywhere at once.

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

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
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

// One place to control the left/right gutter of every screen. 4px keeps lists
// wide and lets full-bleed rows (banners) sit flush with the device edge by
// applying -layout.contentHorizontalPadding (see BannerCard).
export const layout = {
  screenMaxWidth: 480,
  contentHorizontalPadding: 4,
  headerHeight: 56,
};
