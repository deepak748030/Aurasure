import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { riderApi } from "@/api/rider";
import { useRider } from "@/context/RiderContext";
import { haptic } from "@/lib/haptics";
import {
  clearBadge,
  consumeInitialPush,
  registerForPush,
  subscribeToPush,
  type TaskPushData,
} from "@/lib/push";

type TaskListener = (data: TaskPushData) => void;

interface Ctx {
  /** Expo push token registered for this device, `null` when unavailable. */
  token: string | null;
  /**
   * Subscribes to delivery-offer pushes so the task feed can refresh the
   * instant an offer lands instead of waiting for its poll.
   * @returns an unsubscribe function.
   */
  onTaskEvent: (listener: TaskListener) => () => void;
}

const C = createContext<Ctx | null>(null);

export function PushProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { rider } = useRider();
  const [token, setToken] = useState<string | null>(null);
  const listeners = useRef(new Set<TaskListener>());
  const syncedFor = useRef<string>("");

  const emit = useCallback((data: TaskPushData) => {
    if (data.type === "task.new") haptic.success();
    listeners.current.forEach((listener) => {
      try {
        listener(data);
      } catch {
        /* a bad listener must not break the others */
      }
    });
  }, []);

  // Ask for permission once the rider is signed in — never on the login screen.
  useEffect(() => {
    if (!rider) {
      setToken(null);
      syncedFor.current = "";
      return;
    }
    let alive = true;
    void registerForPush().then((value) => {
      if (alive) setToken(value);
    });
    return () => {
      alive = false;
    };
  }, [rider]);

  // Hand the token to the API so dispatch can ring this device.
  useEffect(() => {
    if (!rider || !token) return;
    const key = `${rider.id}:${token}`;
    if (syncedFor.current === key) return;
    syncedFor.current = key;
    void riderApi.pushToken(token).catch(() => {
      syncedFor.current = "";
    });
  }, [rider, token]);

  useEffect(() => {
    if (!rider) return;
    const unsubscribe = subscribeToPush(emit, emit);
    void consumeInitialPush().then((data) => {
      if (data) emit(data);
    });
    return unsubscribe;
  }, [rider, emit]);

  // Coming back to the foreground clears the badge and nudges a refresh.
  useEffect(() => {
    if (!rider) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void clearBadge();
      emit({ type: "app.foreground" });
    });
    return () => sub.remove();
  }, [rider, emit]);

  const onTaskEvent = useCallback((listener: TaskListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ token, onTaskEvent }), [token, onTaskEvent]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePush(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error("usePush used outside PushProvider");
  return ctx;
}
