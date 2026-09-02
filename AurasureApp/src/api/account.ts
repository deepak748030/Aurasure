'use strict';

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
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

/* ------------------------------------------------------------------ *
 * Demo-mode ledger
 * ------------------------------------------------------------------ *
 * When no `EXPO_PUBLIC_API_URL` is configured the whole app runs on mock
 * data. This tiny in-memory store keeps wallet / loyalty / referral / coupons
 * consistent across screens while the API is off, so every flow behaves the
 * same as it will against the real server (and shows the same loading
 * states). With the API on, all of these functions talk to the server and
 * this store is never touched.
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (d: number): string => new Date(Date.now() - d * DAY_MS).toISOString();
const daysAhead = (d: number): string => new Date(Date.now() + d * DAY_MS).toISOString();

const mockStore: {
  wallet: number;
  walletTxs: WalletData['transactions'];
  points: number;
  loyaltyTxs: LoyaltyData['activity'];
  coupons: Coupon[];
  referralCode: string;
  referralEarned: number;
  referralFriends: number;
  referredBy: string | null;
  partners: PartnerApplication[];
} = {
  wallet: 480,
  walletTxs: [
    { id: 'w1', type: 'credit' as const, title: 'Money added', note: 'Instant top-up · UPI', amount: 250, balanceAfter: 250, createdAt: daysAgo(2) },
    { id: 'w2', type: 'credit' as const, title: 'Referral bonus', note: 'Friend joined with your code', amount: 300, balanceAfter: 550, createdAt: daysAgo(12) },
    { id: 'w3', type: 'debit' as const, title: 'Order AUR-FD-88K2', note: 'Food delivery', amount: 120, balanceAfter: 430, createdAt: daysAgo(4) },
    { id: 'w4', type: 'credit' as const, title: 'Cashback', note: 'Coupon AURA50', amount: 50, balanceAfter: 480, createdAt: daysAgo(1) },
  ],
  points: 1240,
  loyaltyTxs: [
    { id: 'l1', type: 'earned' as const, title: 'Order reward', note: '₹580 spent → points', points: 290, balanceAfter: 290, createdAt: daysAgo(1) },
    { id: 'l2', type: 'earned' as const, title: 'Order reward', note: '₹780 spent → points', points: 390, balanceAfter: 680, createdAt: daysAgo(3) },
    { id: 'l3', type: 'earned' as const, title: 'Referral bonus', note: 'Friend joined', points: 250, balanceAfter: 930, createdAt: daysAgo(12) },
    { id: 'l4', type: 'earned' as const, title: 'Order reward', note: '₹620 spent → points', points: 310, balanceAfter: 1240, createdAt: daysAgo(15) },
  ],
  coupons: [
    { id: 'c1', code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat' as const, offValue: 50, expiresAt: daysAhead(25), usedAt: null },
    { id: 'c2', code: 'FOOD25', title: '25% off on food delivery', subtitle: 'Up to ₹120', minOrder: 349, offType: 'percent' as const, offValue: 25, expiresAt: daysAhead(18), usedAt: null },
    { id: 'c3', code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat' as const, offValue: 0, expiresAt: daysAhead(30), usedAt: null },
  ],
  referralCode: 'AAR3210',
  referralEarned: 300,
  referralFriends: 2,
  referredBy: null as string | null,
  partners: [] as PartnerApplication[],
};

let mockSeq = 100;
const mid = (): string => `${Date.now().toString(36)}${(mockSeq += 1).toString(36)}`;

/** Simulated network latency so skeletons/spinners are visible in demo mode. */
const mockDelay = (ms = 650): Promise<void> => new Promise((r) => setTimeout(r, ms));

const sortNew = <T extends { createdAt: string }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

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

const DEMO_PROFILE = (): ServerUser => ({
  id: 'usr_demo',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+91 98765 43210',
  avatar: null,
  wallet: mockStore.wallet,
  addresses: [
    { id: 'a1', label: 'Home', line: '402, Aurora Heights, Civil Lines', city: 'Raipur', pin: '492001', isDefault: true },
    { id: 'a2', label: 'Work', line: 'Tech Park, 5th Floor, GE Road', city: 'Raipur', pin: '492001', isDefault: false },
  ],
});

/**
 * Signed-in user (demo session). Returns `null` instead of throwing so home
 * screens can keep rendering with mock fallback data.
 */
export async function fetchMe(): Promise<UserProfile | null> {
  if (!isApiEnabled) {
    await mockDelay(700);
    return mapUser(DEMO_PROFILE());
  }
  try {
    const data = await apiGet<{ user: ServerUser }>('/users/me', { auth: true });
    return mapUser(data.user);
  } catch {
    return null;
  }
}

