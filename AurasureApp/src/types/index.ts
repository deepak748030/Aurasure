import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/lib/icons';

export type ModuleKey = 'food' | 'shop';

export type ImageRef =
  | { kind: 'asset'; source: ImageSourcePropType }
  | { kind: 'uri'; uri: string }
  | null;

export interface FoodCategory {
  id: string;
  name: string;
  icon: IconName;
  image?: ImageRef;
}

/** Curated "Just for You" collection tile (Litti Chokha, Veg Biryani...). */
export interface FoodVibe {
  id: string;
  name: string;
  tagline: string;
  image: ImageRef;
  from: string;
  to: string;
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  mrp?: number;
  rating: number;
  reviews: number;
  prepTime: number;
  isVeg: boolean;
  isBestseller?: boolean;
  isPopular?: boolean;
  isSpecial?: boolean;
  vibeId?: string;
  tags: string[];
  image: ImageRef;
  categoryIds: string[];
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
  cover: ImageRef;
  tags: string[];
  categoryIds: string[];
}

export interface ShopCategory {
  id: string;
  name: string;
  icon: IconName;
  tagline?: string;
  image?: ImageRef;
}

export interface ShopStore {
  id: string;
  name: string;
  brand: string;
  road: string;
  house: string;
  city: string;
  pin: string;
  rating: number;
  reviews: number;
  deliveryMins: number;
  deliveryFee: number;
  minOrder: number;
  promo?: string;
  isNiche?: boolean;
  isPopular?: boolean;
  tags: string[];
  categoryIds: string[];
  cover: ImageRef;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  isBestseller?: boolean;
  isSpecialOffer?: boolean;
  deliveryMins: number;
  tags: string[];
  colors: string[];
  sizes?: string[];
  image: ImageRef;
  categoryId: string;
}

/** Where a banner should land when tapped. */
export type BannerTarget =
  | { kind: 'search' }
  | { kind: 'product'; productId: string }
  | { kind: 'category'; categoryId: string }
  | { kind: 'store'; storeId: string };

export interface Banner {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  badge?: string;
  image: ImageRef;
  target?: BannerTarget;
}

export type CartKind = 'food' | 'shop';

export interface CartItem {
  id: string;
  refId: string;
  kind: CartKind;
  name: string;
  meta?: string;
  unitPrice: number;
  qty: number;
  image: ImageRef;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  code: string;
  module: ModuleKey;
  placedAt: string;
  status: OrderStatus;
  items: CartItem[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  etaMinutes: number;
  address: string;
  /** Payment channel - wallet orders were deducted from the user balance. */
  payBy?: 'wallet' | 'cod' | 'upi' | 'card';
  walletPaid?: number;
  loyaltyEarned?: number;
  /** Coupon redeemed on this order (server stores it for cancel restores). */
  couponId?: string | null;
  couponCode?: string | null;
  /** Reason the customer gave when cancelling (empty for active orders). */
  cancelReason?: string;
  /** Customer instruction (e.g. "if any product is not available → call me"). */
  instructions?: string;
  /** Delivery partner / rider task info - filled once an order is on the way. */
  delivery?: {
    taskId?: string;
    state?: string;
    pickupOtp?: string;
    riderName?: string;
    riderPhone?: string;
  } | null;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveredAt?: string;
}

export interface Address {
  id: string;
  label: string;
  line: string;
  city: string;
  pin: string;
  isDefault: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar: ImageRef;
  wallet: number;
  addresses: Address[];
}

/* ---------------------------- Rewards ---------------------------- */

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  note?: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export interface WalletData {
  balance: number;
  transactions: WalletTx[];
}

export interface LoyaltyTx {
  id: string;
  type: 'earned' | 'redeemed' | 'reversed';
  title: string;
  note?: string;
  points: number;
  balanceAfter: number;
  createdAt: string;
}

export interface LoyaltyData {
  points: number;
  tier: string;
  activity: LoyaltyTx[];
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  minOrder: number;
  offType: 'flat' | 'percent';
  offValue: number;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface ReferralInfo {
  code: string;
  earnings: number;
  friends: number;
  referredBy: string | null;
}

export interface PartnerApplication {
  kind: 'delivery' | 'vendor';
  name: string;
  city: string;
  appliedAt: string;
  status: string;
}

/* ---------------------------- Admin console ---------------------------- */

/** Order as seen by the admin console - includes who placed it. */
export interface AdminOrder extends Order {
  user?: { name: string; phone: string } | null;
}

export interface AdminPartnerApplication {
  userId: string;
  name: string;
  phone: string;
  kind: 'delivery' | 'vendor';
  city: string;
  appliedAt: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  note?: string;
}

export interface AdminStats {
  users: number;
  restaurants: number;
  foodItems: number;
  shops: number;
  products: number;
  orders: number;
  revenue: number;
  liveOrders: number;
  cancelledOrders: number;
  walletCollected: number;
  pendingPartners: number;
}

export type { IconName } from '@/lib/icons';
