// Tight, consistent spacing for one-handed delivery work. Screen gutters are
// exactly 4dp as requested; map and flat list surfaces deliberately go edge to
// edge (0dp) instead of inheriting a card gutter.
export const spacing = {
  edge: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 20,
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

export type FontWeightKey =
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "extrabold";

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    weight: "extrabold" as FontWeightKey,
    letterSpacing: -0.4,
  },
  h1: {
    fontSize: 25,
    lineHeight: 31,
    weight: "bold" as FontWeightKey,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 21,
    lineHeight: 27,
    weight: "bold" as FontWeightKey,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 17,
    lineHeight: 22,
    weight: "semibold" as FontWeightKey,
    letterSpacing: -0.1,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    weight: "semibold" as FontWeightKey,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    weight: "medium" as FontWeightKey,
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    weight: "regular" as FontWeightKey,
    letterSpacing: 0,
  },
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    weight: "regular" as FontWeightKey,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    weight: "medium" as FontWeightKey,
    letterSpacing: 0.1,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    weight: "bold" as FontWeightKey,
    letterSpacing: 1.1,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    weight: "semibold" as FontWeightKey,
    letterSpacing: 0.1,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const layout = {
  screenMaxWidth: 560,
  contentHorizontalPadding: 4,
  headerHeight: 58,
};