/** PUT /users/me - updates name / email on the live profile. */
export async function updateProfile(patch: { name?: string; email?: string }): Promise<UserProfile> {
  if (!isApiEnabled) {
    await mockDelay(700);
    return mapUser(DEMO_PROFILE());
  }
  const data = await apiPut<{ user: ServerUser }>('/users/me', patch, { auth: true });
  return mapUser(data.user);
}

export async function fetchOrders(module: 'food' | 'shop'): Promise<Order[]> {
  if (!isApiEnabled) {
    const { orders } = await import('../data/mock');
    await mockDelay(700);
    return orders.filter((o) => o.module === module);
  }
  const data = await apiGet<{ orders: Order[] }>(`/orders?module=${module}`, { auth: true });
  return data.orders;
}

export async function fetchOrder(orderId: string): Promise<Order | undefined> {
  if (!isApiEnabled) {
    const { orders } = await import('../data/mock');
    await mockDelay(650);
    return orders.find((o) => o.id === orderId);
  }
  const data = await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}`, { auth: true });
  return data.order;
}

/** PATCH /orders/:id/status - cancel a live order (server). */
export async function cancelOrder(orderId: string): Promise<Order> {
  if (!isApiEnabled) {
    await mockDelay(800);
    const { orders } = await import('../data/mock');
    const found = orders.find((o) => o.id === orderId);
    if (!found) throw new Error('Order not found');
    return { ...found, status: 'cancelled' };
  }
  const data = await apiPatch<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}/status`, { status: 'cancelled' }, { auth: true });
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
  if (!isApiEnabled) {
    await mockDelay(900);
    const stamp = Date.now().toString(36).toUpperCase().slice(-5);
    const code = `AUR-${input.module === 'shop' ? 'SH' : 'FD'}-${stamp}`;
    const itemTotal = input.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const total = Math.max(0, itemTotal + input.deliveryFee - input.discount);
    const wallet = input.payBy === 'wallet' ? mockStore.wallet - total : mockStore.wallet;
    mockStore.wallet = wallet;
    return {
      order: {
        id: `o_${stamp}`,
        code,
        module: input.module,
        placedAt: new Date().toISOString(),
        status: 'placed',
        items: input.items,
        itemTotal,
        deliveryFee: input.deliveryFee,
        discount: input.discount,
        total,
        etaMinutes: input.etaMinutes ?? 0,
        address: input.address,
        payBy: input.payBy ?? 'cod',
        walletPaid: input.payBy === 'wallet' ? total : 0,
        loyaltyEarned: Math.floor(total / 100) * 5,
      },
      wallet,
      loyaltyPoints: mockStore.points,
    };
  }
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
  if (!isApiEnabled) {
    await mockDelay(650);
    const saved: Address = { id: `local-${Date.now()}`, ...address, isDefault: false };
    return saved;
  }
  const data = await apiPost<{ address: Address }>('/users/me/addresses', address, { auth: true });
  return data.address;
}

export async function deleteAddressFromServer(addressId: string): Promise<void> {
  if (!isApiEnabled) {
    await mockDelay(550);
    return;
  }
  await apiDelete(`/users/me/addresses/${encodeURIComponent(addressId)}`, { auth: true });
}

/** GET /users/me/favorites - { module, refId }[] (server wishlist). */
export interface ServerFavorite {
  module: 'food' | 'shop';
  refId: string;
}

export async function fetchFavorites(): Promise<ServerFavorite[]> {
  if (!isApiEnabled) return [];
  try {
    const data = await apiGet<{ favorites: ServerFavorite[] }>('/users/me/favorites', { auth: true });
    return data.favorites ?? [];
  } catch {
    return [];
  }
}

/** PUT /users/me/favorites - liked:true adds, false removes (server wishlist). */
export async function syncFavorite(module: 'food' | 'shop', refId: string, liked: boolean): Promise<void> {
  if (!isApiEnabled) return;
  try {
    await apiPut('/users/me/favorites', { module, refId, liked }, { auth: true });
  } catch {
    // Wishlist sync is best-effort - the local state already updated.
  }
}

/* ---------------------------- Rewards ---------------------------- */

export async function fetchWallet(): Promise<WalletData | null> {
  if (!isApiEnabled) {
    await mockDelay(600);
    return { balance: mockStore.wallet, transactions: sortNew(mockStore.walletTxs) };
  }
  try {
    return await apiGet<WalletData>('/users/me/wallet', { auth: true });
  } catch {
    return null;
  }
}

