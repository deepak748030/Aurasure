import { Platform } from 'react-native';
const TOKEN = 'aurasure.vendor.token';
function webStorage(): Storage | null { try { if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) return globalThis.localStorage; } catch { /* blocked browser storage */ } return null; }
export function readToken(): string | null { return webStorage()?.getItem(TOKEN) ?? null; }
export async function readTokenAsync(): Promise<string | null> { const storage = webStorage(); if (storage) return storage.getItem(TOKEN); if (Platform.OS !== 'web') { try { const SecureStore = await import('expo-secure-store'); return await SecureStore.getItemAsync(TOKEN); } catch { return null; } } return null; }
export function writeToken(token: string | null): void { const storage = webStorage(); if (storage) { if (token) storage.setItem(TOKEN, token); else storage.removeItem(TOKEN); return; } if (Platform.OS !== 'web') void import('expo-secure-store').then((SecureStore) => token ? SecureStore.setItemAsync(TOKEN, token) : SecureStore.deleteItemAsync(TOKEN)).catch(() => undefined); }
