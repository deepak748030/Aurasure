import { apiGet, apiPost, setTokenProvider } from './client';
import { readToken, readTokenAsync, writeToken } from '@/lib/storage';
import type { Rider } from './rider';

let token: string | null = readToken();
let tokenHydrated = token !== null;
const tokenReady = readTokenAsync().then((stored) => {
  // A login/logout can complete before the secure-store read; never overwrite
  // a fresh in-memory decision with a stale value from disk.
  if (!tokenHydrated && token === null) token = stored;
  tokenHydrated = true;
});

export function setSessionToken(next: string | null): void {
  tokenHydrated = true;
  token = next;
  writeToken(next);
}

export function getToken(): Promise<string | null> {
  return Promise.resolve(token);
}

setTokenProvider(getToken);

export interface RiderSession {
  token: string;
  rider: Rider;
}

export async function riderLogin(phone: string, password: string): Promise<RiderSession> {
  const data = await apiPost<{ token: string; rider: Rider }>('/rider/auth/login', { phone, password });
  setSessionToken(data.token);
  return { token: data.token, rider: data.rider };
}

export async function riderRegister(body: {
  name: string;
  phone: string;
  password: string;
  vehicleType?: string;
}): Promise<RiderSession> {
  const data = await apiPost<{ token: string; rider: Rider }>('/rider/auth/register', body);
  setSessionToken(data.token);
  return { token: data.token, rider: data.rider };
}

export async function restoreRiderSession(): Promise<Rider | null> {
  await tokenReady;
  if (!token) return null;
  try {
    const data = await apiGet<{ rider: Rider }>('/rider/auth/me', { auth: true });
    return data.rider;
  } catch {
    setSessionToken(null);
    return null;
  }
}

export function logoutSession(): void {
  setSessionToken(null);
}
