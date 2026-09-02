'use strict';

import { API_PASSWORD, API_PHONE, isApiEnabled } from './config';
import { apiPost, setTokenProvider } from './client';

let token: string | null = null;
let pending: Promise<string | null> | null = null;

async function acquire(): Promise<string | null> {
  try {
    const data = await apiPost<{ token: string }>('/auth/login', {
      phone: API_PHONE,
      password: API_PASSWORD,
    });
    token = data.token;
    return token;
  } catch {
    // Server down / 503 / bad credentials → callers fall back to mock data.
    return null;
  }
}

/**
 * Returns the demo session token, logging in silently on first use.
 * Returns `null` when the API is off or the server is unavailable.
 */
export function getToken(): Promise<string | null> {
  if (!isApiEnabled) return Promise.resolve(null);
  if (token) return Promise.resolve(token);
  if (!pending) pending = acquire().finally(() => { pending = null; });
  return pending;
}

/** True when a live session is available (used by account endpoints). */
export async function hasSession(): Promise<boolean> {
  return (await getToken()) !== null;
}

setTokenProvider(getToken);
