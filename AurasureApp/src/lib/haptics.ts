import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Kept in memory so every button in the app follows the Settings toggle
// without making haptic calls asynchronous or adding context to every screen.
let enabled = true;
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

const guard =
  <T extends (...args: never[]) => Promise<unknown>>(fn: T) =>
  (...args: Parameters<T>): void => {
    if (Platform.OS === 'web' || !enabled) return;
    void fn(...args).catch(() => undefined);
  };

export const haptic = {
  light: guard(Haptics.impactAsync.bind(null, Haptics.ImpactFeedbackStyle.Light)),
  medium: guard(Haptics.impactAsync.bind(null, Haptics.ImpactFeedbackStyle.Medium)),
  heavy: guard(Haptics.impactAsync.bind(null, Haptics.ImpactFeedbackStyle.Heavy)),
  success: guard(Haptics.notificationAsync.bind(null, Haptics.NotificationFeedbackType.Success)),
  warning: guard(Haptics.notificationAsync.bind(null, Haptics.NotificationFeedbackType.Warning)),
  error: guard(Haptics.notificationAsync.bind(null, Haptics.NotificationFeedbackType.Error)),
  selection: guard(Haptics.selectionAsync),
};
