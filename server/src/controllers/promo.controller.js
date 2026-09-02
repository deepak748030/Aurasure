'use strict';

/**
 * Promo codes - admin campaign management + customer self-claim.
 *
 * The catalogue lives in the `Promo` collection; a code only becomes spendable
 * once a copy is written into a user's `coupons[]` array, which is exactly what
 * checkout already validates (`utils/coupons.js`). That keeps the order flow
 * completely unchanged.
 */

const Promo = require('../models/Promo');
const User = require('../models/User');

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { newId } = require('../utils/id');

/** Human-readable reason a promo cannot be handed out right now, or null. */
function unusableReason(promo) {
  if (!promo.active) return 'This promo code is not active';
  const now = new Date();
  if (promo.startsAt && new Date(promo.startsAt) > now) return 'This promo code has not started yet';
  if (promo.expiresAt && new Date(promo.expiresAt) < now) return 'This promo code has expired';
  if (promo.usageLimit > 0 && promo.issuedCount >= promo.usageLimit) return 'This promo code is fully claimed';
  return null;
}

/** Builds the per-user coupon copy stored on `user.coupons`. */
function couponFrom(promo) {
  return {
    id: newId('cpn'),
    code: promo.code,
    title: promo.title,
    subtitle: promo.subtitle || (promo.minOrder > 0 ? `On orders above ₹${promo.minOrder}` : ''),
    minOrder: promo.minOrder || 0,
    offType: promo.offType,
    offValue: promo.offValue || 0,
    expiresAt: promo.expiresAt || null,
    usedAt: null,
  };
}

/** Copies a user already holds of this code (used to enforce `perUserLimit`). */
function copiesHeld(user, code) {
  return (user.coupons || []).filter((c) => String(c.code).toUpperCase() === code).length;
}

/**
 * POST /api/v1/admin/promos/:id/issue
 * body: { target?: 'all' | 'selected', userIds?: string[], includeAdmins?: boolean }
 *
 * Drops a copy of the code into the selected customers' wallets. Customers who
 * already hold their allowance are skipped, so the action is safe to re-run.
 */
const issuePromo = asyncHandler(async (req, res) => {
  const promo = await Promo.findOne({ id: req.params.id });
  if (!promo) throw ApiError.notFound('Promo code not found', 'NOT_FOUND');

  const reason = unusableReason(promo);
  if (reason) throw ApiError.badRequest(reason, 'PROMO_UNAVAILABLE');

  const target = req.body.target === 'selected' ? 'selected' : 'all';
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.filter(Boolean).map(String) : [];
  if (target === 'selected' && userIds.length === 0) {
    throw ApiError.badRequest('Pick at least one customer', 'NO_CUSTOMERS');
  }

  const query = target === 'selected' ? { id: { $in: userIds } } : {};
  if (!req.body.includeAdmins) query.role = 'customer';

  const users = await User.find(query).select('id name coupons');
  if (users.length === 0) throw ApiError.notFound('No matching customers', 'NO_CUSTOMERS');

  let remaining = promo.usageLimit > 0 ? Math.max(promo.usageLimit - promo.issuedCount, 0) : Infinity;
  let issued = 0;
  let skipped = 0;

  for (const user of users) {
    if (remaining <= 0) {
      skipped += 1;
      continue;
    }
    if (copiesHeld(user, promo.code) >= promo.perUserLimit) {
      skipped += 1;
      continue;
    }
    user.coupons.push(couponFrom(promo));
    await user.save();
    issued += 1;
    remaining -= 1;
  }

  if (issued > 0) {
    promo.issuedCount += issued;
    await promo.save();
  }

  return ok(res, {
    promo: promo.toJSON(),
    issued,
    skipped,
    message: `Issued to ${issued} customer${issued === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}`,
  });
});

/**
 * GET /api/v1/admin/promos/:id/stats
 * How many customers hold the code, how many already spent it.
 */
const promoStats = asyncHandler(async (req, res) => {
  const promo = await Promo.findOne({ id: req.params.id });
  if (!promo) throw ApiError.notFound('Promo code not found', 'NOT_FOUND');

  const [holders, redeemed] = await Promise.all([
    User.countDocuments({ 'coupons.code': promo.code }),
    User.countDocuments({ coupons: { $elemMatch: { code: promo.code, usedAt: { $ne: null } } } }),
  ]);

  return ok(res, {
    promo: promo.toJSON(),
    stats: {
      holders,
      redeemed,
      unused: Math.max(holders - redeemed, 0),
      status: unusableReason(promo) ? 'unavailable' : 'live',
    },
  });
});

/**
 * POST /api/v1/users/me/coupons/claim  body: { code }
 * Customer-facing: types a code in the app and gets the coupon in their wallet.
 */
const claimPromo = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Enter a promo code', 'CODE_REQUIRED');

  const promo = await Promo.findOne({ code });
  if (!promo || !promo.selfClaim) throw ApiError.badRequest('Invalid promo code', 'PROMO_INVALID');

  const reason = unusableReason(promo);
  if (reason) throw ApiError.badRequest(reason, 'PROMO_UNAVAILABLE');

  const user = req.user;
  user.coupons = user.coupons || [];
  if (copiesHeld(user, promo.code) >= promo.perUserLimit) {
    throw ApiError.conflict('You have already claimed this code', 'PROMO_ALREADY_CLAIMED');
  }

  const coupon = couponFrom(promo);
  user.coupons.push(coupon);
  await user.save();

  promo.issuedCount += 1;
  await promo.save();

  return ok(res, { coupon, coupons: user.coupons });
});

module.exports = { issuePromo, promoStats, claimPromo, unusableReason };
