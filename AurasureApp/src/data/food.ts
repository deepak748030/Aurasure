import type { CartItem, FoodCategory, FoodItem, FoodVibe, Restaurant } from '@/types';

// ---------------------------------------------------------------------------
// FOOD MODULE
// ---------------------------------------------------------------------------
//
// No mock/demo content ships in the app anymore. Every food catalogue value
// (categories, vibes, restaurants, items) comes from the Aurasure API via the
// `useAppQuery` fetchers. These empty arrays exist only so the fallback path
// stays type-safe and the screens render an empty state (never crash) when the
// server is briefly unreachable.
// ---------------------------------------------------------------------------

export const foodCategories: FoodCategory[] = [];

export const foodVibes: FoodVibe[] = [];

export const restaurants: Restaurant[] = [];

export const foodItems: FoodItem[] = [];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS (pure logic — operate on whatever data is passed/loaded)
// ---------------------------------------------------------------------------

export const getRestaurantById = (id: string): Restaurant | undefined =>
  restaurants.find((r) => r.id === id);

export const getFoodItemsByRestaurant = (restaurantId: string): FoodItem[] =>
  foodItems.filter((f) => f.restaurantId === restaurantId);

export const getPopularFoodItems = (): FoodItem[] => foodItems.filter((f) => f.isPopular);

export const getSpecialFoodItems = (): FoodItem[] => foodItems.filter((f) => f.isSpecial);

export const getNewRestaurants = (): Restaurant[] => restaurants.filter((r) => r.isNew);

export const getVibeItems = (vibeId: string): FoodItem[] => foodItems.filter((f) => f.vibeId === vibeId);

export const searchFood = (query: string): FoodItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return foodItems.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

/** Restaurant matches for a search term (keeps "Search restaurants" honest). */
export const searchRestaurants = (query: string): Restaurant[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.cuisines.some((c) => c.toLowerCase().includes(q)) ||
      (r.line ?? '').toLowerCase().includes(q) ||
      (r.offer ?? '').toLowerCase().includes(q),
  );
};

export const cartItemFromFood = (item: FoodItem, qty: number, meta?: string): CartItem => ({
  id: `${item.id}-${meta ?? 'default'}`,
  refId: item.id,
  kind: 'food',
  name: item.name,
  meta,
  unitPrice: item.price,
  qty,
  image: item.image,
});
