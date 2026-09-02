import type { ImageSourcePropType } from 'react-native';
import type { Address, Banner, Order, UserProfile } from '@/types';
import { Images } from '@/assets';

// Food + e-commerce data live in their own modules; re-exported here so
// existing consumers keep a single `../../data/mock` import.
export {
  cartItemFromFood,
  foodCategories,
  foodItems,
  foodVibes,
  getFoodItemsByRestaurant,
  getNewRestaurants,
  getPopularFoodItems,
  getRestaurantById,
  getSpecialFoodItems,
  getVibeItems,
  restaurants,
  searchFood,
} from './food';

export {
  cartItemFromProduct,
  getCategoryById,
  getNicheStores,
  getPopularProducts,
  getProductById,
  getProductsByCategory,
  getProductsByStore,
  getRecommendedStores,
  getSpecialOfferProducts,
  getStoreById,
  searchProducts,
  shopCategories,
  shopProducts,
  shopProducts as products,
  shopStores,
  shopStores as stores,
} from './shop';

type Ref = { kind: 'asset'; source: ImageSourcePropType } | null;

const A = (source: ImageSourcePropType): Ref => ({ kind: 'asset', source });

// ---------------------------------------------------------------------------
// BANNERS
// ---------------------------------------------------------------------------

export const banners: Banner[] = [
  { id: 'b1', module: 'food', title: 'Crave something good?', subtitle: '50% OFF your first order', badge: 'NEW', image: A(Images.bannerFood), target: { kind: 'search' } },
  { id: 'b2', module: 'food', title: 'Aurora Bistro', subtitle: 'Free delivery · 24 min', badge: 'FREE', image: A(Images.foodBurger), target: { kind: 'store', storeId: 'r_aurora' } },
  { id: 'b3', module: 'shop', title: 'Big Electronics Sale', subtitle: 'Up to 40% OFF audio & laptops', badge: 'SALE', image: A(Images.bannerShop), target: { kind: 'search' } },
  { id: 'b4', module: 'shop', title: 'Aura Minimal Watch', subtitle: 'Flat ₹1500 OFF · Limited', badge: 'HOT', image: A(Images.shopWatch), target: { kind: 'product', productId: 'p4' } },
  { id: 'b5', module: 'shop', title: 'Sunglasses Fest', subtitle: 'Up to 35% OFF at Solace Eyewear', badge: 'FEST', image: A(Images.bannerSunglasses), target: { kind: 'category', categoryId: 'sc_sunglasses' } },
  { id: 'b6', module: 'shop', title: 'Audio Week', subtitle: 'ANC headphones from ₹4,999', badge: 'WEEK', image: A(Images.bannerAudio), target: { kind: 'category', categoryId: 'sc_audio' } },
];

// ---------------------------------------------------------------------------
// USER & ORDERS
// ---------------------------------------------------------------------------

export const userProfile: UserProfile = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+91 98765 43210',
  avatar: null,
  wallet: 250,
  addresses: [
    { id: 'a1', label: 'Home', line: '402, Aurora Heights, Civil Lines', city: 'Raipur', pin: '492001', isDefault: true },
    { id: 'a2', label: 'Work', line: 'Tech Park, 5th Floor, GE Road', city: 'Raipur', pin: '492001', isDefault: false },
    { id: 'a3', label: 'Mom', line: '12, Garden Villa, Avanti Vihar', city: 'Raipur', pin: '492006', isDefault: false },
  ],
};

export const orders: Order[] = [
  {
    id: 'o1',
    code: 'AUR-FD-20517',
    module: 'food',
    placedAt: '2026-08-27T19:42:00.000Z',
    status: 'out_for_delivery',
    items: [
      { id: 'li1', refId: 'f1', kind: 'food', name: 'Aurora Classic Burger', meta: 'Medium', unitPrice: 249, qty: 2, image: A(Images.foodBurger) },
      { id: 'li2', refId: 'f3', kind: 'food', name: 'Butter Croissant', unitPrice: 119, qty: 1, image: A(Images.foodDessert) },
    ],
    itemTotal: 617,
    deliveryFee: 0,
    discount: 120,
    total: 497,
    etaMinutes: 12,
    address: '402, Aurora Heights, Civil Lines, Raipur',
  },
  {
    id: 'o2',
    code: 'AUR-SH-19842',
    module: 'shop',
    placedAt: '2026-08-25T11:05:00.000Z',
    status: 'delivered',
    items: [
      { id: 'li3', refId: 'p10', kind: 'shop', name: 'Aura ANC Headphones', meta: 'Indigo', unitPrice: 4999, qty: 1, image: A(Images.shopHeadphones) },
    ],
    itemTotal: 4999,
    deliveryFee: 0,
    discount: 2000,
    total: 2999,
    etaMinutes: 0,
    address: 'Tech Park, 5th Floor, GE Road, Raipur',
  },
  {
    id: 'o3',
    code: 'AUR-FD-20488',
    module: 'food',
    placedAt: '2026-08-21T13:20:00.000Z',
    status: 'delivered',
    items: [
      { id: 'li4', refId: 'f13', kind: 'food', name: 'Buddha Power Bowl', unitPrice: 289, qty: 1, image: A(Images.foodSalad) },
      { id: 'li5', refId: 'f15', kind: 'food', name: 'Green Detox Smoothie', unitPrice: 179, qty: 2, image: null },
    ],
    itemTotal: 647,
    deliveryFee: 15,
    discount: 0,
    total: 662,
    etaMinutes: 0,
    address: '12, Garden Villa, Avanti Vihar, Raipur',
  },
];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS
// ---------------------------------------------------------------------------

export const getBannersByModule = (module: 'food' | 'shop'): Banner[] =>
  banners.filter((b) => b.module === module);
