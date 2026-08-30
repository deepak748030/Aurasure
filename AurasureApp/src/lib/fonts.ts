import { loadAsync, type FontSource } from 'expo-font';
import { Platform } from 'react-native';

// Plus Jakarta Sans, loaded at runtime from the public jsDelivr CDN (the
// @expo/google-fonts package files). The device fetches these; if offline we
// gracefully fall back to the system font (Text uses these family names and RN
// falls back automatically when a family is not registered).
export const FONT_FAMILY = 'PlusJakartaSans';

const CDN = 'https://cdn.jsdelivr.net/npm/@expo/google-fonts/plus-jakarta-sans';

export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export const FONT_FAMILIES: Record<FontWeightKey, string> = {
  regular: FONT_FAMILY,
  medium: `${FONT_FAMILY}-Medium`,
  semibold: `${FONT_FAMILY}-SemiBold`,
  bold: `${FONT_FAMILY}-Bold`,
  extrabold: `${FONT_FAMILY}-ExtraBold`,
};

const FONT_FILES: Record<FontWeightKey, string> = {
  regular: 'PlusJakartaSans_400Regular.ttf',
  medium: 'PlusJakartaSans_500Medium.ttf',
  semibold: 'PlusJakartaSans_600SemiBold.ttf',
  bold: 'PlusJakartaSans_700Bold.ttf',
  extrabold: 'PlusJakartaSans_800ExtraBold.ttf',
};

const fontAssets: Record<string, FontSource> = (Object.keys(FONT_FILES) as FontWeightKey[]).reduce(
  (acc, weight) => {
    acc[FONT_FAMILIES[weight]] = { uri: `${CDN}/${FONT_FILES[weight]}` };
    return acc;
  },
  {} as Record<string, FontSource>,
);

let loadPromise: Promise<void> = Promise.resolve();

export function loadAppFonts(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }
  if (loadPromise === Promise.resolve()) {
    loadPromise = loadAsync(fontAssets).catch(() => {
      // Offline / CDN unreachable: keep system font. Not fatal.
    });
  }
  return loadPromise;
}
