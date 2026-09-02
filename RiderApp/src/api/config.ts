const raw = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
export const API_BASE_URL = raw.replace(/\/+$/, '');
export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
}
export const isApiEnabled = API_BASE_URL.length > 0;
