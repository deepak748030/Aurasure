import * as Haptics from 'expo-haptics';

const guard =
  <T extends (...args: never[]) => Promise<unknown>>(fn: T) =>
  (): void => {
    void fn().catch(() => undefined);
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
