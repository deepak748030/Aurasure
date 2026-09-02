'use strict';

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, ApiError } from './client';
import { isApiEnabled } from './config';
import type {
  Address,
  AdminPartnerApplication,
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
 * Offline order store
 * ------------------------------------------------------------------ *
 * Static `data/mock.ts` orders are the *seed*; every order placed or
 * cancelled while the API is off is written into this mutable store so the
 * Orders tab, order details, cancel flows and the admin console all read
 * one consistent history (exactly like the server does in API mode).
 * ------------------------------------------------------------------ */

/** Plain deep clone (Order holds only JSON-safe values + image refs). */
function cloneOrder(order: Order): Order {
  return JSON.parse(JSON.stringify(order)) as Order;
}

let demoOrders: Order[] | null = null;

/** Seed the demo history once (lazily, from the static mock orders). */
async function ensureDemoOrders(): Promise<Order[]> {
  if (!demoOrders) {
    const { orders } = await import('../data/mock');
    demoOrders = orders.map(cloneOrder);
  }
  return demoOrders;
}

/** Copies of every order in the offline history (customer + admin). */
export async function mockAllOrders(): Promise<Order[]> {
  const list = await ensureDemoOrders();
  return list.map(cloneOrder);
}

/** Advance an offline order's status (admin console fulfilment). */
export async function mockAdvanceOrder(orderId: string, status: Order['status']): Promise<Order> {
  const list = await ensureDemoOrders();
  const order = list.find((o) => o.id === orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.status === 'delivered' || order.status === 'cancelled') {
    throw new ApiError(400, 'ORDER_FINISHED', `Order is already ${order.status}`);
  }
  order.status = status;
  if (status === 'out_for_delivery' && order.module === 'food' && !order.etaMinutes) order.etaMinutes = 15;
  if (status === 'delivered') order.etaMinutes = 0;
  return cloneOrder(order);
}

/** Offline ledger reversal - mirrors server `applyOrderCancellation`. */
export async function mockCancelOrderById(orderId: string): Promise<Order> {
  const list = await ensureDemoOrders();
  const order = list.find((o) => o.id === orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (!(order.status === 'placed' || order.status === 'confirmed')) {
    throw new ApiError(400, 'CANT_CANCEL', 'This order can no longer be cancelled');
  }

  // Wallet refund.
  const walletPaid = order.walletPaid ?? 0;
  if (walletPaid > 0) {
    mockStore.wallet = Math.round((mockStore.wallet + walletPaid) * 100) / 100;
    mockStore.walletTxs.push({
      id: `w_${mid()}`,
      type: 'credit',
      title: `Refund ${order.code}`,
      note: 'Order cancelled',
      amount: walletPaid,
      balanceAfter: mockStore.wallet,
      createdAt: new Date().toISOString(),
    });
  }

  // Loyalty clawback.
  if ((order.loyaltyEarned ?? 0) > 0 && mockStore.points >= (order.loyaltyEarned ?? 0)) {
    mockStore.points -= order.loyaltyEarned ?? 0;
    mockStore.loyaltyTxs.push({
      id: `l_${mid()}`,
      type: 'reversed',
      title: 'Reward reversed',
      note: `Order ${order.code} cancelled`,
      points: order.loyaltyEarned ?? 0,
      balanceAfter: mockStore.points,
      createdAt: new Date().toISOString(),
    });
  }

  // Coupon restore.
  if (order.couponId) {
    mockStore.coupons = mockStore.coupons.map((c) =>
      c.id === order.couponId ? { ...c, usedAt: null } : c,
    );
  }

  order.status = 'cancelled';
  return cloneOrder(order);
}

/** Offline partner applications shown in the admin console. */
let mockPartnerList: AdminPartnerApplication[] | null = null;

/**
 * Rebuilds the offline applicant list on every call so applications submitted
 * from the customer "join as partner" screens appear live, while preserving
 * decisions already made by the admin (approve/reject survive refreshes).
 */
export async function mockPartnerRequests(): Promise<AdminPartnerApplication[]> {
  const daysAgo = (d: number): string => new Date(Date.now() - d * DAY_MS).toISOString();
  const defaults: AdminPartnerApplication[] = [
    { userId: 'usr_rohan', name: 'Rohan Verma', phone: '70000 00001', kind: 'vendor', city: 'Raipur', appliedAt: daysAgo(1), status: 'submitted' },
    { userId: 'usr_imran', name: 'Imran Khan', phone: '70000 00002', kind: 'delivery', city: 'Bhilai', appliedAt: daysAgo(2), status: 'submitted' },
  ];
  const ownSubmissions: AdminPartnerApplication[] = mockStore.partners
    .filter((p) => p.status === 'submitted')
    .map((p) => ({
      userId: 'usr_demo',
      name: p.name,
      phone: '+91 98765 43210',
      kind: p.kind,
      city: p.city,
      appliedAt: p.appliedAt,
      status: 'submitted' as const,
    }));
  const prev = mockPartnerList ?? [];
  const merged = [...defaults, ...ownSubmissions].map((p) => {
    const prior = prev.find((x) => x.userId === p.userId);
    return prior && prior.status !== 'submitted' ? { ...p, status: prior.status } : p;
  });
  mockPartnerList = merged;
  return merged.map((p) => ({ ...p }));
}

/** Approve / reject an offline partner application (admin console). */
export async function mockDecidePartner(userId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const list = mockPartnerList ?? (await mockPartnerRequests());
  const entry = list.find((p) => p.userId === userId);
  if (!entry) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  entry.status = decision;
  if (userId === 'usr_demo') {
    mockStore.partners = mockStore.partners.map((p) => ({ ...p, status: decision }));
  }
}

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
    await mockDelay(700);
    const all = await mockAllOrders();
    return all.filter((o) => o.module === module);
  }
  const data = await apiGet<{ orders: Order[] }>(`/orders?module=${module}`, { auth: true });
  return data.orders;
}

