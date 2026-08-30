import { createNavigationContainerRef } from '@react-navigation/native';
import type { HomeStackParamList, MainTabsParamList, RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Switch the active bottom tab from anywhere, optionally landing on a nested
// screen inside it: switchTab('Home', { screen: 'Restaurant', params: {...} }).
export function switchTab<Name extends keyof MainTabsParamList>(name: Name, params?: MainTabsParamList[Name]): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(
    'MainTabs',
    (params ? { screen: name, params } : { screen: name }) as RootStackParamList['MainTabs'],
  );
}

/**
 * Deep link into the Home stack from a sibling tab (Likes / Orders / Menu).
 * Those screens live inside the Home navigator, so a plain navigate() from
 * another tab would be handled by nobody.
 */
export function openHomeRoute<T extends keyof HomeStackParamList>(name: T, params?: HomeStackParamList[T]): void {
  const nested = params === undefined ? { screen: name } : { screen: name, params };
  // The generic distributes over the tab param list, which RN's typed
  // navigate() cannot narrow on its own.
  switchTab('Home', nested as MainTabsParamList['Home']);
}

export function openCart(): void {
  switchTab('Cart');
}
