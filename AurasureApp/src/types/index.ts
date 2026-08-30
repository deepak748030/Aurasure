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
  offer?: string;
  cover: ImageRef;
  tags: string[];
  categoryIds: string[];
}

export interface ShopCategory {
  id: string;
  name: string;
  icon: IconName;
}

export interface Product {
  id: string;
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
  tags: string[];
  colors: string[];
  sizes?: string[];
  image: ImageRef;
  categoryId: string;
}

export interface Banner {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  badge?: string;
  image: ImageRef;
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

export type { IconName } from '@/lib/icons';
