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
  deliveryTask?: DeliveryTaskRow | null;
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
  pendingRiders?: number;
  openTickets?: number;
  deliveryPartners?: number;
  ridersOnline?: number;
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

export type RiderStatus =
  | 'onboarding'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type RiderDutyState = 'offline' | 'online' | 'on_task' | 'break';

export interface RiderDoc {
  key: string;
  label: string;
  uri: string;
  verified: boolean;
  note: string;
}

export interface Rider {
  id: string;
  userId: string;
  phone: string;
  status: RiderStatus;
  name: string;
  email: string;
  city: string;
  pincode: string;
  address: string;
  vehicleType: 'bike' | 'scooter' | 'cycle' | 'ev' | '';
  vehicleNumber: string;
  pan: string;
  aadhaar: string;
  drivingLicense: string;
  rcNumber: string;
  trainingCompleted: boolean;
  quizCompleted?: boolean;
  bank?: { accountName: string; accountNumber: string; ifsc: string; bankName: string; upi: string };
  documents: RiderDoc[];
  reviewNote: string;
  reviewedAt: string | null;
  reviewedBy: string;
  submittedAt: string | null;
  dutyState: RiderDutyState;
  codInHand: number;
  maxCodLimit: number;
  payoutBalance: number;
  totalTrips: number;
  totalEarnings: number;
  currentDayTrips: number;
  currentDayEarnings: number;
  rating: number;
  ratingCount: number;
  offerCount: number;
  acceptanceCount: number;
  issues?: { id: string; title: string; body: string; status: string; createdAt: string }[];
  incidents?: { id: string; type: string; note: string; createdAt: string }[];
  codDeposits?: { id: string; amount: number; method: string; status: string; createdAt: string }[];
}

export interface DeliveryTaskRow {
  id: string;
  code: string;
  orderCode: string;
  module: Module;
  state: string;
  vendorName: string;
  vendorPhone?: string;
  pickup?: { name: string; phone: string; address: string; otp: string };
  drop?: { name: string; phone: string; address: string; otp: string };
  items?: { name: string; qty: number; price: number }[];
  total: number;
  codAmount: number;
  deliveryFee?: number;
  riderPayout: number;
  riderId: string;
  riderName: string;
  riderPhone?: string;
  podUrl?: string;
  note?: string;
  createdAt: string;
  acceptedAt?: string | null;
  deliveredAt: string | null;
}

export interface AssignableRider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  dutyState: string;
  codInHand: number;
  maxCodLimit: number;
  currentDayTrips: number;
  activeTask: DeliveryTaskRow | null;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetCode: string;
  detail: string;
  ip: string;
  createdAt: string;
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

export interface NotificationRow {
  id: string;
  userId?: string | null;
  broadcast: boolean;
  module: 'all' | 'food' | 'shop';
  title: string;
  body: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  kind: 'orders' | 'money' | 'promo' | 'support';
  orderId?: string | null;
  readBy: string[];
  createdAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  userId: string;
  userPublicId: string;
  name: string;
  phone: string;
  message: string;
  orderCode?: string | null;
  status: TicketStatus;
  response: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDoc {
  id: string;
  key: string;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTierSetting {
  name: string;
  min: number;
  color: string;
}

export interface PaymentMethodSetting {
  key: string;
  label: string;
  sub: string;
  icon: string;
  enabled: boolean;
}

export interface AppSettingsDoc {
  id: string;
  key: string;
  referral: { walletReward: number; pointsReward: number; referrerWallet: number; terms: string[] };
  loyalty: { earnPer100: number; redeemPoints: number; redeemValue: number; tiers: LoyaltyTierSetting[] };
  wallet: { topupPresets: number[]; minTopup: number; maxTopup: number };
  support: { phone: string; displayPhone: string; email: string; hours: string; slaMinutes: number };
  payments: PaymentMethodSetting[];
  checkout: { tips: number[] };
  search: { food: string[]; shop: string[] };
  delivery: { defaultEta: number; minEta: number; maxEta: number };
  cityCenters: Record<string, { lat: number; lng: number }>;
}
