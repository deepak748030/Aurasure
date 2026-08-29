import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { MainTabsParamList, RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type RouteName = keyof RootStackParamList;

export function navigate<Name extends RouteName>(name: Name, params?: RootStackParamList[Name]): void {
  if (navigationRef.isReady()) {
    const go = navigationRef.navigate as (routeName: Name, routeParams?: RootStackParamList[Name]) => void;
    go(name, params);
  }
}

export function goBack(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

export function resetRoot(name: RouteName): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name }] });
  }
}

// Switch the active bottom tab from anywhere (e.g. from a root-level screen).
// Pass `params` to land on a nested screen inside that tab, e.g.
// switchTab('Food', { screen: 'Restaurant', params: { restaurantId: 'r_aurora' } }).
export function switchTab<Name extends keyof MainTabsParamList>(name: Name, params?: MainTabsParamList[Name]): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(
      'MainTabs',
      (params ? { screen: name, params } : { screen: name }) as RootStackParamList['MainTabs'],
    );
  }
}

export function openCart(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name: 'Cart' }));
  }
}
