import type { CatalogItem } from '@/api/vendor';
export type RootStackParamList = {
  Intro: undefined; Welcome: undefined; Login: undefined; Register: undefined; Onboarding: undefined; Pending: undefined; Main: undefined;
  OrderDetail: { orderId: string }; AddItem: { item?: CatalogItem } | undefined; Business: undefined; Outlet: undefined; Map: undefined; Staff: undefined; Alerts: undefined; Help: undefined;
};
export type TabParamList = { Home: undefined; Orders: undefined; Menu: undefined; More: undefined };
