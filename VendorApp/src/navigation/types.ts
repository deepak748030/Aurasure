import type { CatalogItem, VendorOrder } from '@/api/vendor';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Pending: undefined;
  Main: undefined;
  OrderDetail: { orderId: string };
  AddItem: { item?: CatalogItem } | undefined;
};
