/**
 * One fetch wrapper for the whole app.
 *
 *  - prefixes every path with `${API_BASE_URL}/api/v1`
 *  - unwraps the server envelope `{ success, data, meta }`
 *  - attaches the bearer token when `auth: true`
 *  - throws a typed `ApiError` for network, timeout, HTTP and envelope failures
 */

import { API_PREFIX, getApiBaseUrl } from '@/config';
import { getToken } from './session';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** 503 DB_DISCONNECTED / no URL configured → the app is "offline". */
  get isTransient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send `Authorization: Bearer <token>`. */
  auth?: boolean;
  /** Force a token (used by tests / re-auth flows). */
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Multipart form (image upload) - pass a factory so boundary is browser-made. */
  form?: () => FormData;
  /** Set when the caller wants the raw `meta` block too (pagination). */
  withMeta?: boolean;
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResult<T> {
  data: T;
  meta?: Meta;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Meta;
  error?: { code: string; message: string };
}

const DEFAULT_TIMEOUT_MS = 12000;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await apiRequestFull<T>(path, options);
  return result.data;
}

export async function apiRequestFull<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    auth = false,
    token,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    form,
  } = options;

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(0, 'API_NOT_CONFIGURED', 'Set EXPO_PUBLIC_API_URL to your Aurasure server');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof form === 'function';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = token !== undefined ? token : auth ? await getToken() : null;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const controller = new AbortController();
  let timedOut = false;
  let abortedByCaller = false;
  const onAbort = (): void => {
    abortedByCaller = true;
    controller.abort();
  };
  if (signal) {
    if (signal.aborted) throw new ApiError(0, 'ABORTED', 'Request cancelled');
    signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
      method,
      headers,
      body: isForm ? form!() : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
    if (timedOut) throw new ApiError(0, 'TIMEOUT', 'Aurasure server took too long to respond');
    if (abortedByCaller) throw new ApiError(0, 'ABORTED', 'Request cancelled');
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the Aurasure server');
  }
  if (timer) clearTimeout(timer);
  if (signal) signal.removeEventListener('abort', onAbort);

  // 204 No Content (e.g. DELETE /users/me/addresses/:id) has no envelope.
  if (res.status === 204) {
    return { data: undefined as T };
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok || !json || json.success !== true) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? `HTTP_${res.status}`,
      json?.error?.message ?? `Request failed (${res.status})`,
    );
  }

  return { data: json.data, meta: json.meta };
}

export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'POST', body: body ?? {} });

export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'PUT', body: body ?? {} });

export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'PATCH', body: body ?? {} });

export const apiDelete = <T>(path: string, options?: RequestOptions): Promise<T> =>
  apiRequest<T>(path, { ...options, method: 'DELETE' });

/** Same as `apiGet` but keeps `meta` for infinite-scroll screens. */
export const apiGetFull = <T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> =>
  apiRequestFull<T>(path, { ...options, method: 'GET' });

export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
