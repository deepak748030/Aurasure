'use strict';

const raw = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

/** Base URL of the Aurasure backend, e.g. `http://localhost:5000`. */
export const API_BASE_URL = raw.replace(/\/+$/, '');

/**
 * Same value, read lazily (Expo still inlines the EXPO_PUBLIC_* reference at
 * build time). Lets tests/scripts point the client at a different server
 * without re-importing modules.
 */
export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
}

/** Demo account used to load the signed-in profile/orders (dev). */
export const API_PHONE = process.env.EXPO_PUBLIC_API_PHONE?.trim() || '9876543210';
export const API_PASSWORD = process.env.EXPO_PUBLIC_API_PASSWORD?.trim() || 'aurasure123';

/** Admin account used by the in-app Admin Console (server seeded by default). */
export const ADMIN_PHONE = process.env.EXPO_PUBLIC_ADMIN_PHONE?.trim() || '8888888888';
export const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD?.trim() || 'admin@aurasure';

/** `false` = no URL configured → the app stays fully on mock data. */
export const isApiEnabled = API_BASE_URL.length > 0;
