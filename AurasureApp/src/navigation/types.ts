import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabName = 'Home' | 'Favorites' | 'Cart' | 'Orders' | 'Menu';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  ModulePick: undefined;
  Location: { from?: 'gate' | 'home' } | undefined;
  Auth: { mode?: 'login' | 'register' } | undefined;
  Tabs: NavigatorScreenParams<Record<TabName, undefined>>;
  Outlet: { module: 'food' | 'shop'; id: string; name?: string };
  Item: { module: 'food' | 'shop'; id: string };
  Category: { module: 'food' | 'shop'; id: string; name: string };
  Vibe: { id: string; name: string; tagline?: string };
  FlashSale: undefined;
  Brands: undefined;
  BrandItems: { id: string; name: string };
  SeeAll: { kind: 'restaurants' | 'items' | 'products' | 'stores' | 'offers' | 'popular' | 'new'; title: string; categoryId?: string };
  Search: { initial?: string } | undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { id: string };
  OrderDetail: { id: string };
  TrackOrder: { id: string };
  Addresses: undefined;
  AddressEdit: { id?: string } | undefined;
  Favorites: undefined;
  Wallet: undefined;
  Loyalty: undefined;
  Coupons: undefined;
  ReferEarn: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Help: undefined;
  Policy: { kind: 'cancellation' | 'refund' | 'privacy' | 'terms' };
  Partner: undefined;
};

/** Typed `navigate` for screens that only push onto the root stack. */
export type Nav = {
  navigate: <T extends keyof RootStackParamList>(screen: T, params?: RootStackParamList[T]) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  replace: <T extends keyof RootStackParamList>(screen: T, params?: RootStackParamList[T]) => void;
  setOptions: (options: Record<string, unknown>) => void;
  popToTop: () => void;
  isFocused: () => boolean;
  addListener: (type: string, listener: (event: { payload: unknown }) => void) => () => void;
};

export type Route<T extends keyof RootStackParamList> = { params: RootStackParamList[T] };

export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: Nav;
  route: Route<T>;
};
