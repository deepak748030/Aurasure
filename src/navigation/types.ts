export type RootStackParamList = {
  MainTabs: { screen?: string } | undefined;
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

export type SearchStackParamList = {
  Search: undefined;
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
};
