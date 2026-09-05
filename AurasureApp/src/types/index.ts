/**
 * Types for every payload the Aurasure Node.js API (`server/`) returns.
 * Field names match the Mongoose models 1:1 so no mapping layer is needed.
 */

export type ModuleKey = 'food' | 'shop';
export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';
export type PayBy = 'wallet' | 'cod' | 'upi' | 'card';

/** Server-side image reference: `{ kind: 'uri', uri }` or `null`. */
export interface ImageRef {
  kind: 'uri';
  uri: string;
}

export interface UserAddress {
  id: string;
  label: string;
  line: string;
  city: string;
  pin: string;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
}

export interface FavoriteRef {
  module: ModuleKey;
  refId: string;
}

export interface LedgerTx {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  note: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export interface LoyaltyTx {
  id: string;
  type: 'earned' | 'redeemed' | 'reversed';
  title: string;
  note: string;
  points: number;
  balanceAfter: number;
  createdAt: string;
}

export interface UserCoupon {
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

export interface UserProfile {
  id: string;
  role: 'customer' | 'admin' | 'vendor' | 'delivery';
  name: string;
  email?: string;
  phone: string;
  avatar: ImageRef | null;
  wallet: number;
  loyaltyPoints: number;
  coupons?: UserCoupon[];
  referralCode?: string;
  referredBy?: string | null;
  partnerApplication?: {
    kind: 'delivery' | 'vendor';
    name: string;
    city: string;
    appliedAt: string;
    status: string;
  } | null;
  addresses: UserAddress[];
  favorites: FavoriteRef[];
  createdAt: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  icon: string;
  image: ImageRef | null;
  sortOrder: number;
}

export interface FoodVibe {
  id: string;
  name: string;
  tagline: string;
  image: ImageRef | null;
  from: string;
  to: string;
  sortOrder: number;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  reviews: number;
  deliveryTime: number;
  deliveryFee: number;
  minOrder: number;
  distanceKm: number;
  priceForTwo: number;
  promo?: string;
  isVeg: boolean;
  isNew?: boolean;
  isNewlyJoined?: boolean;
  isClosed?: boolean;
  isPopular?: boolean;
  offer?: string;
  line?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  cover: ImageRef | null;
  tags: string[];
  categoryIds: string[];
}

/** `variants` / `addonGroups` are free-form on the server - read defensively. */
export interface VariantOption {
  label?: string;
  name?: string;
  title?: string;
  price?: number;
  optionPrice?: number;
  isDefault?: boolean;
}

export interface AddonGroup {
  title?: string;
  name?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: VariantOption[];
}

export interface CatalogItem {
  id: string;
  restaurantId?: string;
  storeId?: string;
  name: string;
  brand?: string;
  description: string;
  price: number;
  mrp?: number;
  rating: number;
  reviews: number;
  prepTime?: number;
  deliveryMins?: number;
  isVeg?: boolean;
  inStock?: boolean;
  isAvailable?: boolean;
  isBestseller?: boolean;
  isPopular?: boolean;
  isSpecial?: boolean;
  isTrending?: boolean;
  isSpecialOffer?: boolean;
  isNew?: boolean;
  vibeId?: string;
  categoryId?: string;
  categoryIds?: string[];
  tags: string[];
  colors?: string[];
  sizes?: string[];
  image: ImageRef | null;
  variants?: VariantOption[];
  addonGroups?: AddonGroup[];
  stockQty?: number | null;
  approvalStatus?: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  icon: string;
  tagline?: string;
  image: ImageRef | null;
  sortOrder: number;
}

export interface ShopStore {
  id: string;
  name: string;
  brand?: string;
  road?: string;
  house?: string;
  city: string;
  pin?: string;
  rating: number;
  reviews: number;
  deliveryMins: number;
  deliveryFee: number;
  minOrder: number;
  promo?: string;
  isNiche?: boolean;
  isPopular?: boolean;
  isClosed?: boolean;
  tags: string[];
  categoryIds: string[];
  lat?: number | null;
  lng?: number | null;
  cover: ImageRef | null;
}

export type AnyOutlet = Restaurant & Partial<ShopStore>;

export interface Banner {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  badge?: string;
  image: ImageRef | null;
  target?: { kind: 'search' } | { kind: 'product'; productId: string } | { kind: 'category'; categoryId: string } | { kind: 'store'; storeId: string };
  sortOrder: number;
  active: boolean;
}

export interface CartLine {
  /** Stable cart key: refId + variant + addons + color + size. */
  id: string;
  refId: string;
  kind: ModuleKey;
  name: string;
  image: ImageRef | null;
  /** Base catalogue price (server repricing ignores this). */
  unitPrice: number;
  /** Unit price incl. variant + add-on surcharge (what the user sees). */
  linePrice: number;
  qty: number;
  variant?: string;
  addons?: string[];
  color?: string;
  size?: string;
  outletId: string;
  outletName: string;
  meta?: string;
}

export interface OrderLine {
  id: string;
  refId: string;
  kind: ModuleKey;
  name: string;
  meta?: string;
  unitPrice: number;
  qty: number;
  image: ImageRef | null;
}

export interface Order {
  id: string;
  code: string;
  module: ModuleKey;
  vendorId: string | null;
  outletId: string | null;
  placedAt: string;
  status: OrderStatus;
  items: OrderLine[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  payBy: PayBy;
  walletPaid: number;
  loyaltyEarned: number;
  etaMinutes: number;
  address: string;
  instructions: string;
  couponCode: string | null;
  cancelReason: string;
  deliveredAt: string | null;
  deliveryTaskId?: string | null;
  deliveryPartnerId?: string | null;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiList<T> {
  items: T[];
  meta?: PaginationMeta;
}
