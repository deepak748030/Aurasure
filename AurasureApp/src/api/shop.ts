'use strict';

import { apiGet } from './client';
import { fetchMe } from './account';
import type {
  Banner,
  Product,
  ShopCategory,
  ShopStore,
  UserProfile,
} from '../types';

export interface ShopCounts {
  store: Record<string, number>;
  category: Record<string, number>;
}

export function buildShopCounts(products: Product[]): ShopCounts {
  const store: Record<string, number> = {};
  const category: Record<string, number> = {};
  for (const p of products) {
    store[p.storeId] = (store[p.storeId] ?? 0) + 1;
    category[p.categoryId] = (category[p.categoryId] ?? 0) + 1;
  }
  return { store, category };
}

export interface ShopHomePayload {
  banners: Banner[];
  categories: ShopCategory[];
  stores: ShopStore[];
  popular: Product[];
  offers: Product[];
  recommended: ShopStore[];
  niche: ShopStore[];
  counts: ShopCounts;
  user: UserProfile | null;
}

/** Everything the shop home screen renders (incl. product counts per store/category). */
export async function fetchShopHome(): Promise<ShopHomePayload> {
  const [banners, categories, stores, popular, offers, recommended, niche, allProducts, user] =
    await Promise.all([
      apiGet<{ banners: Banner[] }>('/banners?module=shop'),
      apiGet<{ categories: ShopCategory[] }>('/shop/categories'),
      apiGet<{ stores: ShopStore[] }>('/shop/stores?limit=50'),
      apiGet<{ products: Product[] }>('/shop/popular?limit=12'),
      apiGet<{ products: Product[] }>('/shop/offers?limit=12'),
      apiGet<{ stores: ShopStore[] }>('/shop/stores?recommended=true'),
      apiGet<{ stores: ShopStore[] }>('/shop/stores?niche=true'),
      apiGet<{ products: Product[] }>('/shop/products?limit=200'),
      fetchMe(),
    ]);

  return {
    banners: banners.banners,
    categories: categories.categories,
    stores: stores.stores,
    popular: popular.products,
    offers: offers.products,
    recommended: recommended.stores,
    niche: niche.stores,
    counts: buildShopCounts(allProducts.products),
    user,
  };
}

export async function fetchShopCategories(): Promise<ShopCategory[]> {
  const data = await apiGet<{ categories: ShopCategory[] }>('/shop/categories');
  return data.categories;
}

export interface ShopCategoryPayload {
  category: ShopCategory | undefined;
  items: Product[];
}

export async function fetchShopCategory(categoryId: string): Promise<ShopCategoryPayload> {
  const [detail, products] = await Promise.all([
    apiGet<{ category: ShopCategory }>(`/shop/categories/${encodeURIComponent(categoryId)}`),
    apiGet<{ products: Product[] }>(`/shop/categories/${encodeURIComponent(categoryId)}/products`),
  ]);
  return { category: detail.category, items: products.products };
}

export interface ShopStorePayload {
  store: ShopStore | undefined;
  items: Product[];
}

export async function fetchShopStore(storeId: string): Promise<ShopStorePayload> {
  const data = await apiGet<{ store: ShopStore; products: Product[] }>(
    `/shop/stores/${encodeURIComponent(storeId)}`,
  );
  return { store: data.store, items: data.products };
}

export interface ProductPayload {
  product: Product | null;
  store: ShopStore | undefined;
}

export async function fetchProduct(productId: string): Promise<ProductPayload> {
  const productData = await apiGet<{ product: Product }>(
    `/shop/products/${encodeURIComponent(productId)}`,
  );
  const storeData = await apiGet<{ store: ShopStore }>(
    `/shop/stores/${encodeURIComponent(productData.product.storeId)}`,
  );
  return { product: productData.product, store: storeData.store };
}

/** Full product catalog - used by the Likes/Wishlist screen. */
export async function fetchShopCatalog(): Promise<Product[]> {
  const data = await apiGet<{ products: Product[] }>('/shop/products?limit=200');
  return data.products;
}

export interface ShopSearchPayload {
  products: Product[];
  stores: ShopStore[];
}

export async function fetchShopSearch(query: string, signal?: AbortSignal): Promise<ShopSearchPayload> {
  const data = await apiGet<ShopSearchPayload>(
    `/search?module=shop&q=${encodeURIComponent(query)}`,
    { signal },
  );
  return { products: data.products ?? [], stores: data.stores ?? [] };
}

export type ShopSeeAllPayload =
  | { kind: 'shopProducts'; data: Product[] }
  | { kind: 'shopStores'; data: ShopStore[]; countByStore: Record<string, number> };

export async function fetchShopSeeAll(
  mode: 'popular' | 'special' | 'recommended' | 'stores',
): Promise<ShopSeeAllPayload> {
  if (mode === 'popular') {
    const data = await apiGet<{ products: Product[] }>('/shop/popular?limit=200');
    return { kind: 'shopProducts', data: data.products };
  }
  if (mode === 'special') {
    const data = await apiGet<{ products: Product[] }>('/shop/offers?limit=200');
    return { kind: 'shopProducts', data: data.products };
  }

  const path = mode === 'recommended' ? '/shop/stores?recommended=true' : '/shop/stores?limit=200';
  const [stores, allProducts] = await Promise.all([
    apiGet<{ stores: ShopStore[] }>(path),
    apiGet<{ products: Product[] }>('/shop/products?limit=200'),
  ]);
  return {
    kind: 'shopStores',
    data: stores.stores,
    countByStore: buildShopCounts(allProducts.products).store,
  };
}
