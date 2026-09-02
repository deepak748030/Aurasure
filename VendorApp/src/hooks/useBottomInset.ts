import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * True when the caller renders inside the bottom tab navigator *and* the tab
 * bar is actually visible. The tab bar is laid out in flow by react-navigation
 * (the screen container is a sibling that flex-grows above it), and the
 * context carries its measured height - 0 when the bar renders nothing (e.g.
 * the Cart tab or pushed detail screens hide it). Screens read this so they
 * only skip the device bottom inset while a real bar is on screen.
 */
export function useIsInsideTabs(): boolean {
  return (useContext(BottomTabBarHeightContext) ?? 0) > 0;
}

/**
 * Bottom padding for scrollable content. Inside the tabs only the visual gap is
 * needed; outside them (Cart, Checkout) the device bottom inset has to be paid
 * for by us, otherwise the last row hides behind the Android nav bar.
 */
export function useContentBottomInset(gap = 20): number {
  const insets = useSafeAreaInsets();
  return useIsInsideTabs() ? gap : insets.bottom + gap;
}

/** `bottom` offset for floating bars (cart bar, checkout bar, product buy bar). */
export function useFloatingBarBottomInset(gap = 10): number {
  const insets = useSafeAreaInsets();
  return useIsInsideTabs() ? gap : insets.bottom + gap;
}
