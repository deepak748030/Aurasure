'use strict';

import { getApiBaseUrl } from './config';

/** Typed wrapper around transport-level failures (network, HTTP, envelope). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/**
 * The auth module registers itself here so `client` never imports `session`
 * (avoids a circular dependency). Tokens are only attached when `auth: true`.
 */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the Bearer token (silent demo login) when available. */
  auth?: boolean;
  signal?: AbortSignal;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/**
 * Performs a request against `{API_BASE_URL}/api/v1{path}` and unwraps the
 * server envelope. Throws `ApiError` on network errors, non-2xx and failed
 * envelopes, so callers (and the `useAppQuery` fallback) can react uniformly.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal } = options;

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(0, 'API_DISABLED', 'No Aurasure API URL configured');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await tokenProvider?.();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Aurasure server took too long to respond');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the Aurasure server');
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON body - handled below.
  }

  if (!res.ok || !json || json.success !== true) {
    throw new ApiError(res.status, json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? 'Request failed');
  }

  return json.data;
}

export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'GET' });

export const apiPost = <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'POST', body });

export const apiPut = <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'PUT', body });

export const apiPatch = <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'PATCH', body });

export const apiDelete = <T>(path: string, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'DELETE' });
