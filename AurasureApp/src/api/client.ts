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
  /** Explicit bearer token; overrides `auth` when provided (admin console). */
  token?: string | null;
  /** Abort the request externally (race guards, screen unmount…). */
  signal?: AbortSignal;
  /** Hard deadline; 0 disables it. Defaults to DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

/** Production request budget before a request is abandoned (12 s). */
const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Performs a request against `{API_BASE_URL}/api/v1{path}` and unwraps the
 * server envelope. Throws `ApiError` on network errors, timeouts, external
 * aborts, non-2xx and failed envelopes, so callers (and the `useAppQuery`
 * fallback) can react uniformly:
 *  - TIMEOUT  → the server did not answer within `timeoutMs`
 *  - ABORTED  → the caller's AbortSignal fired (stale request, unmount)
 *  - NETWORK_ERROR → transport failed (DNS/offline/server down)
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, token, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError(0, 'API_DISABLED', 'No Aurasure API URL configured');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token !== undefined) {
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (auth) {
    const t = await tokenProvider?.();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  // Compose the caller's AbortSignal with an internal deadline so both a hard
  // timeout and an external cancel abort the *actual* fetch (never leaving a
  // request running in the background after the UI moved on).
  const controller = new AbortController();
  let timedOut = false;
  let externallyAborted = false;
  const onExternalAbort = (): void => {
    externallyAborted = true;
    controller.abort();
  };
  if (signal) {
    if (signal.aborted) {
      throw new ApiError(0, 'ABORTED', 'Request cancelled');
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = timeoutMs > 0 ? setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs) : null;

  const cleanup = (): void => {
    if (timer) clearTimeout(timer);
    if (signal) {
      try {
        signal.removeEventListener('abort', onExternalAbort);
      } catch {
        /* signal may already be gone - nothing else to clean */
      }
    }
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    cleanup();
    const abortedByUs =
      err instanceof Error && err.name === 'AbortError';
    if (timedOut) {
      throw new ApiError(0, 'TIMEOUT', 'Aurasure server took too long to respond');
    }
    if (abortedByUs || externallyAborted) {
      throw new ApiError(0, 'ABORTED', 'Request cancelled');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the Aurasure server');
  }
  cleanup();

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
