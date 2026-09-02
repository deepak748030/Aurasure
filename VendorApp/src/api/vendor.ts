import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export type VendorStatus =
  | 'onboarding'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface Vendor {
  id: string;
  phone: string;
  module: 'food' | 'shop';
  status: VendorStatus;
  ownerName: string;
  email: string;
  outletName: string;
  legalName: string;
  description: string;
  address: string;
  landmark: string;
  city: string;
  pin: string;
  gstin: string;
  pan: string;
  fssai: string;
  tradeLicense: string;
  cuisines: string[];
  bank?: { accountName: string; accountNumber: string; ifsc: string; bankName: string; upi: string };
  hours?: { open: string; close: string };
  documents: { key: string; label: string; uri: string; verified: boolean; note: string }[];
  reviewNote: string;
  isOpen: boolean;
  payoutBalance: number;
  issues?: { id: string; title: string; body: string; status: string }[];
}

export interface VendorOrder {
  id: string;
  code: string;
  status: string;
  total: number;
  items: { name: string; qty: number; unitPrice: number }[];
  address: string;
  payBy?: string;
  placedAt: string;
  instructions?: string;
}

export async function uploadVendorImage(file: Blob, name: string): Promise<{ url: string; image: { kind: 'uri'; uri: string } }> {
  const { getApiBaseUrl } = await import('./config');
  const { getToken } = await import('./session');
  const { ApiError } = await import('./client');
  const base = getApiBaseUrl();
  if (!base) throw new ApiError(0, 'API_DISABLED', 'No Aurasure API URL configured');
  const token = await getToken();
  const form = new FormData();
  form.append('image', file, name);
  const res = await fetch(`${base}/api/v1/vendor/uploads`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { url: string; image: { kind: 'uri'; uri: string } };
    error?: { code: string; message: string };
  } | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new ApiError(res.status, json?.error?.code ?? 'UPLOAD_FAILED', json?.error?.message ?? 'Upload failed');
  }
  return json.data;
}

export const vendorApi = {
  me: () => apiGet<{ vendor: Vendor }>('/vendor/me', { auth: true }),
  dashboard: () =>
    apiGet<{
      vendor: Vendor;
      stats: { todayOrders: number; todaySales: number; liveOrders: number; menuCount: number; payoutBalance: number };
      live: VendorOrder[];
    }>('/vendor/dashboard', { auth: true }),
  save: (body: Record<string, unknown>) => apiPatch<{ vendor: Vendor }>('/vendor/me', body, { auth: true }),
  setDoc: (key: string, uri: string, label?: string) =>
    apiPatch<{ vendor: Vendor }>('/vendor/documents', { key, uri, label }, { auth: true }),
  submit: () => apiPost<{ vendor: Vendor }>('/vendor/submit', {}, { auth: true }),
  setOpen: (isOpen: boolean) => apiPatch<{ vendor: Vendor }>('/vendor/open', { isOpen }, { auth: true }),
  orders: (status?: string) =>
    apiGet<{ orders: VendorOrder[] }>(`/vendor/orders${status ? `?status=${status}` : ''}`, { auth: true }),
  advance: (id: string, status: string) =>
    apiPatch<{ order: VendorOrder }>(`/vendor/orders/${id}/status`, { status }, { auth: true }),
  catalog: () => apiGet<{ items: Record<string, unknown>[] }>('/vendor/catalog', { auth: true }),
  saveItem: (body: Record<string, unknown>) => apiPost<{ item: Record<string, unknown> }>('/vendor/catalog', body, { auth: true }),
  deleteItem: (id: string) => apiDelete<{ deleted: string }>(`/vendor/catalog/${id}`, { auth: true }),
  issue: (title: string, body: string) => apiPost<{ vendor: Vendor }>('/vendor/issues', { title, body }, { auth: true }),
};
