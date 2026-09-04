import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { riderApi, type Rider } from "@/api/rider";
import { logoutSession, restoreRiderSession } from "@/api/session";
import {
  startRiderBackgroundLocation,
  stopRiderBackgroundLocation,
} from "@/lib/locationTask";

interface Ctx {
  ready: boolean;
  rider: Rider | null;
  setRider: (rider: Rider | null) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}
const C = createContext<Ctx | null>(null);

/** Session plus duty-aware location heartbeat. Location tracking starts only
 * while the rider is online/on-task and the subscription is torn down as soon
 * as they go offline, so the app never tracks an off-duty partner. */
export function RiderProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [rider, setRider] = useState<Rider | null>(null);
  const [ready, setReady] = useState(false);
  const queued = useRef<
    {
      lat: number;
      lng: number;
      at: string;
      accuracy?: number | null;
      speed?: number | null;
    }[]
  >([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void restoreRiderSession()
      .then((value) => {
        if (mounted.current) setRider(value);
      })
      .finally(() => {
        if (mounted.current) setReady(true);
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    const response = await riderApi.me();
    if (mounted.current) setRider(response.rider);
  }, []);
  const logout = useCallback(() => {
    logoutSession();
    setRider(null);
  }, []);

  useEffect(() => {
    const active =
      rider?.dutyState === "online" || rider?.dutyState === "on_task";
    if (!active || !rider) return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    let backgroundStarted = false;
    void (async () => {
      try {
        const Location = await import("expo-location");
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled || permission.status !== "granted") return;
        const nextSubscription = await Location.watchPositionAsync(
          {
            accuracy:
              rider.dutyState === "on_task"
                ? Location.Accuracy.High
                : Location.Accuracy.Balanced,
            timeInterval: rider.dutyState === "on_task" ? 5000 : 60000,
            distanceInterval: rider.dutyState === "on_task" ? 20 : 200,
          },
          async (position) => {
            const point = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              at: new Date(position.timestamp || Date.now()).toISOString(),
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
            };
            const points = [...queued.current, point].slice(-200);
            try {
              const response = await riderApi.locationBatch(points);
              queued.current = [];
              if (mounted.current) setRider(response.rider);
            } catch {
              queued.current = points;
            }
          },
        );
        if (cancelled) {
          nextSubscription.remove();
          return;
        }
        subscription = nextSubscription;
        void startRiderBackgroundLocation()
          .then((started) => {
            backgroundStarted = started;
            if (cancelled && started) void stopRiderBackgroundLocation();
          })
          .catch(() => {
            /* foreground tracking still works when background permission is unavailable */
          });
      } catch {
        /* location is optional; the duty card remains usable */
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
      if (backgroundStarted) void stopRiderBackgroundLocation();
    };
  }, [rider?.dutyState, rider?.id]);

  const value = useMemo(
    () => ({ ready, rider, setRider, refresh, logout }),
    [ready, rider, refresh, logout],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useRider(): Ctx {
  const value = useContext(C);
  if (!value) throw new Error("useRider must be inside RiderProvider");
  return value;
}
