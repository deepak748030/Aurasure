import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * The five tabs are identical in both modules (Home, Likes, Cart, Orders,
 * Menu); only the screens behind them change with the selected module.
 */
export type MainTabsParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Likes: NavigatorScreenParams<LikesStackParamList>;
  Cart: NavigatorScreenParams<CartStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Menu: NavigatorScreenParams<MenuStackParamList>;
};

/**
 * Home holds the module-specific landing screen plus everything reachable from
 * it, so detail navigation stays local to the tab instead of jumping between
 * nested navigators. FoodHome/ShopHome are swapped by the selected module.
 */
export type HomeStackParamList = {
  FoodHome: undefined;
  ShopHome: undefined;
  Restaurant: { restaurantId: string };
  Product: { productId: string };
  Search: undefined;
};

export type LikesStackParamList = {
  Likes: undefined;
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

export type MenuStackParamList = {
  // Named "More" (not "Menu") so it never collides with the "Menu" tab above
  // it - duplicate names in nested navigators confuse navigation state.
  More: undefined;
  MenuDetail: { key: MenuDetailKey };
  Login: undefined;
};

/** Every sub-row on the More (Menu) screen, used to render its detail screen. */
export type MenuDetailKey =
  | 'editProfile'
  | 'myAddress'
  | 'settings'
  | 'coupon'
  | 'loyalty'
  | 'wallet'
  | 'refer'
  | 'delivery'
  | 'vendor'
  | 'liveChat'
  | 'help'
  | 'terms'
  | 'privacy'
  | 'refund';

/** `Gate` is the onboarding flow (location -> module -> login). */
export type RootStackParamList = {
  Gate: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
};
