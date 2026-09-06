import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { colors } from '@/theme/colors';

/**
 * Push notifications for the vendor order board.
 *
 * A kitchen cannot sit and stare at the app, so new orders arrive as a
 * high-priority push on a dedicated `orders` channel that is allowed to make
 * noise even while the app is foregrounded.
 *
 * Everything here degrades quietly: Expo Go, web, simulators and denied
 * permissions all return `null` instead of throwing, so the app still works
 * (the order board keeps polling) when push is unavailable.
 */

/** Android channel used for order alerts — loud, heads-up, bypasses grouping. */
export const ORDERS_CHANNEL_ID = 'orders';

/** Foreground behaviour: an order alert must be seen AND heard immediately. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface OrderPushData {
  type?: string;
  orderId?: string;
  orderCode?: string;
  status?: string;
}

function readData(notification: Notifications.Notification): OrderPushData {
  const data = notification?.request?.content?.data;
  return (data && typeof data === 'object' ? data : {}) as OrderPushData;
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL_ID, {
    name: 'New orders',
    description: 'Alerts the moment a customer places an order at your outlet.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400],
    lightColor: colors.brand[600],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.brand[600],
  });
}

/** EAS project id — required by `getExpoPushTokenAsync` on SDK 49+. */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/**
 * Asks for permission and resolves the Expo push token for this device.
 * @returns the `ExponentPushToken[...]` string, or `null` when unavailable.
 */
export type PushPermission = 'granted' | 'denied' | 'blocked' | 'unsupported';

/**
 * Asks for notification permission on its own, without minting a token.
 *
 * Called once when the app opens so the vendor sees the system prompt up
 * front instead of discovering later that their phone was silent.
 *
 * @returns `blocked` when the OS will not show the prompt again (the vendor
 *   must go into system settings), `unsupported` on web / simulators.
 */
export async function ensurePushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  try {
    await ensureAndroidChannels();
    const existing = await Notifications.getPermissionsAsync();
    const isGranted = (value: Notifications.NotificationPermissionsStatus): boolean =>
      value.granted || value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (isGranted(existing)) return 'granted';
    if (existing.canAskAgain === false) return 'blocked';
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (isGranted(asked)) return 'granted';
    return asked.canAskAgain === false ? 'blocked' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  // Push tokens are not issued to simulators.
  if (!Device.isDevice) return null;

  try {
    await ensureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted && existing.canAskAgain !== false) {
      const asked = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      granted = asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    if (!granted) return null;

    const id = projectId();
    const token = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    return token?.data ?? null;
  } catch {
    // Expo Go on SDK 53+, a missing projectId, or no network — stay silent.
    return null;
  }
}

/**
 * Subscribes to incoming pushes.
 *
 * @param onOrderEvent fired for any order push while the app is running, so
 *   the order board can refresh itself without waiting for the next poll.
 * @param onOpenOrder fired when the vendor taps the notification.
 * @returns an unsubscribe function.
 */
export function subscribeToPush(
  onOrderEvent: (data: OrderPushData) => void,
  onOpenOrder: (data: OrderPushData) => void,
): () => void {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    onOrderEvent(readData(notification));
  });
  const responded = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpenOrder(readData(response.notification));
  });
  return () => {
    received.remove();
    responded.remove();
  };
}

/** The notification that cold-started the app, if any. */
export async function consumeInitialPush(): Promise<OrderPushData | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return readData(response.notification);
  } catch {
    return null;
  }
}

/** Clears the app icon badge — called when the vendor opens the order board. */
export async function clearBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* unsupported platform */
  }
}
