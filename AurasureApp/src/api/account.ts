'use strict';

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import { isApiEnabled } from './config';
import type {
  Address,
  CartItem,
  Coupon,
  LoyaltyData,
  Order,
  PartnerApplication,
  ReferralInfo,
  UserProfile,
  WalletData,
} from '../types';

interface ServerUser {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  avatar: unknown;
  wallet: number;
  loyaltyPoints?: number;
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

/** PUT /users/me - updates name / email on the live profile. */
export async function updateProfile(patch: { name?: string; email?: string }): Promise<UserProfile> {
  const data = await apiPut<{ user: ServerUser }>('/users/me', patch, { auth: true });
  return mapUser(data.user);
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
  /** 'wallet' deducts from the Aurasure wallet server-side. */
  payBy?: 'wallet' | 'cod' | 'upi' | 'card';
  etaMinutes?: number;
}

export interface PlaceOrderResult {
  order: Order;
  wallet?: number;
  loyaltyPoints?: number;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const data = await apiPost<PlaceOrderResult>(
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
      payBy: input.payBy ?? 'cod',
      meta: { etaMinutes: input.etaMinutes ?? 0 },
    },
    { auth: true },
  );
  return data;
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

export async function deleteAddressFromServer(addressId: string): Promise<void> {
  await apiDelete(`/users/me/addresses/${encodeURIComponent(addressId)}`, { auth: true });
}

/* ---------------------------- Rewards ---------------------------- */

export async function fetchWallet(): Promise<WalletData | null> {
  if (!isApiEnabled) return null;
  try {
    return await apiGet<WalletData>('/users/me/wallet', { auth: true });
  } catch {
    return null;
  }
}

/** Credits the wallet via the server (mock-safe: resolves locally when API is off). */
export async function addWalletMoney(amount: number): Promise<WalletData> {
  if (!isApiEnabled) {
    return { balance: amount, transactions: [] };
  }
  const data = await apiPost<WalletData>('/users/me/wallet/add', { amount }, { auth: true });
  return data;
}

export async function fetchLoyalty(): Promise<LoyaltyData | null> {
  if (!isApiEnabled) return null;
  try {
    return await apiGet<LoyaltyData>('/users/me/loyalty', { auth: true });
  } catch {
    return null;
  }
}

/** Redeems points for wallet money (100 pts = ₹10) on the server. */
export async function redeemLoyalty(points: number): Promise<{ points: number; balance: number; redeemed: number }> {
  return apiPost<{ points: number; balance: number; redeemed: number }>('/users/me/loyalty/redeem', { points }, { auth: true });
}

export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!isApiEnabled) return null;
  try {
    const data = await apiGet<{ coupons: Coupon[] }>('/users/me/coupons', { auth: true });
    return data.coupons;
  } catch {
    return null;
  }
}

export async function fetchReferral(): Promise<ReferralInfo | null> {
  if (!isApiEnabled) return null;
  try {
    return await apiGet<ReferralInfo>('/users/me/referral', { auth: true });
  } catch {
    return null;
  }
}

/** Applies a friend's referral code (mock-safe fallback when the API is off). */
export async function applyReferral(code: string): Promise<{ wallet: number; points: number; reward: number }> {
  if (!isApiEnabled) {
    return { wallet: 50, points: 250, reward: 50 };
  }
  return apiPost<{ wallet: number; points: number; reward: number }>('/users/me/referral/apply', { code }, { auth: true });
}

/** Submits a delivery-partner / vendor application. */
export async function submitPartnerApplication(
  kind: 'delivery' | 'vendor',
  body: { name: string; city: string },
): Promise<PartnerApplication> {
  const data = await apiPost<{ application: PartnerApplication }>('/users/me/partner-application', { kind, ...body }, { auth: true });
  return data.application;
}
