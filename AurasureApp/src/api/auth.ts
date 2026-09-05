/** `POST /auth/*` + `GET /auth/me` — see `server/src/routes/auth.routes.js`. */

import { apiGet, apiPost } from './client';
import type { UserProfile } from '@/types';

export interface AuthPayload {
  user: UserProfile;
  token: string;
}

export function login(phone: string, password: string): Promise<AuthPayload> {
  return apiPost<AuthPayload>('/auth/login', { phone, password });
}

export function register(input: {
  name: string;
  phone: string;
  password: string;
  email?: string;
}): Promise<AuthPayload> {
  return apiPost<AuthPayload>('/auth/register', {
    name: input.name.trim(),
    phone: input.phone.trim(),
    password: input.password,
    ...(input.email ? { email: input.email.trim() } : {}),
  });
}

export function me(): Promise<{ user: UserProfile }> {
  return apiGet<{ user: UserProfile }>('/auth/me', { auth: true });
}

/** `GET /health` is served even without MongoDB - perfect connectivity probe. */
export function health(): Promise<{ service: string; docs: string; version: string }> {
  return apiGet<{ service: string; docs: string; version: string }>('/health', { timeoutMs: 6000 });
}
