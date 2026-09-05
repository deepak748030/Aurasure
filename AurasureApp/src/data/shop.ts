import type { CartItem, Product, ShopCategory, ShopStore } from '@/types';

// ---------------------------------------------------------------------------
// E-COMMERCE (SHOP) MODULE
// ---------------------------------------------------------------------------
//
// No mock/demo content ships in the app anymore. Every shop catalogue value
// (categories, stores, products) comes from the Aurasure API via the
// `useAppQuery` fetchers. These empty arrays exist only so the fallback path
// stays type-safe and the screens render an empty state (never crash) when the
// server is briefly unreachable.
// ---------------------------------------------------------------------------

export const shopCategories: ShopCategory[] = [];

export const shopStores: ShopStore[] = [];

export const shopProducts: Product[] = [];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS (pure logic — operate on whatever data is passed/loaded)
// ---------------------------------------------------------------------------

export const getProductById = (id: string): Product | undefined =>
  shopProducts.find((p) => p.id === id);

export const getStoreById = (id: string): ShopStore | undefined =>
  shopStores.find((s) => s.id === id);

export const getCategoryById = (id: string): ShopCategory | undefined =>
  shopCategories.find((c) => c.id === id);

export const getProductsByStore = (storeId: string): Product[] =>
  shopProducts.filter((p) => p.storeId === storeId);

export const getProductsByCategory = (categoryId: string): Product[] =>
  shopProducts.filter((p) => p.categoryId === categoryId);

export const getPopularProducts = (): Product[] => shopProducts.filter((p) => p.isTrending);

export const getSpecialOfferProducts = (): Product[] => shopProducts.filter((p) => p.isSpecialOffer);

export const getRecommendedStores = (): ShopStore[] =>
  shopStores.filter((s) => s.isPopular !== false);

export const getNicheStores = (): ShopStore[] => shopStores.filter((s) => s.isNiche);

export const searchProducts = (query: string): Product[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return shopProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

/** Store matches for a search term (keeps "Search products or brands" honest). */
export const searchStores = (query: string): ShopStore[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return shopStores.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.road.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

export const cartItemFromProduct = (item: Product, qty: number, meta?: string): CartItem => ({
  id: `${item.id}-${meta ?? 'default'}`,
  refId: item.id,
  kind: 'shop',
  name: item.name,
  meta,
  unitPrice: item.price,
  qty,
  image: item.image,
});
