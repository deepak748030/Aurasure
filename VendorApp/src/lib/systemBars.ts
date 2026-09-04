import { useCallback, useEffect, useState, useSyncExternalStore, useContext } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { isDark } from '@/lib/color';

// One tiny store that owns the look of the Android "notification bar" (status
// bar) and the navigation bar. The system bars themselves are transparent in
// edge-to-edge builds, so whatever color shows through is the surface the
// screen paints behind them - see `Screen`, which draws that band and reports
// its color here. This module only flips the icon/clock contrast and forwards
// the color to expo-status-bar for the (rare) non-edge-to-edge build.

export type SystemBarStyle = 'light' | 'dark';

export interface SystemBars {
  /** Color of the strip behind the status bar (the app's app-bar surface). */
  statusBarBackground: string;
  /** 'light' = white icons, for dark surfaces. */
  statusBarStyle: SystemBarStyle;
  /** Color of the strip behind the Android navigation bar / gesture pill. */
  navigationBarBackground: string;
}

const INITIAL: SystemBars = {
  statusBarBackground: '#F8F6F3',
  statusBarStyle: 'dark',
  navigationBarBackground: '#F8F6F3',
};

let state: SystemBars = INITIAL;
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

/** Applies a patch; no-ops when nothing actually changed. */
export function setSystemBars(patch: Partial<SystemBars>): void {
  const next = { ...state, ...patch };
  let changed = false;
  (Object.keys(next) as (keyof SystemBars)[]).forEach((key) => {
    if (next[key] !== state[key]) changed = true;
  });
  if (!changed) return;
  state = next;
  listeners.forEach((l) => l());
}

export function useSystemBars(): SystemBars {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/**
 * Focus state of the current screen, without `useIsFocused`'s hard throw when a
 * component happens to render outside a navigator (then it just counts as
 * focused, so the bars still get painted).
 */
interface FocusableNavigation {
  isFocused: () => boolean;
  addListener: (type: 'focus' | 'blur', handler: () => void) => () => void;
}

function useFocusState(): boolean {
  const navigation = useContext(NavigationContext) as unknown as FocusableNavigation | undefined;
  const [focused, setFocused] = useState(() => (navigation ? navigation.isFocused() : true));
  useEffect(() => {
    if (!navigation) return;
    const update = (): void => setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', update);
    const offBlur = navigation.addListener('blur', update);
    update();
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}

/**
 * Registers the surface a screen draws behind the system bars. The status bar
 * icon contrast is derived from that color automatically, so a screen only has
 * to say "my app bar is #6A0A45" and the notification bar follows it.
 */
export function useScreenBars(
  surface: string,
  options?: { style?: SystemBarStyle; navigationBar?: string },
): void {
  const isFocused = useFocusState();
  const style = options?.style;
  const navigationBar = options?.navigationBar;
  useEffect(() => {
    if (!isFocused) return;
    setSystemBars({
      statusBarBackground: surface,
      statusBarStyle: style ?? (isDark(surface) ? 'light' : 'dark'),
      navigationBarBackground: navigationBar ?? surface,
    });
  }, [isFocused, surface, style, navigationBar]);
}
