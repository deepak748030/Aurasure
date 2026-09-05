/**
 * Session store: the JWT lives in AsyncStorage, the in-memory copy keeps the
 * synchronous `getToken` contract the API client needs.
 */

import type { UserProfile } from '@/types';
import { StorageKey, readJson, removeKey, writeJson } from '@/lib/storage';

let token: string | null = null;
let cache: UserProfile | null = null;
const listeners = new Set<() => void>();

export function subscribeSession(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  listeners.forEach((fn) => fn());
}

/** Used by `api/client` - never throws, returns null when signed out. */
export async function getToken(): Promise<string | null> {
  if (token) return token;
  const stored = await readJson<string | null>(StorageKey.token, null);
  token = typeof stored === 'string' && stored.length > 0 ? stored : null;
  return token;
}

export function getCachedUser(): UserProfile | null {
  return cache;
}

export async function restoreSession(): Promise<UserProfile | null> {
  await getToken();
  cache = await readJson<UserProfile | null>(StorageKey.user, null);
  emit();
  return cache;
}

export async function persistSession(next: { token: string; user: UserProfile }): Promise<void> {
  token = next.token;
  cache = next.user;
  await writeJson(StorageKey.token, next.token);
  await writeJson(StorageKey.user, next.user);
  emit();
}

export async function patchUser(next: Partial<UserProfile>): Promise<void> {
  cache = cache ? { ...cache, ...next } : null;
  if (cache) await writeJson(StorageKey.user, cache);
  emit();
}

export async function clearSession(): Promise<void> {
  token = null;
  cache = null;
  await removeKey(StorageKey.token);
  await removeKey(StorageKey.user);
  emit();
}
