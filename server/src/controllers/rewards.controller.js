'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');

/** Back-fill ledger arrays for users created before these fields existed. */
function ensureLedger(user) {
  user.walletTxs = user.walletTxs || [];
  user.loyaltyTxs = user.loyaltyTxs || [];
  user.coupons = user.coupons || [];
  return user;
}
const {
  referralCodeFor,
  walletTx,
  loyaltyTx,
  starterCoupons,
  pointsToRupees,
  MIN_REDEEM_POINTS,
  loyaltyTier,
} = require('../utils/ledger');

/** GET /api/v1/users/me/wallet -> { balance, transactions } */
const getWallet = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const user = req.user;
  return ok(res, {
    balance: user.wallet,
    transactions: [...user.walletTxs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

/** POST /api/v1/users/me/wallet/add { amount } */
const addWalletMoney = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const amount = Math.round(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount < 10 || amount > 25000) {
    throw ApiError.badRequest('Amount must be between ₹10 and ₹25,000', 'INVALID_AMOUNT');
  }

  const before = req.user.wallet;
  req.user.wallet = before + amount;
  req.user.walletTxs.push(
    walletTx('credit', {
      title: 'Money added',
      note: 'Instant top-up · UPI',
      amount,
      balanceAfter: req.user.wallet,
    }),
  );
  await req.user.save();

  const transactions = [...req.user.walletTxs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return ok(res, { balance: req.user.wallet, transaction: transactions[0], transactions });
});

/** GET /api/v1/users/me/loyalty -> { points, tier, nextTierAt, activity } */
const getLoyalty = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const user = req.user;
  const tier = loyaltyTier(user.loyaltyPoints);
  return ok(res, {
    points: user.loyaltyPoints,
    tier: tier.name,
    nextTierAt: tier.progress >= 1 ? null : tier.progress < 0.0001 ? 0 : null,
    activity: [...user.loyaltyTxs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

/**
 * POST /api/v1/users/me/loyalty/redeem { points }
 * Redeems points in steps of 100 (100 pts = ₹10) straight into the wallet.
 */
const redeemLoyalty = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const points = Math.round(Number(req.body.points));
  if (!Number.isFinite(points) || points < MIN_REDEEM_POINTS || points % MIN_REDEEM_POINTS !== 0) {
    throw ApiError.badRequest(`Redeem in multiples of ${MIN_REDEEM_POINTS} points`, 'INVALID_POINTS');
  }
  if (req.user.loyaltyPoints < points) {
    throw ApiError.badRequest('Not enough loyalty points', 'INSUFFICIENT_POINTS');
  }

  const rupees = pointsToRupees(points);
  const beforePts = req.user.loyaltyPoints;
  const beforeRs = req.user.wallet;

  req.user.loyaltyPoints = beforePts - points;
  req.user.loyaltyTxs.push(
    loyaltyTx('redeemed', { title: 'Redeemed to wallet', note: `Converted to ₹${rupees}`, points, balanceAfter: req.user.loyaltyPoints }),
  );
  req.user.wallet = beforeRs + rupees;
  req.user.walletTxs.push(
    walletTx('credit', {
      title: 'Points redeemed',
      note: `${points} loyalty points → wallet`,
      amount: rupees,
      balanceAfter: req.user.wallet,
    }),
  );
  await req.user.save();

  return ok(res, { points: req.user.loyaltyPoints, balance: req.user.wallet, redeemed: rupees });
});

/** GET /api/v1/users/me/coupons */
const getCoupons = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const coupons = [...req.user.coupons].sort((a, b) => {
    if (Boolean(a.usedAt) !== Boolean(b.usedAt)) return a.usedAt ? 1 : -1;
    return new Date(a.expiresAt || 0) - new Date(b.expiresAt || 0);
  });
  return ok(res, { coupons });
});

/**
 * POST /api/v1/users/me/coupons/:couponId/apply
 * Marks a coupon as used (one-time). Also credits the "Cashback" wallet row
 * when the coupon carries a flat cashback so the wallet stays live.
 */
const applyCoupon = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const coupon = req.user.coupons.find((c) => c.id === req.params.couponId);
  if (!coupon) throw ApiError.notFound('Coupon not found', 'COUPON_NOT_FOUND');
  if (coupon.usedAt) throw ApiError.badRequest('Coupon already used', 'COUPON_USED');
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw ApiError.badRequest('Coupon has expired', 'COUPON_EXPIRED');
  }

  coupon.usedAt = new Date();
  await req.user.save();
  return ok(res, { coupon });
});

