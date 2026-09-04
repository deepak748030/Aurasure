import { apiGet, apiPost, setTokenProvider } from './client';
import { readToken, readTokenAsync, writeToken } from '@/lib/storage';
import type { Vendor } from './vendor';
let token: string | null = readToken(); let hydrated = token !== null;
const tokenReady = readTokenAsync().then((stored) => { if (!hydrated && token === null) token = stored; hydrated = true; });
export function setSessionToken(next: string | null): void { hydrated = true; token = next; writeToken(next); }
export function getToken(): Promise<string | null> { return Promise.resolve(token); }
setTokenProvider(getToken);
export async function vendorLogin(phone: string, password: string): Promise<{ token: string; vendor: Vendor }> { const data = await apiPost<{ token: string; user: unknown; vendor: Vendor }>('/vendor/auth/login', { phone, password }); setSessionToken(data.token); return { token: data.token, vendor: data.vendor }; }
export async function vendorRegister(body: { name: string; phone: string; password: string; module: 'food' | 'shop'; email?: string }): Promise<{ token: string; vendor: Vendor }> { const data = await apiPost<{ token: string; user: unknown; vendor: Vendor }>('/vendor/auth/register', body); setSessionToken(data.token); return { token: data.token, vendor: data.vendor }; }
export async function restoreVendorSession(): Promise<Vendor | null> { await tokenReady; if (!token) return null; try { const data = await apiGet<{ vendor: Vendor }>('/vendor/auth/me', { auth: true }); return data.vendor; } catch { setSessionToken(null); return null; } }
export function logoutSession(): void { setSessionToken(null); }
