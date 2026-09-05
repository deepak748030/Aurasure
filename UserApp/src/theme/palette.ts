/**
 * Colour palettes for the Aurasure user app.
 *
 * Light mode mirrors the 6amMart reference exactly:
 *   primary      0xFF67014B  (deep plum, `light_theme.dart`)
 *   secondary    0xFF1ED7AA  (mint, used for "online / available" states)
 *   hint         0xFF9F9F9F
 *   error        0xFFE84D4F
 *   surface/card #FFFFFF on a #FCFCFC canvas
 */

export interface Palette {
  isDark: boolean;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  primaryFaint: string;
  onPrimary: string;
  secondary: string;
  secondarySoft: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceHi: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  hint: string;
  white: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  star: string;
  veg: string;
  nonVeg: string;
  overlay: string;
  shimmerFrom: string;
  shimmerTo: string;
  tabBar: string;
  tabBarBorder: string;
  sheet: string;
  mapBase: string;
  mapRoad: string;
  mapBlock: string;
  gradientHeader: [string, string];
  gradientPromo: [string, string];
}

export const lightPalette: Palette = {
  isDark: false,
  primary: '#67014B',
  primaryDeep: '#4A0035',
  primarySoft: 'rgba(103, 1, 75, 0.08)',
  primaryFaint: 'rgba(103, 1, 75, 0.04)',
  onPrimary: '#FFFFFF',
  secondary: '#1ED7AA',
  secondarySoft: 'rgba(30, 215, 170, 0.14)',
  bg: '#FCFCFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F6F7',
  surfaceHi: '#FBF6F9',
  border: '#EDE7EC',
  borderStrong: '#DCD4DB',
  divider: '#F1EFF1',
  text: '#17121A',
  textSecondary: '#65606C',
  textTertiary: '#9F9F9F',
  hint: '#9F9F9F',
  white: '#FFFFFF',
  success: '#1FA463',
  successBg: '#E7F6EE',
  warning: '#F5A623',
  warningBg: '#FFF4E2',
  danger: '#E84D4F',
  dangerBg: '#FDECEC',
  info: '#2C8CF0',
  infoBg: '#EAF4FE',
  star: '#F5A623',
  veg: '#1FA463',
  nonVeg: '#D93B3B',
  overlay: 'rgba(23, 18, 26, 0.45)',
  shimmerFrom: '#F1EFF2',
  shimmerTo: '#E4DFE5',
  tabBar: '#FFFFFF',
  tabBarBorder: '#F0EAEE',
  sheet: '#FFFFFF',
  mapBase: '#EFF1F3',
  mapRoad: '#FFFFFF',
  mapBlock: '#E4E7EA',
  gradientHeader: ['#FFFFFF', '#FBF4F8'],
  gradientPromo: ['#FFF6A5', '#FFFFFF'],
};

export const darkPalette: Palette = {
  isDark: true,
  primary: '#E56BB8',
  primaryDeep: '#67014B',
  primarySoft: 'rgba(229, 107, 184, 0.14)',
  primaryFaint: 'rgba(229, 107, 184, 0.07)',
  onPrimary: '#22030F',
  secondary: '#1ED7AA',
  secondarySoft: 'rgba(30, 215, 170, 0.16)',
  bg: '#0F0B0E',
  surface: '#181317',
  surfaceAlt: '#1F191E',
  surfaceHi: '#241D22',
  border: '#2B2429',
  borderStrong: '#3A3238',
  divider: '#241E22',
  text: '#F6F1F4',
  textSecondary: '#B8AEB5',
  textTertiary: '#8C8289',
  hint: '#8C8289',
  white: '#FFFFFF',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.14)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.14)',
  star: '#FBBF24',
  veg: '#34D399',
  nonVeg: '#F87171',
  overlay: 'rgba(0, 0, 0, 0.62)',
  shimmerFrom: '#221B20',
  shimmerTo: '#2E262C',
  tabBar: '#171215',
  tabBarBorder: '#2A2328',
  sheet: '#1B1519',
  mapBase: '#1D1F22',
  mapRoad: '#2C2F33',
  mapBlock: '#24272A',
  gradientHeader: ['#241A21', '#1A1417'],
  gradientPromo: ['#3A2E18', '#1F191D'],
};

export const palettes = { light: lightPalette, dark: darkPalette } as const;
export type ThemeMode = 'light' | 'dark' | 'system';
