'use client';

/**
 * Thin fetch wrapper around the Aurasure Node API.
 *
 * Requests always go to the same origin (`/api/backend/...`); `next.config.mjs`
 * rewrites that prefix to `${ADMIN_API_URL}/api/v1`. The server answers with
 * `{ success, data, meta?, error? }` and this module unwraps it.
 */

export const TOKEN_KEY = 'aurasure.admin.token';

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** Send the stored bearer token (default true). */
  auth?: boolean;
  timeoutMs?: number;
}

export interface Envelope<T> {
  data: T;
  meta?: ListMeta;
}

const BASE = '/api/backend';
const DEFAULT_TIMEOUT = 20000;

export function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Performs the request and returns `{ data, meta }`. Throws `ApiError`. */
export async function apiRaw<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const { method = 'GET', body, query, signal, auth = true, timeoutMs = DEFAULT_TIMEOUT } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the Aurasure server');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  let json: { success?: boolean; data?: T; meta?: ListMeta; error?: { code: string; message: string } } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok || !json || json.success === false) {
    const code = json?.error?.code ?? `HTTP_${res.status}`;
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, code, message);
  }

  return { data: json.data as T, meta: json.meta };
}

/** Same as `apiRaw` but returns only the payload. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await apiRaw<T>(path, options);
  return data;
}
