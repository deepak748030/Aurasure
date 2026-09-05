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
const { getAppSettings } = require('../utils/settings');

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
  const settings = await getAppSettings();
  const min = settings.wallet.minTopup;
  const max = settings.wallet.maxTopup;
  const amount = Math.round(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    throw ApiError.badRequest(`Amount must be between ₹${min.toLocaleString('en-IN')} and ₹${max.toLocaleString('en-IN')}`, 'INVALID_AMOUNT');
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

/** GET /api/v1/users/me/loyalty -> { points, tier, tierDetail, rules, activity } */
const getLoyalty = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const user = req.user;
  const settings = await getAppSettings();
  const rules = {
    earnPer100: settings.loyalty.earnPer100,
    redeemPoints: settings.loyalty.redeemPoints,
    redeemValue: settings.loyalty.redeemValue,
    tiers: settings.loyalty.tiers,
  };
  const tier = loyaltyTier(user.loyaltyPoints, rules.tiers);
  return ok(res, {
    points: user.loyaltyPoints,
    tier: tier.name,
    tierDetail: tier,
    rules,
    nextTierAt: tier.nextAt,
    activity: [...user.loyaltyTxs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

/**
 * POST /api/v1/users/me/loyalty/redeem { points }
 * Redeems points in steps of 100 (100 pts = ₹10) straight into the wallet.
 */
const redeemLoyalty = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const settings = await getAppSettings();
  const step = settings.loyalty.redeemPoints;
  const points = Math.round(Number(req.body.points));
  if (!Number.isFinite(points) || points < step || points % step !== 0) {
    throw ApiError.badRequest(`Redeem in multiples of ${step} points`, 'INVALID_POINTS');
  }
  if (req.user.loyaltyPoints < points) {
    throw ApiError.badRequest('Not enough loyalty points', 'INSUFFICIENT_POINTS');
  }

  const rupees = pointsToRupees(points, settings.loyalty.redeemPoints, settings.loyalty.redeemValue);
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

/** GET /api/v1/users/me/referral -> { code, earnings, friends, reward, terms } */
const getReferral = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const user = req.user;
  if (!user.referralCode) {
    user.referralCode = referralCodeFor(user.name, user.phone);
    await user.save();
  }
  const settings = await getAppSettings();
  const earnings = user.walletTxs.filter((t) => t.title === 'Referral bonus').reduce((sum, t) => sum + t.amount, 0);
  const friends = user.walletTxs.filter((t) => t.title === 'Referral bonus').length;
  return ok(res, {
    code: user.referralCode,
    earnings,
    friends,
    referredBy: user.referredBy || null,
    reward: {
      wallet: settings.referral.walletReward,
      points: settings.referral.pointsReward,
      referrerWallet: settings.referral.referrerWallet ?? settings.referral.walletReward * 2,
    },
    terms: settings.referral.terms || [],
  });
});

/**
 * POST /api/v1/users/me/referral/apply { code }
 * Friend applies the referrer's code once. Both sides are credited from the
 * live referral settings (Admin → App configuration).
 */
const applyReferral = asyncHandler(async (req, res) => {
  ensureLedger(req.user);
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Referral code is required', 'CODE_REQUIRED');
  if (req.user.referralCode === code) throw ApiError.badRequest('You cannot use your own code', 'SELF_REFERRAL');
  if (req.user.referredBy) throw ApiError.badRequest('Referral already applied once', 'ALREADY_REFERRED');

  const owner = await User.findOne({ referralCode: code });
  if (!owner) throw ApiError.notFound('Invalid referral code', 'INVALID_CODE');

  const settings = await getAppSettings();
  const friendWallet = settings.referral.walletReward;
  const friendPoints = settings.referral.pointsReward;
  const referrerWallet = settings.referral.referrerWallet ?? friendWallet * 2;

  // Referrer reward.
  const ownerBefore = owner.wallet;
  owner.wallet = ownerBefore + referrerWallet;
  owner.walletTxs.push(
    walletTx('credit', {
      title: 'Referral bonus',
      note: `${req.user.name} joined with your code`,
      amount: referrerWallet,
      balanceAfter: owner.wallet,
    }),
  );
  owner.loyaltyPoints += friendPoints;
  owner.loyaltyTxs.push(
    loyaltyTx('earned', { title: 'Referral bonus', note: `Friend ${req.user.phone} joined`, points: friendPoints, balanceAfter: owner.loyaltyPoints }),
  );
  await owner.save();

  // Friend reward.
  req.user.referredBy = code;
  const friendBefore = req.user.wallet;
  req.user.wallet = friendBefore + friendWallet;
  req.user.walletTxs.push(
    walletTx('credit', {
      title: 'Referral bonus',
      note: `Welcome gift with code ${code}`,
      amount: friendWallet,
      balanceAfter: req.user.wallet,
    }),
  );
  req.user.loyaltyPoints += friendPoints;
  req.user.loyaltyTxs.push(
    loyaltyTx('earned', { title: 'Welcome bonus', note: `Referred by ${owner.name}`, points: friendPoints, balanceAfter: req.user.loyaltyPoints }),
  );
  await req.user.save();

  return ok(res, { wallet: req.user.wallet, points: req.user.loyaltyPoints, reward: friendWallet });
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
  getReferral,
  applyReferral,
  applyWelcomePerks,
};
