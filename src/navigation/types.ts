import type { NavigatorScreenParams } from '@react-navigation/native';

// The root stack and the tab bar both need to know about the nested tab routes so
// that deep links like navigate('MainTabs', { screen: 'Food', params: {...} }) type-check.
export type MainTabsParamList = {
  Food: NavigatorScreenParams<FoodStackParamList>;
  Shop: NavigatorScreenParams<ShopStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Cart: undefined;
  Checkout: undefined;
};

export type FoodStackParamList = {
  FoodHome: undefined;
  Restaurant: { restaurantId: string };
};

export type ShopStackParamList = {
  ShopHome: undefined;
  Product: { productId: string };
};

// Note: the inner screen is deliberately NOT called "Search" — the tab that
// hosts this navigator is already named "Search", and React Navigation warns
// when a nested screen shares a name with its parent ("MainTabs > Search > Search").
export type SearchStackParamList = {
  SearchResults: undefined;
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};
