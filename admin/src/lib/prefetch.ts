'use client';

/**
 * Route → data prefetching for the admin panel.
 *
 * Hovering a sidebar link (or a row link) warms the React Query cache with
 * the exact query the target page fires on first paint, so by the time the
 * user clicks, the data is already there and the navigation feels instant.
 *
 * Every `queryFn` below mirrors the corresponding hook in `./queries.ts`
 * (same key + same return shape) so the prefetched entry is reused verbatim
 * instead of triggering a second request.
 */

import type { QueryClient } from '@tanstack/react-query';
import { api, apiRaw } from './api';
import type {
  AuditEntry,
  CustomerDetail,
  CustomerRow,
  DeliveryTaskRow,
  Order,
  PartnerApplication,
  ReportOverview,
  Rider,
  Stats,
  SystemInfo,
  Vendor,
} from './types';

type Query = Record<string, string | number | boolean | null | undefined>;

/** Catalogue resource routes → useResourceList(path, responseKey, query). */
const RESOURCES: Record<string, { path: string; key: string }> = {
  '/food/restaurants': { path: 'food/restaurants', key: 'restaurants' },
  '/food/items': { path: 'food/items', key: 'items' },
  '/food/categories': { path: 'food/categories', key: 'categories' },
  '/food/collections': { path: 'food/vibes', key: 'vibes' },
  '/shop/stores': { path: 'shop/stores', key: 'stores' },
  '/shop/products': { path: 'shop/products', key: 'products' },
  '/shop/categories': { path: 'shop/categories', key: 'categories' },
};

function prefetchStats(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: ['stats'],
    queryFn: () => api<Stats>('/admin/stats'),
  });
}

function prefetchReport(qc: QueryClient, days: number) {
  void qc.prefetchQuery({
    queryKey: ['report', days],
    queryFn: () => api<ReportOverview>('/admin/reports/overview', { query: { days } }),
  });
}

function prefetchOrders(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['orders', query],
    queryFn: async () => {
      const res = await apiRaw<{ orders: Order[] }>('/admin/orders', { query });
      return { orders: res.data.orders, meta: res.meta };
    },
  });
}

function prefetchVendors(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['vendors', query],
    queryFn: async () => {
      const res = await apiRaw<{ vendors: Vendor[]; pending: number }>('/admin/vendors', { query });
      return { vendors: res.data.vendors, pending: res.data.pending, meta: res.meta };
    },
  });
}

function prefetchRiders(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['riders', query],
    queryFn: async () => {
      const res = await apiRaw<{ riders: Rider[]; pending: number }>('/admin/riders', { query });
      return { riders: res.data.riders, pending: res.data.pending, meta: res.meta };
    },
  });
}

function prefetchDeliveryTasks(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['delivery-tasks', query],
    queryFn: async () => {
      const res = await apiRaw<{ tasks: DeliveryTaskRow[] }>('/admin/delivery/tasks', { query });
      return { tasks: res.data.tasks ?? [], meta: res.meta };
    },
  });
}

function prefetchPartners(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: ['partners'],
    queryFn: () => api<{ applications: PartnerApplication[] }>('/admin/partners'),
  });
}

function prefetchCustomers(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['customers', query],
    queryFn: async () => {
      const res = await apiRaw<{ customers: CustomerRow[] }>('/admin/customers', { query });
      return { customers: res.data.customers, meta: res.meta };
    },
  });
}

function prefetchAudit(qc: QueryClient, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['audit', query],
    queryFn: async () => {
      const res = await apiRaw<{ entries: AuditEntry[] }>('/admin/audit', { query });
      return { entries: res.data.entries ?? [], meta: res.meta };
    },
  });
}

function prefetchSystem(qc: QueryClient) {
  void qc.prefetchQuery({
    queryKey: ['system'],
    queryFn: () => api<SystemInfo>('/admin/system'),
  });
}

function prefetchResource(qc: QueryClient, path: string, key: string, query: Query) {
  void qc.prefetchQuery({
    queryKey: ['resource', path, query],
    queryFn: async () => {
      const res = await apiRaw<Record<string, unknown[]>>(`/admin/${path}`, { query });
      return { rows: (res.data[key] ?? []) as unknown[], meta: res.meta };
    },
  });
}

/** Prefetches the customer detail the profile page will request. */
export function prefetchCustomer(qc: QueryClient, id: string) {
  if (!id) return;
  void qc.prefetchQuery({
    queryKey: ['customer', id],
    queryFn: () =>
      api<{
        customer: CustomerDetail;
        stats: { orders: number; spent: number; cancelled: number };
        orders: Order[];
      }>(`/admin/customers/${id}`),
  });
}

/**
 * Warms the cache for the given sidebar href. Safe to call on hover/focus —
 * it's a no-op when the data is already cached or the route is unknown.
 */
export function prefetchRoute(qc: QueryClient, href: string): void {
  const [pathname, search] = href.split('?');
  const params = new URLSearchParams(search ?? '');
  const module = params.get('module');

  switch (pathname) {
    case '/dashboard':
      prefetchStats(qc);
      prefetchReport(qc, 14);
      prefetchOrders(qc, { limit: 8, page: 1 });
      break;
    case '/live-ops':
      prefetchStats(qc);
      prefetchOrders(qc, { limit: 100, page: 1 });
      break;
    case '/orders':
      prefetchOrders(qc, module ? { page: 1, limit: 20, module } : { page: 1, limit: 20 });
      break;
    case '/delivery':
      prefetchDeliveryTasks(qc, { limit: 100 });
      break;
    case '/customers':
      prefetchCustomers(qc, { page: 1, limit: 20 });
      break;
    case '/vendors':
      prefetchVendors(qc, {});
      break;
    case '/riders':
      prefetchRiders(qc, {});
      break;
    case '/partners':
      prefetchPartners(qc);
      break;
    case '/reports':
      prefetchReport(qc, 14);
      break;
    case '/activity':
      prefetchAudit(qc, { page: 1, limit: 100 });
      break;
    case '/settings':
      prefetchStats(qc);
      prefetchSystem(qc);
      break;
    default: {
      const resource = RESOURCES[pathname];
      if (resource) prefetchResource(qc, resource.path, resource.key, { page: 1, limit: 20 });
    }
  }
}