export async function fetchOrder(orderId: string): Promise<Order | undefined> {
  if (!isApiEnabled) {
    await mockDelay(650);
    const all = await mockAllOrders();
    return all.find((o) => o.id === orderId);
  }
  const data = await apiGet<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}`, { auth: true });
  return data.order;
}

/** PATCH /orders/:id/status - cancel a live order (server / offline ledger). */
export async function cancelOrder(orderId: string): Promise<Order> {
  if (!isApiEnabled) {
    await mockDelay(800);
    return mockCancelOrderById(orderId);
  }
  const data = await apiPatch<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}/status`, { status: 'cancelled' }, { auth: true });
  return data.order;
}

export interface PlaceOrderInput {
  module: 'food' | 'shop';
  items: CartItem[];
  deliveryFee: number;
  address: string;
  /** 'wallet' deducts from the Aurasure wallet server-side. */
  payBy?: 'wallet' | 'cod' | 'upi' | 'card';
  /** Consumed atomically with the order (server validates + prices it). */
  couponCode?: string | null;
  etaMinutes?: number;
  /** "If any product is not available" preference picked in the cart. */
  instructions?: string | null;
}

/** Mirror of the server's percentage-coupon cap (FOOD25 style offers). */
function mockCouponDiscount(coupon: Coupon, itemTotal: number): number {
  if (coupon.offType === 'percent') return Math.min(Math.round((itemTotal * coupon.offValue) / 100), 120);
  return Math.min(coupon.offValue, itemTotal);
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
    const itemTotal = Math.round(input.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0) * 100) / 100;

    // Coupon: validate + consume exactly like the server does in API mode.
    let coupon: Coupon | null = null;
    let discount = 0;
    const couponCode = (input.couponCode ?? '').trim().toUpperCase();
    if (couponCode) {
      coupon = mockStore.coupons.find((c) => c.code === couponCode) ?? null;
      if (!coupon) throw new ApiError(400, 'COUPON_INVALID', 'Invalid coupon code');
      if (coupon.usedAt) throw new ApiError(400, 'COUPON_USED', 'This coupon has already been used');
      if (itemTotal < coupon.minOrder) {
        throw new ApiError(400, 'COUPON_MIN_ORDER', `This coupon needs a minimum order of ₹${coupon.minOrder}`);
      }
      discount = mockCouponDiscount(coupon, itemTotal);
    }

    const total = Math.max(0, itemTotal + input.deliveryFee - discount);
    const walletPaid = input.payBy === 'wallet' ? total : 0;
    if (input.payBy === 'wallet') {
      if (mockStore.wallet < total) {
        throw new ApiError(400, 'WALLET_INSUFFICIENT', `Insufficient wallet balance - add ₹${Math.ceil(total - mockStore.wallet)} or choose another method`);
      }
      mockStore.wallet = Math.round((mockStore.wallet - total) * 100) / 100;
      mockStore.walletTxs.push({
        id: `w_${mid()}`,
        type: 'debit',
        title: `Order ${code}`,
        note: input.module === 'food' ? 'Food delivery' : 'Shop order',
        amount: total,
        balanceAfter: mockStore.wallet,
        createdAt: new Date().toISOString(),
      });
    }

    const loyaltyEarned = Math.floor(total / 100) * 5;
    if (loyaltyEarned > 0) {
      mockStore.points += loyaltyEarned;
      mockStore.loyaltyTxs.push({
        id: `l_${mid()}`,
        type: 'earned',
        title: 'Order reward',
        note: `₹${Math.round(total)} spent → points`,
        points: loyaltyEarned,
        balanceAfter: mockStore.points,
        createdAt: new Date().toISOString(),
      });
    }
    if (coupon) {
      mockStore.coupons = mockStore.coupons.map((c) =>
        c.id === coupon!.id ? { ...c, usedAt: new Date().toISOString() } : c,
      );
    }

    const order: Order = {
      id: `o_${stamp}`,
      code,
      module: input.module,
      placedAt: new Date().toISOString(),
      status: 'placed',
      items: input.items,
      itemTotal,
      deliveryFee: input.deliveryFee,
      discount,
      total,
      etaMinutes: input.etaMinutes ?? 0,
      address: input.address,
      payBy: input.payBy ?? 'cod',
      walletPaid,
      loyaltyEarned,
      couponId: coupon ? coupon.id : null,
      couponCode: coupon ? coupon.code : null,
      instructions: input.instructions?.trim() ? input.instructions.trim() : undefined,
    };
    (await ensureDemoOrders()).unshift(order);
    return { order, wallet: mockStore.wallet, loyaltyPoints: mockStore.points };
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
      address: input.address,
      payBy: input.payBy ?? 'cod',
      couponCode: input.couponCode || undefined,
      etaMinutes: input.etaMinutes ?? 0,
      instructions: input.instructions?.trim() || undefined,
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
