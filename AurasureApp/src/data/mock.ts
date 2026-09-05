import type { Banner, Order, UserProfile } from '@/types';

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

// ---------------------------------------------------------------------------
// No mock/demo content ships in the app anymore. Banners, orders and the
// signed-in profile all come from the Aurasure API (see `src/api/*`). The
// values below are empty/blank fallbacks so the `useAppQuery` fallback path
// stays type-safe and screens render an empty state (never crash) when the
// server is briefly unreachable.
// ---------------------------------------------------------------------------

// BANNERS ------------------------------------------------------------------

export const banners: Banner[] = [];

// USER & ORDERS ------------------------------------------------------------

export const userProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  avatar: null,
  wallet: 0,
  addresses: [],
};

export const orders: Order[] = [];

// SELECTORS / HELPERS ------------------------------------------------------

export const getBannersByModule = (module: 'food' | 'shop'): Banner[] =>
  banners.filter((b) => b.module === module);