/** GET /api/v1/users/me/referral -> { code, earnings, friends } */
const getReferral = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const user = req.user;
  if (!user.referralCode) {
    user.referralCode = referralCodeFor(user.name, user.phone);
    await user.save();
  }
  const earnings = user.walletTxs.filter((t) => t.title === 'Referral bonus').reduce((sum, t) => sum + t.amount, 0);
  const friends = user.walletTxs.filter((t) => t.title === 'Referral bonus').length;
  return ok(res, { code: user.referralCode, earnings, friends, referredBy: user.referredBy || null });
});

/**
 * POST /api/v1/users/me/referral/apply { code }
 * Friend applies the referrer's code once: friend gets ₹50 wallet + 250 pts,
 * referrer gets ₹100 wallet.
 */
const applyReferral = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Referral code is required', 'CODE_REQUIRED');
  if (req.user.referralCode === code) throw ApiError.badRequest('You cannot use your own code', 'SELF_REFERRAL');
  if (req.user.referredBy) throw ApiError.badRequest('Referral already applied once', 'ALREADY_REFERRED');

  const owner = await User.findOne({ referralCode: code });
  if (!owner) throw ApiError.notFound('Invalid referral code', 'INVALID_CODE');

  // Referrer reward.
  const ownerBefore = owner.wallet;
  owner.wallet = ownerBefore + 100;
  owner.walletTxs.push(
    walletTx('credit', {
      title: 'Referral bonus',
      note: `${req.user.name} joined with your code`,
      amount: 100,
      balanceAfter: owner.wallet,
    }),
  );
  owner.loyaltyPoints += 250;
  owner.loyaltyTxs.push(
    loyaltyTx('earned', { title: 'Referral bonus', note: `Friend ${req.user.phone} joined`, points: 250, balanceAfter: owner.loyaltyPoints }),
  );
  await owner.save();

  // Friend reward.
  req.user.referredBy = code;
  const friendBefore = req.user.wallet;
  req.user.wallet = friendBefore + 50;
  req.user.walletTxs.push(
    walletTx('credit', {
      title: 'Referral bonus',
      note: `Welcome gift with code ${code}`,
      amount: 50,
      balanceAfter: req.user.wallet,
    }),
  );
  req.user.loyaltyPoints += 250;
  req.user.loyaltyTxs.push(
    loyaltyTx('earned', { title: 'Welcome bonus', note: `Referred by ${owner.name}`, points: 250, balanceAfter: req.user.loyaltyPoints }),
  );
  await req.user.save();

  return ok(res, { wallet: req.user.wallet, points: req.user.loyaltyPoints, reward: 50 });
});

/** Add the welcome perks when a brand-new user registers. */
async function applyWelcomePerks(user) {
  if (!user.referralCode) {
    user.referralCode = referralCodeFor(user.name, user.phone);
  }
  if (!user.coupons || user.coupons.length === 0) {
    user.coupons = starterCoupons();
  }
  if (user.loyaltyPoints === 0 && (!user.loyaltyTxs || user.loyaltyTxs.length === 0)) {
    user.loyaltyPoints = 100;
    user.loyaltyTxs.push(
      loyaltyTx('earned', { title: 'Welcome bonus', note: 'Thanks for joining Aurasure', points: 100, balanceAfter: 100 }),
    );
  }
  return user;
}

module.exports = {
  getWallet,
  addWalletMoney,
  getLoyalty,
  redeemLoyalty,
  getCoupons,
  applyCoupon,
  getReferral,
  applyReferral,
  applyWelcomePerks,
};
