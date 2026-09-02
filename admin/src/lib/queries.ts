'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api, apiRaw, type ListMeta, type RequestOptions } from './api';
import type {
  CatalogRecord,
  CustomerDetail,
  CustomerRow,
  Lookups,
  Order,
  PartnerApplication,
  ReportOverview,
  Stats,
  SystemInfo,
} from './types';

/* --------------------------------- reads -------------------------------- */

export function useStats(refetchMs = 60000) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api<Stats>('/admin/stats'),
    refetchInterval: refetchMs,
  });
}

export function useReport(days: number) {
  return useQuery({
    queryKey: ['report', days],
    queryFn: () => api<ReportOverview>('/admin/reports/overview', { query: { days } }),
  });
}

export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: () => api<Lookups>('/admin/lookups'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemInfo() {
  return useQuery({ queryKey: ['system'], queryFn: () => api<SystemInfo>('/admin/system') });
}

export interface OrderQuery {
  module?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useOrders(query: OrderQuery, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: async () => {
      const res = await apiRaw<{ orders: Order[] }>('/admin/orders', { query: { ...query } });
      return { orders: res.data.orders, meta: res.meta as ListMeta | undefined };
    },
    refetchInterval: options?.refetchInterval,
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api<{ order: Order }>(`/admin/orders/${id}`),
    enabled: Boolean(id),
  });
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: () => api<{ applications: PartnerApplication[] }>('/admin/partners'),
  });
}

export function useCustomers(query: { q?: string; role?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: async () => {
      const res = await apiRaw<{ customers: CustomerRow[] }>('/admin/customers', { query: { ...query } });
      return { customers: res.data.customers, meta: res.meta as ListMeta | undefined };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () =>
      api<{ customer: CustomerDetail; stats: { orders: number; spent: number; cancelled: number }; orders: Order[] }>(
        `/admin/customers/${id}`,
      ),
    enabled: Boolean(id),
  });
}

/* ------------------------- generic catalogue CRUD ------------------------ */

export interface ResourceQuery {
  q?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

/** List any `/admin/<path>` catalogue resource with search + pagination. */
export function useResourceList<T extends CatalogRecord>(
  path: string,
  key: string,
  query: ResourceQuery,
  options?: Partial<UseQueryOptions<{ rows: T[]; meta?: ListMeta }>>,
) {
  return useQuery({
    queryKey: ['resource', path, query],
    queryFn: async () => {
      const res = await apiRaw<Record<string, T[]>>(`/admin/${path}`, { query: { ...query } });
      return { rows: (res.data[key] ?? []) as T[], meta: res.meta as ListMeta | undefined };
    },
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useResourceMutation(path: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['resource', path] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
    void qc.invalidateQueries({ queryKey: ['lookups'] });
  };

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/${path}`, { method: 'POST', body }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api(`/admin/${path}/${id}`, { method: 'PUT', body }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/${path}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* ------------------------------- mutations ------------------------------ */

export function useOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api<{ order: Order }>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['order', variables.id] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

export function usePartnerDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, note }: { userId: string; status: 'approved' | 'rejected'; note?: string }) =>
      api(`/admin/partners/${userId}`, { method: 'PATCH', body: { status, note } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partners'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCustomerMutations(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['customer', id] });
    void qc.invalidateQueries({ queryKey: ['customers'] });
  };

  const wallet = useMutation({
    mutationFn: (body: { type: 'credit' | 'debit'; amount: number; note?: string }) =>
      api(`/admin/customers/${id}/wallet`, { method: 'POST', body }),
    onSuccess: invalidate,
  });

  const loyalty = useMutation({
    mutationFn: (body: { type: 'earned' | 'redeemed'; points: number; note?: string }) =>
      api(`/admin/customers/${id}/loyalty`, { method: 'POST', body }),
    onSuccess: invalidate,
  });

  const role = useMutation({
    mutationFn: (body: { role: 'admin' | 'customer' }) =>
      api(`/admin/customers/${id}`, { method: 'PATCH', body }),
    onSuccess: invalidate,
  });

  return { wallet, loyalty, role };
}

/** Convenience re-export so pages can fire one-off calls without importing api. */
export function request<T>(path: string, options?: RequestOptions): Promise<T> {
  return api<T>(path, options);
}
