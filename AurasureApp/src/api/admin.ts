'use strict';

/**
 * Admin console API.
 *
 * API mode   → talks to /api/v1/admin/* with an *admin* bearer token (the
 *              regular demo session is a customer and cannot access these).
 * Mock mode   → mirrors the server against the shared offline demo store so
 *              the console is fully usable without a backend, and every
 *              status change the admin makes shows up in the customer's
 *              Orders tab too (same in-memory history).
 */
import { apiPost, apiRequest, ApiError, type RequestOptions } from './client';
import { ADMIN_PASSWORD, ADMIN_PHONE, isApiEnabled } from './config';
import {
  mockAdvanceOrder,
  mockAllOrders,
  mockCancelOrderById,
  mockDecidePartner,
  mockPartnerRequests,
} from './account';
import type {
  AdminOrder,
  AdminPartnerApplication,
  AdminStats,
  OrderStatus,
} from '../types';

const mockDelay = (ms = 650): Promise<void> => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Admin session (separate from the customer demo session)
 * ------------------------------------------------------------------ */

let adminToken: string | null = null;
let pending: Promise<string | null> | null = null;

async function acquireAdminToken(): Promise<string | null> {
  try {
    const data = await apiPost<{ token: string }>(
      '/auth/login',
      { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    );
    adminToken = data.token;
    return adminToken;
  } catch {
    return null;
  }
}

async function getAdminToken(): Promise<string | null> {
  if (adminToken) return adminToken;
  if (!pending) pending = acquireAdminToken().finally(() => { pending = null; });
  return pending;
}

/** Admin-authenticated request; throws a readable error when sign-in fails. */
async function adminRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAdminToken();
  if (!token) {
    throw new ApiError(
      401,
      'ADMIN_LOGIN_FAILED',
      'Admin sign-in failed - run "npm run seed" on the server so the admin account exists.',
    );
  }
  return apiRequest<T>(path, { ...options, auth: false, token });
}

/* ------------------------------------------------------------------ *
 * Server endpoints
 * ------------------------------------------------------------------ */

export async function fetchAdminStats(): Promise<AdminStats> {
  const data = await adminRequest<AdminStats>('/admin/stats');
  return data;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const data = await adminRequest<{ orders: AdminOrder[] }>('/admin/orders?limit=100');
  return data.orders;
}

export async function adminSetOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrder> {
  const data = await adminRequest<{ order: AdminOrder }>(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return data.order;
}

export async function fetchAdminPartners(): Promise<AdminPartnerApplication[]> {
  const data = await adminRequest<{ applications: AdminPartnerApplication[] }>('/admin/partners');
  return data.applications;
}

export async function adminDecidePartner(userId: string, decision: 'approved' | 'rejected'): Promise<void> {
  await adminRequest(`/admin/partners/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { status: decision },
  });
}

/* ------------------------------------------------------------------ *
 * Mock fallback (API off) - powered by the shared offline demo store.
 * ------------------------------------------------------------------ */

async function mockStats(): Promise<AdminStats> {
  await mockDelay(650);
  const { foodItems, restaurants } = await import('../data/food');
  const { shopProducts, shopStores } = await import('../data/shop');
  const orders = await mockAllOrders();
  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const liveOrders = orders.filter((o) => ['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
  const partners = await mockPartnerRequests();
  return {
    users: 128,
    restaurants: restaurants.length,
    foodItems: foodItems.length,
    shops: shopStores.length,
    products: shopProducts.length,
    orders: orders.length,
    revenue,
    liveOrders,
    cancelledOrders,
    walletCollected: orders.reduce((sum, o) => sum + (o.walletPaid ?? 0), 0),
    pendingPartners: partners.filter((p) => p.status === 'submitted').length,
  };
}

export async function adminApiFetch<T>(kind: 'stats' | 'orders' | 'partners'): Promise<T> {
  if (!isApiEnabled) {
    if (kind === 'stats') return (await mockStats()) as T;
    if (kind === 'orders') {
      await mockDelay(700);
      const orders = await mockAllOrders();
      // Attach the demo customer identity so rows read like server ones.
      return orders.map((o) => ({ ...o, user: { name: 'Aarav Sharma', phone: '+91 98765 43210' } })) as T;
    }
    await mockDelay(650);
    return (await mockPartnerRequests()) as T;
  }
  if (kind === 'stats') return (await fetchAdminStats()) as T;
  if (kind === 'orders') return (await fetchAdminOrders()) as T;
  return (await fetchAdminPartners()) as T;
}

/** Mock-safe order status update (shared offline history with the customer). */
export async function adminApiSetOrderStatus(orderId: string, status: OrderStatus): Promise<AdminOrder> {
  if (!isApiEnabled) {
    await mockDelay(750);
    const updated =
      status === 'cancelled'
        ? await mockCancelOrderById(orderId)
        : await mockAdvanceOrder(orderId, status);
    return { ...updated, user: { name: 'Aarav Sharma', phone: '+91 98765 43210' } };
  }
  return adminSetOrderStatus(orderId, status);
}

/** Mock-safe partner decision. */
export async function adminApiDecidePartner(userId: string, decision: 'approved' | 'rejected'): Promise<void> {
  if (!isApiEnabled) {
    await mockDelay(700);
    return mockDecidePartner(userId, decision);
  }
  return adminDecidePartner(userId, decision);
}
