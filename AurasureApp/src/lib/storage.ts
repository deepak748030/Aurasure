import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'aurasure.user.v1';

export const StorageKey = {
  token: `${NS}.token`,
  user: `${NS}.user`,
  cart: `${NS}.cart`,
  onboarded: `${NS}.onboarded`,
  address: `${NS}.address`,
  city: `${NS}.city`,
  module: `${NS}.module`,
  theme: `${NS}.theme`,
  recentSearches: `${NS}.recent-searches`,
  settings: `${NS}.settings`,
  offlineOrders: `${NS}.offline-queue`,
} as const;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage failures must never crash the app */
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
