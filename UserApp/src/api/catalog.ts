/**
 * Catalogue reads (public, no token): food, shop, banners, search.
 * Every path here exists in `server/src/routes/{food,shop,banner,search}.routes.js`.
 */

import { apiGet, apiGetFull, query, type Meta } from './client';
import type {
  Banner,
  CatalogItem,
  FoodCategory,
  FoodVibe,
  ModuleKey,
  Restaurant,
  ShopCategory,
  ShopStore,
} from '@/types';

export type StoreFilter = 'all' | 'new' | 'popular' | 'top';

/* --------------------------------- food ---------------------------------- */

export function fetchFoodCategories(): Promise<FoodCategory[]> {
  return apiGet<{ categories: FoodCategory[] }>('/food/categories').then((r) => r.categories ?? []);
}

export function fetchFoodVibes(): Promise<FoodVibe[]> {
  return apiGet<{ vibes: FoodVibe[] }>('/food/vibes').then((r) => r.vibes ?? []);
}

export function fetchVibeItems(vibeId: string): Promise<{ vibe: FoodVibe; items: CatalogItem[] }> {
  return apiGet<{ vibe: FoodVibe; items: CatalogItem[] }>(`/food/vibes/${encodeURIComponent(vibeId)}/items`);
}

export function fetchRestaurants(
  params: {
    category?: string;
    filter?: StoreFilter;
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ restaurants: Restaurant[]; meta?: Meta }> {
  return apiGetFull<{ restaurants: Restaurant[] }>(
    `/food/restaurants${query({ ...params, limit: params.limit ?? 20 })}`,
  ).then((r) => ({ restaurants: r.data.restaurants ?? [], meta: r.meta }));
}

export function fetchRestaurant(id: string): Promise<{ restaurant: Restaurant; items: CatalogItem[] }> {
  return apiGet<{ restaurant: Restaurant; items: CatalogItem[] }>(`/food/restaurants/${encodeURIComponent(id)}`);
}

export function fetchFoodItemsPage(params: {
  category?: string;
  popular?: boolean;
  special?: boolean;
  bestseller?: boolean;
  vibeId?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: CatalogItem[]; meta?: Meta }> {
  return apiGetFull<{ items: CatalogItem[] }>(`/food/items${query({ ...params, limit: params.limit ?? 20 })}`).then(
    (r) => ({ items: r.data.items ?? [], meta: r.meta }),
  );
}

export function fetchFoodItems(params: {
  category?: string;
  popular?: boolean;
  special?: boolean;
  bestseller?: boolean;
  vibeId?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<CatalogItem[]> {
  return apiGet<{ items: CatalogItem[] }>(`/food/items${query(params)}`).then((r) => r.items ?? []);
}

export function fetchFoodItem(id: string): Promise<CatalogItem> {
  return apiGet<{ item: CatalogItem }>(`/food/items/${encodeURIComponent(id)}`).then((r) => r.item);
}

export function fetchFoodPopular(limit = 12): Promise<CatalogItem[]> {
  return apiGet<{ items: CatalogItem[] }>(`/food/popular${query({ limit })}`).then((r) => r.items ?? []);
}

export function fetchFoodOffers(limit = 12): Promise<CatalogItem[]> {
  return apiGet<{ items: CatalogItem[] }>(`/food/offers${query({ limit })}`).then((r) => r.items ?? []);
}

export function fetchFoodNewStores(): Promise<Restaurant[]> {
  return apiGet<{ restaurants: Restaurant[] }>('/food/new-stores').then((r) => r.restaurants ?? []);
}

/* --------------------------------- shop ---------------------------------- */

export function fetchShopCategories(): Promise<ShopCategory[]> {
  return apiGet<{ categories: ShopCategory[] }>('/shop/categories').then((r) => r.categories ?? []);
}

export function fetchShopCategory(id: string): Promise<{ category: ShopCategory; itemCount: number }> {
  return apiGet<{ category: ShopCategory; itemCount: number }>(`/shop/categories/${encodeURIComponent(id)}`);
}

export function fetchShopCategoryProducts(id: string): Promise<{ category: ShopCategory; products: CatalogItem[] }> {
  return apiGet<{ category: ShopCategory; products: CatalogItem[] }>(
    `/shop/categories/${encodeURIComponent(id)}/products`,
  ).then((r) => ({ category: r.category, products: r.products ?? [] }));
}

export function fetchStores(params: {
  recommended?: boolean;
  niche?: boolean;
  popular?: boolean;
  city?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ShopStore[]> {
  return apiGet<{ stores: ShopStore[] }>(`/shop/stores${query({ ...params, limit: params.limit ?? 30 })}`).then(
    (r) => r.stores ?? [],
  );
}

export function fetchStoresPage(params: {
  recommended?: boolean;
  niche?: boolean;
  popular?: boolean;
  city?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ stores: ShopStore[]; meta?: Meta }> {
  return apiGetFull<{ stores: ShopStore[] }>(`/shop/stores${query({ ...params, limit: params.limit ?? 20 })}`).then(
    (r) => ({ stores: r.data.stores ?? [], meta: r.meta }),
  );
}

export interface OutletSnapshot {
  id: string;
  name: string;
  deliveryFee: number;
  minOrder: number;
  etaMinutes: number;
}

/**
 * Real outlet snapshot for cart validation. Screens that list items without
 * their outlets (search results, favourites, vibes…) resolve through here
 * instead of passing a zeroed stub.
 */
export async function fetchOutletSnapshot(module: ModuleKey, outletId: string): Promise<OutletSnapshot | null> {
  if (!outletId) return null;
  try {
    if (module === 'food') {
      const { restaurant } = await fetchRestaurant(outletId);
      return {
        id: restaurant.id,
        name: restaurant.name,
        deliveryFee: restaurant.deliveryFee ?? 0,
        minOrder: restaurant.minOrder ?? 0,
        etaMinutes: restaurant.deliveryTime ?? 30,
      };
    }
    const { store } = await fetchStore(outletId);
    return {
      id: store.id,
      name: store.name,
      deliveryFee: store.deliveryFee ?? 0,
      minOrder: store.minOrder ?? 0,
      etaMinutes: store.deliveryMins ?? 40,
    };
  } catch {
    return null;
  }
}

export function fetchStore(id: string): Promise<{ store: ShopStore; products: CatalogItem[] }> {
  return apiGet<{ store: ShopStore; products: CatalogItem[] }>(`/shop/stores/${encodeURIComponent(id)}`).then((r) => ({
    store: r.store,
    products: r.products ?? [],
  }));
}

export function fetchProducts(params: {
  category?: string;
  store?: string;
  trending?: boolean;
  special?: boolean;
  isNew?: boolean;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<CatalogItem[]> {
  return apiGet<{ products: CatalogItem[] }>(`/shop/products${query({ ...params, limit: params.limit ?? 40 })}`).then(
    (r) => r.products ?? [],
  );
}

export function fetchProductsPage(params: {
  category?: string;
  store?: string;
  trending?: boolean;
  special?: boolean;
  isNew?: boolean;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ products: CatalogItem[]; meta?: Meta }> {
  return apiGetFull<{ products: CatalogItem[] }>(
    `/shop/products${query({ ...params, limit: params.limit ?? 20 })}`,
  ).then((r) => ({ products: r.data.products ?? [], meta: r.meta }));
}

export function fetchProduct(id: string): Promise<CatalogItem> {
  return apiGet<{ product: CatalogItem }>(`/shop/products/${encodeURIComponent(id)}`).then((r) => r.product);
}

export function fetchShopPopular(limit = 12): Promise<CatalogItem[]> {
  return apiGet<{ products: CatalogItem[] }>(`/shop/popular${query({ limit })}`).then((r) => r.products ?? []);
}

export function fetchShopOffers(limit = 12): Promise<CatalogItem[]> {
  return apiGet<{ products: CatalogItem[] }>(`/shop/offers${query({ limit })}`).then((r) => r.products ?? []);
}

/* ------------------------- module-aware convenience ---------------------- */

export function fetchBanners(module: ModuleKey): Promise<Banner[]> {
  return apiGet<{ banners: Banner[] }>(`/banners${query({ module })}`).then((r) => r.banners ?? []);
}

export interface SearchResults {
  query: string;
  module: ModuleKey;
  items: CatalogItem[];
  restaurants: Restaurant[];
  products: CatalogItem[];
  stores: ShopStore[];
}

export function search(module: ModuleKey, q: string, signal?: AbortSignal): Promise<SearchResults> {
  return apiGet<SearchResults>(`/search${query({ module, q, limit: 40 })}`, { signal });
}

/** Items for a module - used by the wishlist + "visit again" screens. */
export function fetchCatalog(module: ModuleKey, limit = 200): Promise<CatalogItem[]> {
  return module === 'food' ? fetchFoodItems({ limit }) : fetchProducts({ limit });
}
