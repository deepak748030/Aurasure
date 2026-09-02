import { apiGet, apiPost, setTokenProvider } from './client';
import { readToken, writeToken } from '@/lib/storage';
import type { Vendor } from './vendor';

let token: string | null = readToken();

export function setSessionToken(next: string | null): void {
  token = next;
  writeToken(next);
}

export function getToken(): Promise<string | null> {
  return Promise.resolve(token);
}

setTokenProvider(getToken);

export async function vendorLogin(phone: string, password: string) {
  const data = await apiPost<{ token: string; user: unknown; vendor: Vendor }>('/vendor/auth/login', {
    phone,
    password,
  });
  setSessionToken(data.token);
  return data;
}

export async function vendorRegister(body: {
  name: string;
  phone: string;
  password: string;
  module: 'food' | 'shop';
  email?: string;
}) {
  const data = await apiPost<{ token: string; user: unknown; vendor: Vendor }>('/vendor/auth/register', body);
  setSessionToken(data.token);
  return data;
}

export async function restoreVendorSession(): Promise<Vendor | null> {
  if (!token) return null;
  try {
    const data = await apiGet<{ vendor: Vendor }>('/vendor/auth/me', { auth: true });
    return data.vendor;
  } catch {
    setSessionToken(null);
    return null;
  }
}

export function logoutSession(): void {
  setSessionToken(null);
}
