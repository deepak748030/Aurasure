/**
 * Runtime configuration. Everything here can be overridden with an
 * `EXPO_PUBLIC_*` env var (see `.env.example`) - Expo inlines these at build
 * time, so they must be static references.
 */

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Base URL of the Aurasure Node.js API, without the `/api/v1` suffix. */
export function getApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  return trimSlash(raw);
}

export const API_BASE_URL = getApiBaseUrl();

/** Every request goes through this prefix (matches `server/src/app.js`). */
export const API_PREFIX = '/api/v1';

export const CURRENCY = (process.env.EXPO_PUBLIC_CURRENCY ?? '₹').trim() || '₹';

export const isApiConfigured = API_BASE_URL.length > 0;

export const APP = {
  name: 'Aurasure',
  role: 'Customer app',
  version: '1.0.0',
  build: 'V3.7-Mart-UI-UX · Expo',
} as const;
