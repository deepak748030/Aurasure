import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * True when the caller renders inside the bottom tab navigator.
 *
 * The tab bar is laid out *in flow* by react-navigation (the screen container
 * is a sibling that flex-grows above it), so a screen inside the tabs already
 * ends above the bar. Reading the height from context instead of hard-coding
 * TAB_BAR_HEIGHT keeps that true even if the bar grows.
 */
export function useIsInsideTabs(): boolean {
  return useContext(BottomTabBarHeightContext) != null;
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
