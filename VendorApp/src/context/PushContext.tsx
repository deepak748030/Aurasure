import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { vendorApi } from '@/api/vendor';
import { useVendor } from '@/context/VendorContext';
import { haptic } from '@/lib/haptics';
import { clearBadge, consumeInitialPush, ensurePushPermission, registerForPush, subscribeToPush, type OrderPushData, type PushPermission } from '@/lib/push';

type OrderListener = (data: OrderPushData) => void;

interface Ctx {
  /** Expo push token registered for this device, `null` when unavailable. */
  token: string | null;
  /**
   * Subscribes to order pushes. The order board uses this to refresh the
   * instant an order lands instead of waiting for its 15s poll.
   * @returns an unsubscribe function.
   */
  onOrderEvent: (listener: OrderListener) => () => void;
  /** Order the vendor tapped a notification for; cleared once handled. */
  pendingOrderId: string | null;
  clearPendingOrder: () => void;
  /** Latest notification permission state for this device. */
  permission: PushPermission;
  /** Re-runs the permission request (no-op once the OS has blocked it). */
  requestPermission: () => Promise<PushPermission>;
}

const C = createContext<Ctx | null>(null);

export function PushProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { vendor } = useVendor();
  const [token, setToken] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission>('unsupported');
  const listeners = useRef(new Set<OrderListener>());
  // Tokens are re-sent only when the vendor or the token actually changes.
  const syncedFor = useRef<string>('');

  const emit = useCallback((data: OrderPushData) => {
    if (data.type === 'order.new') haptic.success();
    listeners.current.forEach((listener) => {
      try {
        listener(data);
      } catch {
        /* a bad listener must not break the others */
      }
    });
  }, []);

  // Ask on launch: a kitchen that misses the prompt misses every order.
  useEffect(() => {
    let alive = true;
    void ensurePushPermission().then((state) => {
      if (alive) setPermission(state);
    });
    return () => {
      alive = false;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const state = await ensurePushPermission();
    setPermission(state);
    if (state === 'granted') {
      const value = await registerForPush();
      setToken(value);
    }
    return state;
  }, []);

  // Re-check whenever the app comes back — the vendor may have just flipped
  // the switch in system settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void ensurePushPermission().then(setPermission);
    });
    return () => sub.remove();
  }, []);

  // Mint the token once the vendor is signed in.
  useEffect(() => {
    if (!vendor) {
      setToken(null);
      syncedFor.current = '';
      return;
    }
    let alive = true;
    void registerForPush().then((value) => {
      if (alive) setToken(value);
    });
    return () => {
      alive = false;
    };
  }, [vendor]);

  // Hand the token to the API so the server can ring this device.
  useEffect(() => {
    if (!vendor || !token) return;
    const key = `${vendor.id}:${token}`;
    if (syncedFor.current === key) return;
    syncedFor.current = key;
    void vendorApi.pushToken(token, Platform.OS).catch(() => {
      // Retry on the next mount / vendor refresh rather than blocking the UI.
      syncedFor.current = '';
    });
  }, [vendor, token]);

  // Live listeners while the app is open, plus the tap that opened it.
  useEffect(() => {
    if (!vendor) return;
    const unsubscribe = subscribeToPush(emit, (data) => {
      emit(data);
      if (data.orderId) setPendingOrderId(data.orderId);
    });
    void consumeInitialPush().then((data) => {
      if (data?.orderId) setPendingOrderId(data.orderId);
    });
    return unsubscribe;
  }, [vendor, emit]);

  // Coming back to the foreground clears the badge and nudges a refresh.
  useEffect(() => {
    if (!vendor) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void clearBadge();
      emit({ type: 'app.foreground' });
    });
    return () => sub.remove();
  }, [vendor, emit]);

  const onOrderEvent = useCallback((listener: OrderListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const clearPendingOrder = useCallback(() => setPendingOrderId(null), []);

  const value = useMemo(
    () => ({ token, onOrderEvent, pendingOrderId, clearPendingOrder, permission, requestPermission }),
    [token, onOrderEvent, pendingOrderId, clearPendingOrder, permission, requestPermission],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePush(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('usePush used outside PushProvider');
  return ctx;
}
