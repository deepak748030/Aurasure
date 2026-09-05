'use strict';

const { newId } = require('./id');

/** Random digits for referral uniqueness fallback. */
function rand(n) {
  let out = '';
  for (let i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

/**
 * Deterministic-ish referral code from a user's identity: `AAA` + last 4
 * digits of the phone (e.g. AAR3210). Falls back to a unique random suffix
 * on the rare collision.
 */
function referralCodeFor(name, phone) {
  const letters = (name || 'AUR').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'AUR';
  const digits = String(phone || '').replace(/\D/g, '').slice(-4);
  const tail = digits.length === 4 ? digits : rand(4);
  return `${letters}${tail}`;
}

/** Wallet ledger entry factory (money in/out). */
function walletTx(type, { title, note = '', amount, balanceAfter }) {
  return { id: newId('wtx'), type, title, note, amount: Math.round(amount), balanceAfter: Math.round(balanceAfter), createdAt: new Date() };
}

/** Loyalty ledger entry factory (points earned/redeemed). */
function loyaltyTx(type, { title, note = '', points, balanceAfter }) {
  return { id: newId('ltx'), type, title, note, points: Math.round(points), balanceAfter: Math.round(balanceAfter), createdAt: new Date() };
}

/** Starter coupons handed to every new user. */
function starterCoupons() {
  const now = Date.now();
  const inDays = (d) => new Date(now + d * 24 * 60 * 60 * 1000);
  return [
    { id: newId('cpn'), code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat', offValue: 50, expiresAt: inDays(30) },
    { id: newId('cpn'), code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat', offValue: 0, expiresAt: inDays(30) },
  ];
}

/**
 * Loyalty math. Constants are the compiled-in fallback; callers pass the live
 * `AppSetting.loyalty` section so Admin → App configuration stays in charge.
 * Default rule: 100 points = ₹10 (10 points per rupee), redeem in hundreds.
 */
const POINTS_PER_RUPEE = 10; // 100 pts → ₹10
const MIN_REDEEM_POINTS = 100;

function pointsToRupees(points, redeemPoints = MIN_REDEEM_POINTS, redeemValue = MIN_REDEEM_POINTS / POINTS_PER_RUPEE) {
  const step = Math.max(1, Number(redeemPoints) || MIN_REDEEM_POINTS);
  const value = Number(redeemValue);
  const perStep = Number.isFinite(value) && value > 0 ? value : MIN_REDEEM_POINTS / POINTS_PER_RUPEE;
  return Math.floor((Number(points) || 0) / step) * perStep;
}

const DEFAULT_TIERS = [
  { name: 'Bronze', min: 0, color: '#C2703D' },
  { name: 'Silver', min: 1000, color: '#94A3B8' },
  { name: 'Gold', min: 2500, color: '#E5A710' },
  { name: 'Platinum', min: 5000, color: '#64748B' },
];

function loyaltyTier(points, tiers = DEFAULT_TIERS) {
  const rows = (Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_TIERS)
    .map((row) => ({ name: String(row.name), min: Number(row.min) || 0, color: String(row.color || '#C2703D') }))
    .sort((a, b) => a.min - b.min);
  const total = Number(points) || 0;
  let current = rows[0];
  let next = null;
  for (let i = 0; i < rows.length; i += 1) {
    if (total >= rows[i].min) {
      current = rows[i];
      next = rows[i + 1] || null;
    }
  }
  const progress = next ? Math.min(1, Math.max(0, (total - current.min) / Math.max(1, next.min - current.min))) : 1;
  return { name: current.name, color: current.color, progress, nextTier: next ? next.name : current.name, nextAt: next ? next.min : null };
}

module.exports = {
  rand,
  referralCodeFor,
  walletTx,
  loyaltyTx,
  starterCoupons,
  POINTS_PER_RUPEE,
  MIN_REDEEM_POINTS,
  pointsToRupees,
  loyaltyTier,
};
