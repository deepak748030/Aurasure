import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { colors } from "@/theme/colors";

/**
 * Push notifications for the delivery partner.
 *
 * A delivery offer is only open for ~30 seconds, so it arrives as a
 * high-priority push on a dedicated `offers` channel that is allowed to make
 * noise even while the app is foregrounded or the phone is in a pocket.
 *
 * Everything degrades quietly: Expo Go, web, simulators and denied
 * permissions return `null` rather than throwing, so the task feed's polling
 * remains the fallback.
 */

/** Android channel used for delivery offers — loud, heads-up, bypasses DND. */
export const OFFERS_CHANNEL_ID = "offers";

/** Foreground behaviour: an offer must be seen AND heard immediately. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface TaskPushData {
  type?: string;
  taskId?: string;
  orderCode?: string;
}

function readData(notification: Notifications.Notification): TaskPushData {
  const data = notification?.request?.content?.data;
  return (data && typeof data === "object" ? data : {}) as TaskPushData;
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(OFFERS_CHANNEL_ID, {
    name: "Delivery offers",
    description: "Alerts you the moment a nearby delivery is available.",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 400, 200, 400],
    lightColor: colors.brand[600],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: colors.brand[600],
  });
}

/** EAS project id — required by `getExpoPushTokenAsync` on SDK 49+. */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return (
    extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Asks for permission and resolves the Expo push token for this device.
 * @returns the `ExponentPushToken[...]` string, or `null` when unavailable.
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  try {
    await ensureAndroidChannels();

    const existing = await Notifications.getPermissionsAsync();
    let granted =
      existing.granted ||
      existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted && existing.canAskAgain !== false) {
      const asked = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      granted =
        granted ||
        asked.granted ||
        asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    if (!granted) return null;

    const id = projectId();
    const token = await Notifications.getExpoPushTokenAsync(
      id ? { projectId: id } : undefined,
    );
    return token?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to incoming pushes.
 *
 * @param onTaskEvent fired for any push while the app is running, so the task
 *   feed can refresh instantly instead of waiting for its poll.
 * @param onOpenTask fired when the rider taps the notification.
 * @returns an unsubscribe function.
 */
export function subscribeToPush(
  onTaskEvent: (data: TaskPushData) => void,
  onOpenTask: (data: TaskPushData) => void,
): () => void {
  const received = Notifications.addNotificationReceivedListener(
    (notification) => onTaskEvent(readData(notification)),
  );
  const responded = Notifications.addNotificationResponseReceivedListener(
    (response) => onOpenTask(readData(response.notification)),
  );
  return () => {
    received.remove();
    responded.remove();
  };
}

/** The notification that cold-started the app, if any. */
export async function consumeInitialPush(): Promise<TaskPushData | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return null;
    return readData(response.notification);
  } catch {
    return null;
  }
}

/** Clears the app icon badge. */
export async function clearBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* unsupported platform */
  }
}
