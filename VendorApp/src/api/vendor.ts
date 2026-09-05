import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export type VendorStatus = 'onboarding' | 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'suspended';
export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface VendorDocument { key: string; label: string; uri: string; verified: boolean; note: string; }
export interface Vendor {
  id: string; phone: string; module: 'food' | 'shop'; status: VendorStatus; ownerName: string; email: string;
  outletName: string; legalName: string; description: string; address: string; landmark: string; city: string; pin: string;
  gstin: string; pan: string; fssai: string; tradeLicense: string; cuisines: string[]; categoryIds?: string[];
  bank?: { accountName: string; accountNumber: string; ifsc: string; bankName: string; upi: string };
  hours?: { open: string; close: string }; deliveryMins?: number; geo?: { lat?: number | null; lng?: number | null };
  documents: VendorDocument[]; reviewNote: string; isOpen: boolean; acceptingOrders?: boolean;
  pauseUntil?: string | null; pauseReason?: string; outletId?: string | null; payoutBalance: number;
  issues?: { id: string; title: string; body: string; status: string; createdAt?: string }[];
  staff?: Staff[];
}

export interface CatalogItem {
  id: string; name: string; price: number; mrp?: number; description?: string; isVeg?: boolean;
  inStock?: boolean; isAvailable?: boolean; image?: string | { kind: string; uri: string } | null;
  prepTime?: number; tags?: string[]; categoryIds?: string[]; categoryId?: string; brand?: string; stockQty?: number | null;
  variants?: { label?: string; priceDelta?: number }[]; addonGroups?: { name?: string }[];
  approvalStatus?: 'approved' | 'pending' | 'rejected'; rejectionReason?: string;
}
export interface Customer { name?: string; phone?: string; }
export interface VendorOrder {
  id: string; code: string; status: OrderStatus; total: number; itemTotal?: number; deliveryFee?: number; discount?: number;
  items: { id?: string; name: string; qty: number; unitPrice: number; meta?: string }[]; address: string; payBy?: string;
  placedAt: string; instructions?: string; etaMinutes?: number; customer?: Customer; user?: Customer;
  delivery?: { taskId: string; state: string; pickupOtp: string; riderName: string; riderPhone: string };
}
export interface DashboardStats { todayOrders: number; todaySales: number; liveOrders: number; menuCount: number; payoutBalance: number; }
export interface BusinessStats { range: string; orders: number; gross: number; net: number; cancelled: number; averagePrepMins: number; slaBreaches: number; }
export interface PayoutEntry { id: string; orderCode: string; date: string; gross: number; commission: number; net: number; status: string; }
export interface Staff { id: string; name: string; phone: string; role: string; active: boolean; }

export async function uploadVendorImage(file: Blob | { uri: string; name: string; type?: string }, name: string) {
  const { getApiBaseUrl } = await import('./config');
  const { getToken } = await import('./session');
  const { ApiError } = await import('./client');
  const base = getApiBaseUrl();
  if (!base) throw new ApiError(0, 'API_DISABLED', 'No Aurasure API URL configured');
  const token = await getToken();
  const form = new FormData();
  if (typeof Blob !== 'undefined' && file instanceof Blob) form.append('image', file, name);
  else form.append('image', file as unknown as Blob);
  const res = await fetch(`${base}/api/v1/vendor/uploads`, { method: 'POST', headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form });
  const json = await res.json().catch(() => null) as { success?: boolean; data?: { url: string; image: { kind: 'uri'; uri: string } }; error?: { code: string; message: string } } | null;
  if (!res.ok || !json?.success || !json.data) throw new ApiError(res.status, json?.error?.code ?? 'UPLOAD_FAILED', json?.error?.message ?? 'Upload failed');
  return json.data;
}

