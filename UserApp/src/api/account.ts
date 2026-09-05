/**
 * `GET/PUT /users/me`, addresses, favourites and the delivery-partner form.
 * Mirrors `server/src/routes/user.routes.js`.
 */

import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type { FavoriteRef, ModuleKey, UserAddress, UserProfile } from '@/types';

export function fetchMe(): Promise<UserProfile> {
  return apiGet<{ user: UserProfile }>('/users/me', { auth: true }).then((r) => r.user);
}

export function updateMe(patch: { name?: string; email?: string; avatar?: string | null }): Promise<UserProfile> {
  return apiPut<{ user: UserProfile }>('/users/me', patch, { auth: true }).then((r) => r.user);
}

/* ------------------------------- addresses ------------------------------- */

export function fetchAddresses(): Promise<UserAddress[]> {
  return apiGet<{ addresses: UserAddress[] }>('/users/me/addresses', { auth: true }).then((r) => r.addresses ?? []);
}

export interface AddressInput {
  label: string;
  line: string;
  city: string;
  pin: string;
  isDefault?: boolean;
  lat?: number | null;
  lng?: number | null;
}

export function addAddress(input: AddressInput): Promise<UserAddress> {
  return apiPost<{ address: UserAddress }>('/users/me/addresses', input, { auth: true }).then((r) => r.address);
}

export function editAddress(addressId: string, input: Partial<AddressInput>): Promise<UserAddress> {
  return apiPut<{ address: UserAddress }>(`/users/me/addresses/${encodeURIComponent(addressId)}`, input, {
    auth: true,
  }).then((r) => r.address);
}

export async function removeAddress(addressId: string): Promise<void> {
  // The server answers 204 with an empty body - call the raw request so the
  // JSON parser never trips over it.
  await apiDelete<{ ok?: boolean } | ''>(`/users/me/addresses/${encodeURIComponent(addressId)}`, { auth: true });
}

/* ------------------------------- favourites ------------------------------ */

export function fetchFavorites(): Promise<FavoriteRef[]> {
  return apiGet<{ favorites: FavoriteRef[] }>('/users/me/favorites', { auth: true }).then((r) => r.favorites ?? []);
}

export function setFavorite(module: ModuleKey, refId: string, liked: boolean): Promise<FavoriteRef[]> {
  return apiPut<{ favorites: FavoriteRef[] }>(
    '/users/me/favorites',
    { module, refId, liked },
    { auth: true },
  ).then((r) => r.favorites ?? []);
}

/* --------------------------- partner application ------------------------- */

export interface PartnerApplication {
  kind: 'delivery' | 'vendor';
  name: string;
  city: string;
  appliedAt: string;
  status: string;
}

export function applyAsDeliveryPartner(input: { name: string; city: string }): Promise<PartnerApplication> {
  return apiPost<{ application: PartnerApplication }>(
    '/users/me/partner-application',
    { kind: 'delivery', ...input },
    { auth: true },
  ).then((r) => r.application);
}