/** Credits the wallet via the server (mock-safe: resolves locally when API is off). */
export async function addWalletMoney(amount: number): Promise<WalletData> {
  if (!isApiEnabled) {
    await mockDelay(750);
    const before = mockStore.wallet;
    mockStore.wallet = before + amount;
    mockStore.walletTxs.push({
      id: `w_${mid()}`,
      type: 'credit',
      title: 'Money added',
      note: 'Instant top-up · UPI',
      amount,
      balanceAfter: mockStore.wallet,
      createdAt: new Date().toISOString(),
    });
    return { balance: mockStore.wallet, transactions: sortNew(mockStore.walletTxs) };
  }
  const data = await apiPost<WalletData>('/users/me/wallet/add', { amount }, { auth: true });
  return data;
}

export async function fetchLoyalty(): Promise<LoyaltyData | null> {
  if (!isApiEnabled) {
    await mockDelay(600);
    return { points: mockStore.points, tier: mockStore.points >= 1000 ? 'Silver' : 'Bronze', activity: sortNew(mockStore.loyaltyTxs) };
  }
  try {
    return await apiGet<LoyaltyData>('/users/me/loyalty', { auth: true });
  } catch {
    return null;
  }
}

/** Redeems points for wallet money (100 pts = ₹10) on the server. */
export async function redeemLoyalty(points: number): Promise<{ points: number; balance: number; redeemed: number }> {
  if (!isApiEnabled) {
    await mockDelay(750);
    const rupees = points / 10;
    mockStore.points -= points;
    mockStore.wallet += rupees;
    mockStore.loyaltyTxs.push({
      id: `l_${mid()}`,
      type: 'redeemed',
      title: 'Redeemed to wallet',
      note: `Converted to ₹${rupees}`,
      points,
      balanceAfter: mockStore.points,
      createdAt: new Date().toISOString(),
    });
    mockStore.walletTxs.push({
      id: `w_${mid()}`,
      type: 'credit',
      title: 'Points redeemed',
      note: `${points} loyalty points → wallet`,
      amount: rupees,
      balanceAfter: mockStore.wallet,
      createdAt: new Date().toISOString(),
    });
    return { points: mockStore.points, balance: mockStore.wallet, redeemed: rupees };
  }
  return apiPost<{ points: number; balance: number; redeemed: number }>('/users/me/loyalty/redeem', { points }, { auth: true });
}

export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!isApiEnabled) {
    await mockDelay(550);
    return mockStore.coupons;
  }
  try {
    const data = await apiGet<{ coupons: Coupon[] }>('/users/me/coupons', { auth: true });
    return data.coupons;
  } catch {
    return null;
  }
}

/** POST /users/me/coupons/:id/apply - marks a coupon used (server). */
export async function markCouponUsed(couponId: string): Promise<void> {
  if (!isApiEnabled) {
    await mockDelay(400);
    mockStore.coupons = mockStore.coupons.map((c) => (c.id === couponId ? { ...c, usedAt: new Date().toISOString() } : c));
    return;
  }
  await apiPost(`/users/me/coupons/${encodeURIComponent(couponId)}/apply`, {}, { auth: true });
}

export async function fetchReferral(): Promise<ReferralInfo | null> {
  if (!isApiEnabled) {
    await mockDelay(550);
    return {
      code: mockStore.referralCode,
      earnings: mockStore.referralEarned,
      friends: mockStore.referralFriends,
      referredBy: mockStore.referredBy,
    };
  }
  try {
    return await apiGet<ReferralInfo>('/users/me/referral', { auth: true });
  } catch {
    return null;
  }
}

/** Applies a friend's referral code (mock-safe fallback when the API is off). */
export async function applyReferral(code: string): Promise<{ wallet: number; points: number; reward: number }> {
  if (!isApiEnabled) {
    await mockDelay(800);
    if (mockStore.referredBy) throw new Error('Referral already applied once');
    if (String(code).trim().toUpperCase() === mockStore.referralCode) throw new Error('You cannot use your own code');
    mockStore.referredBy = String(code).trim().toUpperCase();
    mockStore.wallet += 50;
    mockStore.points += 250;
    return { wallet: mockStore.wallet, points: mockStore.points, reward: 50 };
  }
  return apiPost<{ wallet: number; points: number; reward: number }>('/users/me/referral/apply', { code }, { auth: true });
}

/** Submits a delivery-partner / vendor application. */
export async function submitPartnerApplication(
  kind: 'delivery' | 'vendor',
  body: { name: string; city: string },
): Promise<PartnerApplication> {
  if (!isApiEnabled) {
    await mockDelay(800);
    const app: PartnerApplication = {
      kind,
      name: body.name,
      city: body.city,
      appliedAt: new Date().toISOString(),
      status: 'submitted',
    };
    mockStore.partners = mockStore.partners.filter((p) => p.kind !== kind).concat(app);
    return app;
  }
  const data = await apiPost<{ application: PartnerApplication }>('/users/me/partner-application', { kind, ...body }, { auth: true });
  return data.application;
}
