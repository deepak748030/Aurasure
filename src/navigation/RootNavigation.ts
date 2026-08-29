import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

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
export function switchTab(name: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', { screen: name });
  }
}

export function openCart(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name: 'Cart' }));
  }
}
