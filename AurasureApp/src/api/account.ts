'use strict';

import { apiGet, apiPost } from './client';
import { isApiEnabled } from './config';
import type { Address, CartItem, Order, UserProfile } from '../types';

interface ServerUser {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  avatar: unknown;
  wallet: number;
  addresses?: Address[];
}

export function mapUser(user: ServerUser): UserProfile {
  return {
    name: user.name,
    email: user.email ?? '',
    phone: user.phone,
    avatar: (user.avatar as UserProfile['avatar']) ?? null,
    wallet: user.wallet ?? 0,
    addresses: user.addresses ?? [],
  };
}

/**
 * Signed-in user (demo session). Returns `null` instead of throwing so home
 * screens can keep rendering with mock fallback data.
 */
export async function fetchMe(): Promise<UserProfile | null> {
  if (!isApiEnabled) return null;
  try {
    const data = await apiGet<{ user: ServerUser }>('/users/me', { auth: true });
    return mapUser(data.user);
  } catch {
    return null;
  }
}

export async function fetchOrders(module: 'food' | 'shop'): Promise<Order[]> {
  const data = await apiGet<{ orders: Order[] }>(`/orders?module=${module}`, { auth: true });
  return data.orders;
}

export async function fetchOrder(orderId: string): Promise<Order | undefined> {
  const data = await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}`, { auth: true });
  return data.order;
}

export interface PlaceOrderInput {
  module: 'food' | 'shop';
  items: CartItem[];
  deliveryFee: number;
  discount: number;
  address: string;
  etaMinutes?: number;
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const data = await apiPost<{ order: Order }>(
    '/orders',
    {
      module: input.module,
      items: input.items.map((i) => ({
        id: i.id,
        refId: i.refId,
        kind: i.kind,
        name: i.name,
        meta: i.meta,
        unitPrice: i.unitPrice,
        qty: i.qty,
        image: i.image,
      })),
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      address: input.address,
      meta: { etaMinutes: input.etaMinutes ?? 0 },
    },
    { auth: true },
  );
  return data.order;
}

export interface NewAddress {
  label: string;
  line: string;
  city: string;
  pin: string;
}

export async function addAddressToServer(address: NewAddress): Promise<Address> {
  const data = await apiPost<{ address: Address }>('/users/me/addresses', address, { auth: true });
  return data.address;
}
