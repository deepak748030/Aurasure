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

/** Convert loyalty points to wallet rupees (100 points = ₹10). */
const POINTS_PER_RUPEE = 10; // 100 pts → ₹10
const MIN_REDEEM_POINTS = 100;

function pointsToRupees(points) {
  return Math.floor(points / MIN_REDEEM_POINTS) * (MIN_REDEEM_POINTS / POINTS_PER_RUPEE);
}

function loyaltyTier(points) {
  if (points >= 5000) return { name: 'Platinum', color: '#64748B', progress: 1 };
  if (points >= 2500) return { name: 'Gold', color: '#E5A710', progress: (points - 2500) / 2500 };
  if (points >= 1000) return { name: 'Silver', color: '#94A3B8', progress: (points - 1000) / 1500 };
  return { name: 'Bronze', color: '#C2703D', progress: points / 1000 };
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
