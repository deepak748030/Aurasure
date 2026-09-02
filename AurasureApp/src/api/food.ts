'use strict';

import { apiGet } from './client';
import { fetchMe } from './account';
import type { Banner, FoodCategory, FoodItem, FoodVibe, Restaurant, UserProfile } from '../types';

export interface FoodHomePayload {
  banners: Banner[];
  categories: FoodCategory[];
  vibes: FoodVibe[];
  restaurants: Restaurant[];
  newStores: Restaurant[];
  popular: FoodItem[];
  offers: FoodItem[];
  user: UserProfile | null;
}

/** Everything the Food home screen renders, in one shot. */
export async function fetchFoodHome(): Promise<FoodHomePayload> {
  const [banners, categories, vibes, restaurants, newStores, popular, offers, user] = await Promise.all([
    apiGet<{ banners: Banner[] }>('/banners?module=food'),
    apiGet<{ categories: FoodCategory[] }>('/food/categories'),
    apiGet<{ vibes: FoodVibe[] }>('/food/vibes'),
    apiGet<{ restaurants: Restaurant[] }>('/food/restaurants?limit=50'),
    apiGet<{ restaurants: Restaurant[] }>('/food/new-stores'),
    apiGet<{ items: FoodItem[] }>('/food/popular?limit=12'),
    apiGet<{ items: FoodItem[] }>('/food/offers?limit=12'),
    fetchMe(),
  ]);

  return {
    banners: banners.banners,
    categories: categories.categories,
    vibes: vibes.vibes,
    restaurants: restaurants.restaurants,
    newStores: newStores.restaurants,
    popular: popular.items,
    offers: offers.items,
    user,
  };
}

export async function fetchFoodCategories(): Promise<FoodCategory[]> {
  const data = await apiGet<{ categories: FoodCategory[] }>('/food/categories');
  return data.categories;
}

export interface RestaurantPayload {
  restaurant: Restaurant | undefined;
  items: FoodItem[];
  categories: FoodCategory[];
}

export async function fetchRestaurant(restaurantId: string): Promise<RestaurantPayload> {
  const [detail, categories] = await Promise.all([
    apiGet<{ restaurant: Restaurant; items: FoodItem[] }>(`/food/restaurants/${encodeURIComponent(restaurantId)}`),
    fetchFoodCategories(),
  ]);
  return { restaurant: detail.restaurant, items: detail.items, categories };
}

/** Full food catalog - used by the Likes/Wishlist screen. */
export async function fetchFoodCatalog(): Promise<FoodItem[]> {
  const data = await apiGet<{ items: FoodItem[] }>('/food/items?limit=200');
  return data.items;
}

export interface FoodSearchPayload {
  items: FoodItem[];
  restaurants: Restaurant[];
}

export async function fetchFoodSearch(query: string, signal?: AbortSignal): Promise<FoodSearchPayload> {
  const data = await apiGet<FoodSearchPayload>(
    `/search?module=food&q=${encodeURIComponent(query)}`,
    { signal },
  );
  return { items: data.items ?? [], restaurants: data.restaurants ?? [] };
}

export type FoodSeeAllPayload =
  | { kind: 'foodItems'; data: FoodItem[] }
  | { kind: 'foodStores'; data: Restaurant[] };

export async function fetchFoodSeeAll(
  mode: 'foodPopular' | 'foodOffers' | 'foodVibes' | 'foodNew' | 'foodNearby',
  vibeId?: string,
): Promise<FoodSeeAllPayload> {
  switch (mode) {
    case 'foodPopular': {
      const data = await apiGet<{ items: FoodItem[] }>('/food/popular?limit=200');
      return { kind: 'foodItems', data: data.items };
    }
    case 'foodOffers': {
      const data = await apiGet<{ items: FoodItem[] }>('/food/offers?limit=200');
      return { kind: 'foodItems', data: data.items };
    }
    case 'foodVibes': {
      const data = await apiGet<{ items: FoodItem[] }>(
        `/food/vibes/${encodeURIComponent(vibeId ?? '')}/items`,
      );
      return { kind: 'foodItems', data: data.items };
    }
    case 'foodNew': {
      const data = await apiGet<{ restaurants: Restaurant[] }>('/food/new-stores');
      return { kind: 'foodStores', data: data.restaurants };
    }
    case 'foodNearby': {
      const data = await apiGet<{ restaurants: Restaurant[] }>('/food/restaurants?limit=200');
      return { kind: 'foodStores', data: data.restaurants };
    }
  }
}
