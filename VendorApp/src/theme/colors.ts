// Central color system for Aurasure. Light theme, professional and calm.
// Brand = indigo/violet "aura". Food module uses warm coral. Shop uses brand.

export const brand = {
  50: '#EEF1FF',
  100: '#E1E5FF',
  200: '#C9D0FF',
  300: '#A8B2FF',
  400: '#867EFF',
  500: '#6A5EF5',
  600: '#5B46E5',
  700: '#4B36C9',
  800: '#3D2CA3',
  900: '#2E2178',
};

export const food = {
  50: '#FFF1EC',
  100: '#FFE0D3',
  200: '#FFC2AD',
  300: '#FF9D7C',
  400: '#FF7E54',
  500: '#FF6A3D',
  600: '#F2542A',
  700: '#CC3F1C',
  800: '#A33318',
  900: '#7E2B16',
};

export const colors = {
  brand,
  food,

  // neutral ink scale
  ink: {
    900: '#0B1020',
    800: '#1A2030',
    700: '#2B3346',
    600: '#4A5468',
    500: '#6B7488',
    400: '#8B93A7',
    300: '#B4BAC8',
    200: '#DDE0E8',
    100: '#EEF0F5',
    50: '#F6F7FB',
  },

  // App chrome: the strip painted behind the status bar (Android notification
  // bar) and behind the gesture nav pill. Deliberately the same soft plum as
  // the tab bar so both system bars read as part of the app.
  appBar: '#F5EAF3',
  // Deep plum used by the gradient heroes (Menu / Gate). Dark enough that the
  // system-bar contrast flips to white icons on its own.
  appBarHero: '#6A0A45',

  // semantic surfaces & text
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F9',
  border: '#E7E9F1',
  borderStrong: '#D6DAE6',

  text: '#0B1020',
  textSecondary: '#5B6478',
  textTertiary: '#98A1B3',

  white: '#FFFFFF',
  black: '#000000',

  success: '#16A34A',
  successBg: '#E7F6EC',
  warning: '#F59E0B',
  warningBg: '#FEF3E2',
  danger: '#EF4444',
  dangerBg: '#FDECEC',
  star: '#F5A623',

  overlay: 'rgba(11,16,32,0.42)',

  // module accents
  foodAccent: '#FF6A3D',
  shopAccent: '#5B46E5',

  // gradients (used by expo-linear-gradient)
  brandGradient: ['#6A5EF5', '#8B5CF6'] as [string, string],

};

export type ColorScheme = typeof colors;
