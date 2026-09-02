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

export interface UploadResult {
  image: { kind: 'uri'; uri: string };
  url: string;
  /** Same-origin path, e.g. `/uploads/2026-09/burger-x1.jpg`. */
  path: string;
  /** `2026-09/burger-x1.jpg` - used by the delete endpoint. */
  file: string;
  name: string;
  size: number;
  mimeType: string;
}

/**
 * Uploads one image to our own Node server (multer, disk storage) through the
 * same-origin proxy. `onProgress` reports 0-100 while the bytes are in flight,
 * which `fetch` cannot do — hence XMLHttpRequest.
 */
export function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('image', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/admin/uploads`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let json: { success?: boolean; data?: UploadResult; error?: { code: string; message: string } } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.success && json.data) {
        resolve(json.data);
        return;
      }
      if (xhr.status === 401) setToken(null);
      reject(new ApiError(xhr.status, json?.error?.code ?? 'UPLOAD_FAILED', json?.error?.message ?? 'Upload failed'));
    };

    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the Aurasure server'));
    xhr.onabort = () => reject(new ApiError(0, 'ABORTED', 'Upload cancelled'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(form);
  });
}

/** Deletes a file previously uploaded through `uploadImage` (`2026-09/x.jpg`). */
export function deleteUpload(file: string): Promise<{ deleted: string }> {
  return api<{ deleted: string }>(`/admin/uploads/${file}`, { method: 'DELETE' });
}

