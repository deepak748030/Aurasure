/**
 * Rewards surface: wallet, loyalty, coupons, referral and promo self-claim.
 * Mirrors `server/src/controllers/rewards.controller.js` + `promo.controller.js`.
 */

import { apiGet, apiPost } from './client';
import type { LedgerTx, LoyaltyTx, ModuleKey, UserCoupon } from '@/types';

export interface WalletState {
  balance: number;
  transactions: LedgerTx[];
}

export interface LoyaltyState {
  points: number;
  tier: string;
  activity: LoyaltyTx[];
}

/** 100 points → ₹10, redeem only in multiples of 100 (server rule). */
export const MIN_REDEEM_POINTS = 100;
export const POINTS_PER_RUPEE = 10;

export function fetchWallet(): Promise<WalletState> {
  return apiGet<WalletState>('/users/me/wallet', { auth: true });
}

export function topUpWallet(amount: number): Promise<WalletState & { transaction: LedgerTx }> {
  return apiPost<WalletState & { transaction: LedgerTx }>('/users/me/wallet/add', { amount }, { auth: true });
}

export function fetchLoyalty(): Promise<LoyaltyState> {
  return apiGet<LoyaltyState>('/users/me/loyalty', { auth: true });
}

export function redeemLoyalty(points: number): Promise<{ points: number; balance: number; redeemed: number }> {
  return apiPost<{ points: number; balance: number; redeemed: number }>(
    '/users/me/loyalty/redeem',
    { points },
    { auth: true },
  );
}

export function fetchCoupons(): Promise<UserCoupon[]> {
  return apiGet<{ coupons: UserCoupon[] }>('/users/me/coupons', { auth: true }).then((r) => r.coupons ?? []);
}

/** Types a campaign code in-app and gets a copy in the wallet. */
export function claimPromo(code: string): Promise<{ coupon: UserCoupon; coupons: UserCoupon[] }> {
  return apiPost<{ coupon: UserCoupon; coupons: UserCoupon[] }>('/users/me/coupons/claim', { code }, { auth: true });
}

export interface ReferralState {
  code: string;
  earnings: number;
  friends: number;
  referredBy: string | null;
}

export function fetchReferral(): Promise<ReferralState> {
  return apiGet<ReferralState>('/users/me/referral', { auth: true });
}

export function applyReferral(code: string): Promise<{ wallet: number; points: number; reward: number }> {
  return apiPost<{ wallet: number; points: number; reward: number }>(
    '/users/me/referral/apply',
    { code },
    { auth: true },
  );
}

/* ----------------------------- coupon maths ----------------------------- */

/** Mirrors `server/src/utils/coupons.js` so the summary matches the invoice. */
export const PERCENT_CAP = 120;

export function couponDiscount(coupon: UserCoupon | null | undefined, itemTotal: number): number {
  if (!coupon) return 0;
  if (coupon.offType === 'percent') {
    return Math.min(Math.round((itemTotal * coupon.offValue) / 100), PERCENT_CAP);
  }
  return Math.min(Number(coupon.offValue) || 0, itemTotal);
}

export function isCouponUsable(coupon: UserCoupon, itemTotal: number): { ok: boolean; reason?: string } {
  if (coupon.usedAt) return { ok: false, reason: 'This coupon has already been used' };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'This coupon has expired' };
  }
  if (itemTotal < coupon.minOrder) {
    return { ok: false, reason: `Add ₹${coupon.minOrder - itemTotal} more to use this coupon` };
  }
  return { ok: true };
}

export function couponLabel(coupon: UserCoupon): string {
  return coupon.offType === 'percent' ? `${coupon.offValue}% OFF` : `₹${Math.round(coupon.offValue)} OFF`;
}

export type CouponFilter = 'all' | 'available' | 'used' | 'expired';

export function partitionCoupons(coupons: UserCoupon[]): { available: UserCoupon[]; used: UserCoupon[]; expired: UserCoupon[] } {
  const now = Date.now();
  const available: UserCoupon[] = [];
  const used: UserCoupon[] = [];
  const expired: UserCoupon[] = [];
  sortCoupons(coupons).forEach((coupon) => {
    if (coupon.usedAt) used.push(coupon);
    else if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) expired.push(coupon);
    else available.push(coupon);
  });
  return { available, used, expired };
}

export function sortCoupons(coupons: UserCoupon[]): UserCoupon[] {
  return [...coupons].sort((a, b) => {
    if (Boolean(a.usedAt) !== Boolean(b.usedAt)) return a.usedAt ? 1 : -1;
    return new Date(a.expiresAt ?? 0).getTime() - new Date(b.expiresAt ?? 0).getTime();
  });
}
