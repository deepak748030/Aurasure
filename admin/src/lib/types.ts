/** Shared shapes returned by the Aurasure API (server/src/models). */

export type Module = 'food' | 'shop';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface ImageRef {
  kind: 'uri' | 'asset';
  uri?: string;
}

export interface AdminUser {
  id: string;
  role: 'admin' | 'customer';
  name: string;
  phone: string;
  email?: string;
  avatar?: ImageRef | null;
}

export interface OrderLine {
  id: string;
  refId: string;
  kind: Module;
  name: string;
  meta?: string;
  unitPrice: number;
  qty: number;
  image?: ImageRef | null;
}

export interface Order {
  id: string;
  code: string;
  module: Module;
  status: OrderStatus;
  placedAt: string;
  items: OrderLine[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  payBy: 'wallet' | 'cod' | 'upi' | 'card';
  walletPaid: number;
  loyaltyEarned: number;
  etaMinutes: number;
  address: string;
  couponCode?: string | null;
  instructions?: string;
  user?: { id?: string; name: string; phone: string; email?: string; wallet?: number; loyaltyPoints?: number } | null;
}

export interface Stats {
  users: number;
  restaurants: number;
  foodItems: number;
  foodCategories: number;
  shops: number;
  products: number;
  shopCategories: number;
  banners: number;
  orders: number;
  revenue: number;
  liveOrders: number;
  cancelledOrders: number;
  walletCollected: number;
  pendingPartners: number;
  pendingVendors?: number;
  partnerKinds: Record<string, number>;
}

export type VendorStatus =
  | 'onboarding'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface VendorDoc {
  key: string;
  label: string;
  uri: string;
  verified: boolean;
  note: string;
}

export interface Vendor {
  id: string;
  userId: string;
  phone: string;
  module: Module;
  status: VendorStatus;
  ownerName: string;
  email: string;
  outletName: string;
  legalName: string;
  description: string;
  address: string;
  landmark: string;
  city: string;
  pin: string;
  gstin: string;
  pan: string;
  fssai: string;
  tradeLicense: string;
  cuisines: string[];
  bank?: { accountName: string; accountNumber: string; ifsc: string; bankName: string; upi: string };
  hours?: { open: string; close: string };
  documents: VendorDoc[];
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string;
  submittedAt: string | null;
  isOpen: boolean;
  outletId: string | null;
  payoutBalance: number;
  issues?: { id: string; title: string; body: string; status: string; createdAt: string }[];
}

export interface PartnerApplication {
  userId: string;
  name: string;
  phone: string;
  kind: 'delivery' | 'vendor';
  city: string;
  appliedAt: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  note: string;
}

export interface CustomerRow {
  id: string;
  role: 'admin' | 'customer' | 'vendor' | 'delivery';
  name: string;
  email: string;
  phone: string;
  wallet: number;
  loyaltyPoints: number;
  referralCode: string;
  joinedAt: string;
  partnerKind: string | null;
  orders: number;
  spent: number;
}

export interface LedgerTx {
  id: string;
  type: string;
  title: string;
  note: string;
  amount?: number;
  points?: number;
  balanceAfter: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  minOrder: number;
  offType: 'flat' | 'percent';
  offValue: number;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface Address {
  id: string;
  label: string;
  line: string;
  city: string;
  pin: string;
  isDefault: boolean;
}

export interface CustomerDetail {
  id: string;
  role: 'admin' | 'customer' | 'vendor' | 'delivery';
  name: string;
  phone: string;
  email?: string;
  wallet: number;
  walletTxs: LedgerTx[];
  loyaltyPoints: number;
  loyaltyTxs: LedgerTx[];
  coupons: Coupon[];
  addresses: Address[];
  referralCode?: string;
  referredBy?: string | null;
  partnerApplication?: { kind: string; city?: string; status: string; note?: string; appliedAt?: string } | null;
  createdAt: string;
}

export interface ReportOverview {
  days: number;
  series: { date: string; orders: number; revenue: number; cancelled: number }[];
  byModule: { key: string; orders: number; revenue: number }[];
  byStatus: { key: string; orders: number }[];
  byPayment: { key: string; orders: number; revenue: number }[];
  topItems: { refId: string; name: string; kind: Module; qty: number; revenue: number }[];
  topCustomers: { id: string; name: string; phone: string; orders: number; spent: number }[];
}

export interface Lookups {
  restaurants: { id: string; name: string }[];
  stores: { id: string; name: string }[];
  foodCategories: { id: string; name: string }[];
  shopCategories: { id: string; name: string }[];
  vibes: { id: string; name: string }[];
}

export interface SystemInfo {
  service: string;
  version: string;
  env: string;
  node: string;
  uptimeSeconds: number;
  database: { state: string; name: string | null; host: string | null };
}

/** Anything the generic catalogue CRUD screens render. */
export type CatalogRecord = Record<string, unknown> & { id: string };
