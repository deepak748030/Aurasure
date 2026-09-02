'use strict';

/**
 * Coupon pricing helpers shared by the order + rewards controllers so the
 * server is the single source of truth for discounts (never the client).
 */
const ApiError = require('./ApiError');

// Cap for percentage coupons (matches the app's FOOD25 "up to ₹120").
const PERCENT_CAP = 120;

/** Money value a coupon removes from an order (0 for free-delivery coupons). */
function discountForCoupon(coupon, itemTotal) {
  if (!coupon) return 0;
  const base = Number(itemTotal) || 0;
  if (coupon.offType === 'percent') {
    return Math.min(Math.round((base * coupon.offValue) / 100), PERCENT_CAP);
  }
  return Math.min(Number(coupon.offValue) || 0, base);
}

/**
 * Resolves + validates a coupon code owned by a user for an order total.
 * Returns the coupon doc, or throws a friendly ApiError when unusable.
 */
function findUsableCoupon(user, code, itemTotal) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  const coupon = (user.coupons || []).find((c) => String(c.code).toUpperCase() === normalized);
  if (!coupon) throw ApiError.badRequest('Invalid coupon code', 'COUPON_INVALID');
  if (coupon.usedAt) throw ApiError.badRequest('This coupon has already been used', 'COUPON_USED');
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw ApiError.badRequest('This coupon has expired', 'COUPON_EXPIRED');
  }
  if (itemTotal < coupon.minOrder) {
    throw ApiError.badRequest(
      `This coupon needs a minimum order of ₹${coupon.minOrder}`,
      'COUPON_MIN_ORDER',
    );
  }
  return coupon;
}

module.exports = { PERCENT_CAP, discountForCoupon, findUsableCoupon };
