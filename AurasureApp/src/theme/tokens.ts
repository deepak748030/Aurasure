/**
 * Aurasure app design tokens.
 *
 * HARD LAYOUT RULES (project-wide, do not break):
 *  1. Every screen gutter is exactly `spacing.edge` = 4 on the LEFT and RIGHT.
 *     No screen adds its own horizontal padding - `Screen` does it once.
 *  2. Vertical rhythm inside lists is 0. List rows never get a top/bottom gap;
 *     they touch each other and are separated by a hairline divider instead.
 *     The same 0 rule applies to the map frame and the "playlist" style
 *     section list - those surfaces go edge to edge, no gutter, no radius.
 *  3. Never `Alert.alert`. Every alert/confirm/error/success is a modal that
 *     rises from the BOTTOM - see `components/sheet/SheetProvider`.
 *  4. Never a bare spinner. Loading states are skeletons.
 */

export const spacing = {
  /** The one side gutter used by every screen. */
  edge: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 18,
  /** Vertical gap between list rows - deliberately 0 (rows touch, divider separates). */
  listGap: 0,
  /** Vertical gap inside rails (horizontal carousels keep a little air). */
  railGap: 8,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
  /** Map + list surfaces are square so they can sit flush at 0 gap. */
  flush: 0,
} as const;

export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const typography = {
  display: { fontSize: 28, lineHeight: 34, weight: 'extrabold' as FontWeightKey, letterSpacing: -0.4 },
  h1: { fontSize: 22, lineHeight: 28, weight: 'bold' as FontWeightKey, letterSpacing: -0.3 },
  h2: { fontSize: 19, lineHeight: 25, weight: 'bold' as FontWeightKey, letterSpacing: -0.2 },
  h3: { fontSize: 16, lineHeight: 21, weight: 'semibold' as FontWeightKey, letterSpacing: -0.1 },
  title: { fontSize: 14, lineHeight: 19, weight: 'semibold' as FontWeightKey, letterSpacing: 0 },
  subtitle: { fontSize: 13, lineHeight: 18, weight: 'medium' as FontWeightKey, letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 21, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  bodySm: { fontSize: 13, lineHeight: 18, weight: 'regular' as FontWeightKey, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular' as FontWeightKey, letterSpacing: 0.1 },
  micro: { fontSize: 11, lineHeight: 14, weight: 'medium' as FontWeightKey, letterSpacing: 0.2 },
  overline: { fontSize: 10, lineHeight: 14, weight: 'semibold' as FontWeightKey, letterSpacing: 1.1 },
  button: { fontSize: 14, lineHeight: 19, weight: 'semibold' as FontWeightKey, letterSpacing: 0.1 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const layout = {
  screenMaxWidth: 560,
  /** Same as spacing.edge - exposed separately so `Screen`/headers read clearly. */
  contentHorizontalPadding: 4,
  headerHeight: 56,
  tabBarItemHeight: 62,
  /** Height of a horizontal list row (icon + two lines). */
  listRowHeight: 76,
  /** Map frames render full-bleed: zero gutter, zero radius. */
  mapRadius: 0,
} as const;

export const motion = {
  skeletonMs: 850,
  sheetIn: 280,
  sheetOut: 220,
  press: 0.965,
} as const;

export const feedback = {
  /** Cancel reasons offered before an order is dropped (mirrors the 6amMart user app). */
  cancelReasons: [
    'Ordered by mistake',
    'Delivery is taking too long',
    'I want to change the delivery address',
    'I want to change the payment method',
    'The store did not confirm my order',
    'Something else',
  ],
  /** "If any product is not available" preference stored on the order note. */
  unavailableOptions: [
    { key: 'notify', label: 'Notify me before cancelling' },
    { key: 'replace', label: 'Replace with a similar item' },
    { key: 'cancel', label: 'Cancel that item and continue' },
  ],
  deliveryInstructions: [
    'Do not ring the bell',
    'Leave at the door',
    'Call me on arrival',
    'Leave with the security guard',
  ],
} as const;
