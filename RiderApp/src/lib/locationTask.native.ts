import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { riderApi } from "@/api/rider";

export const RIDER_LOCATION_TASK = "aurasure-rider-location";

type LocationTaskPayload = { locations?: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(RIDER_LOCATION_TASK)) {
  TaskManager.defineTask(RIDER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as LocationTaskPayload).locations ?? [];
    if (!locations.length) return;
    try {
      const { rider } = await riderApi.me();
      if (rider.dutyState !== "online" && rider.dutyState !== "on_task") return;
      await riderApi.locationBatch(
        locations.map((location) => ({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          at: new Date(location.timestamp || Date.now()).toISOString(),
          accuracy: location.coords.accuracy,
          speed: location.coords.speed,
        })),
      );
    } catch {
      // The foreground watcher retries the next point; background delivery must not crash the task.
    }
  });
}

export async function startRiderBackgroundLocation(): Promise<boolean> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") return false;
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    const requested = await Location.requestBackgroundPermissionsAsync();
    if (requested.status !== "granted") return false;
  }
  if (await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK)) {
    return true;
  }
  await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100,
    timeInterval: 30000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Aurasure rider location is active",
      notificationBody:
        "Location is shared while you are online for deliveries.",
      notificationColor: "#67014B",
    },
  });
  return true;
}

export async function stopRiderBackgroundLocation(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  }
}