const query = (params: Record<string, string | undefined>) => {
  const out = Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`).join('&');
  return out ? `?${out}` : '';
};

export const vendorApi = {
  me: () => apiGet<{ vendor: Vendor }>('/vendor/me', { auth: true }),
  onboarding: () => apiGet<{ vendor: Vendor; documents: VendorDocument[]; required: { key: string; label: string }[] }>('/vendor/onboarding', { auth: true }),
  dashboard: () => apiGet<{ vendor: Vendor; stats: DashboardStats; live: VendorOrder[] }>('/vendor/dashboard', { auth: true }),
  save: (body: Record<string, unknown>) => apiPatch<{ vendor: Vendor }>('/vendor/onboarding', body, { auth: true }),
  updateProfile: (body: Record<string, unknown>) => apiPatch<{ vendor: Vendor }>('/vendor/me', body, { auth: true }),
  setDoc: (key: string, uri: string, label?: string) => apiPatch<{ vendor: Vendor }>('/vendor/documents', { key, uri, label }, { auth: true }),
  submit: () => apiPost<{ vendor: Vendor }>('/vendor/submit', {}, { auth: true }),
  setOpen: (isOpen: boolean) => apiPatch<{ vendor: Vendor }>('/vendor/open', { isOpen }, { auth: true }),
  pause: (outletId: string, minutes: number, reason: string) => apiPost<{ vendor: Vendor }>(`/vendor/outlets/${outletId}/pause`, { minutes, reason }, { auth: true }),

  orders: (status?: string, page = 1) => apiGet<{ orders: VendorOrder[]; meta?: { total: number; totalPages: number } }>(`/vendor/orders${query({ status, page: String(page), limit: '80' })}`, { auth: true }),
  order: (id: string) => apiGet<{ order: VendorOrder }>(`/vendor/orders/${id}`, { auth: true }),
  advance: (id: string, status: OrderStatus, expectedStatus?: string) => apiPatch<{ order: VendorOrder }>(`/vendor/orders/${id}/status`, { status, expectedStatus }, { auth: true }),
  accept: (id: string, prepMins: number, expectedStatus?: string) => apiPost<{ order: VendorOrder }>(`/vendor/orders/${id}/accept`, { prepMins, expectedStatus }, { auth: true }),
  reject: (id: string, reason: string, note?: string, expectedStatus?: string) => apiPost<{ order: VendorOrder }>(`/vendor/orders/${id}/reject`, { reason, note, expectedStatus }, { auth: true }),
  ready: (id: string, expectedStatus?: string) => apiPost<{ order: VendorOrder }>(`/vendor/orders/${id}/ready`, { expectedStatus }, { auth: true }),
  partialAccept: (id: string, removeLineIds: string[]) => apiPost<{ order: VendorOrder }>(`/vendor/orders/${id}/partial-accept`, { removeLineIds }, { auth: true }),

  catalog: (params?: { q?: string; status?: string; categoryId?: string }) => apiGet<{ items: CatalogItem[] }>(`/vendor/items${query(params ?? {})}`, { auth: true }),
  saveItem: (body: Record<string, unknown>) => apiPost<{ item: CatalogItem }>('/vendor/items', body, { auth: true }),
  updateItem: (id: string, body: Record<string, unknown>) => apiPatch<{ item: CatalogItem }>(`/vendor/items/${id}`, { ...body, id }, { auth: true }),
  toggleStock: (id: string, isAvailable: boolean, until?: string) => apiPatch<{ item: CatalogItem }>(`/vendor/items/${id}/availability`, { id, isAvailable, inStock: isAvailable, until }, { auth: true }),
  deleteItem: (id: string) => apiDelete<{ deleted: string }>(`/vendor/catalog/${id}`, { auth: true }),
  bulk: (ids: string[], op: string, value?: unknown) => apiPost<{ updated: number }>('/vendor/items/bulk', { ids, op, value }, { auth: true }),

  updateOutlet: (id: string, body: Record<string, unknown>) => apiPatch<{ vendor: Vendor }>(`/vendor/outlets/${id}`, body, { auth: true }),
  stats: (range: string) => apiGet<BusinessStats>(`/vendor/stats${query({ range })}`, { auth: true }),
  payouts: () => apiGet<{ current: number; nextPayoutDate: string | null; entries: PayoutEntry[] }>('/vendor/payouts', { auth: true }),
  statement: (id: string) => apiGet<{ statement: Record<string, unknown> }>(`/vendor/payouts/${id}/statement`, { auth: true }),
  ratings: () => apiGet<{ average: number; distribution: Record<string, number>; ratings: { id: string; customer: string; text: string; stars: number; reply?: string }[] }>('/vendor/ratings', { auth: true }),
  replyRating: (id: string, text: string) => apiPost(`/vendor/ratings/${id}/reply`, { text }, { auth: true }),
  staff: () => apiGet<{ staff: Staff[] }>('/vendor/staff', { auth: true }),
  addStaff: (body: { name: string; phone: string }) => apiPost<{ staff: Staff }>('/vendor/staff', body, { auth: true }),
  removeStaff: (id: string) => apiDelete<{ deleted: string }>(`/vendor/staff/${id}`, { auth: true }),
  issue: (title: string, body: string) => apiPost<{ vendor: Vendor }>('/vendor/issues', { title, body }, { auth: true }),
};
