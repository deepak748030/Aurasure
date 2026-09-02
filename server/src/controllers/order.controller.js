'use strict';

const Order = require('../models/Order');
const User = require('../models/User');
const FoodItem = require('../models/FoodItem');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { walletTx, loyaltyTx } = require('../utils/ledger');
const { discountForCoupon, findUsableCoupon } = require('../utils/coupons');

function makeOrderCode(module) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `AUR-${module === 'shop' ? 'SH' : 'FD'}-${stamp}`;
}

function computeTotals(itemTotal, deliveryFee = 0, discount = 0) {
  const total = Math.max(0, itemTotal + Number(deliveryFee) - Number(discount));
  return { itemTotal, total };
}

/** Loyalty: 5 points per full ₹100 spent. */
function pointsForOrder(total) {
  return Math.floor(total / 100) * 5;
}

/**
 * Reprice order lines from the live catalogue so a client can never set its
 * own unit prices. Prices, names and availability always come from the DB.
 */
async function verifyAndRepriceItems(items) {
  const foodRefs = items.filter((i) => i.kind === 'food').map((i) => i.refId);
  const shopRefs = items.filter((i) => i.kind === 'shop').map((i) => i.refId);

  const [foodDocs, productDocs] = await Promise.all([
    foodRefs.length ? FoodItem.find({ id: { $in: foodRefs } }).lean() : [],
    shopRefs.length ? Product.find({ id: { $in: shopRefs } }).lean() : [],
  ]);
  const foodById = new Map(foodDocs.map((d) => [d.id, d]));
  const productById = new Map(productDocs.map((d) => [d.id, d]));

  return items.map((line) => {
    const source = line.kind === 'food' ? foodById.get(line.refId) : productById.get(line.refId);
    if (!source) {
      throw ApiError.badRequest(
        `"${line.name || line.refId}" is no longer available - remove it from your cart`,
        'ITEM_UNAVAILABLE',
      );
    }
    return {
      id: line.id,
      refId: line.refId,
      kind: line.kind,
      name: source.name,
      meta: line.meta || undefined,
      unitPrice: source.price,
      qty: line.qty,
      image: line.image || null,
    };
  });
}

/**
 * Shared cancellation bookkeeping: refunds the wallet, reverses the loyalty
 * points the order earned and restores the coupon it consumed. Used by both
 * the customer cancel route and the admin console.
 * Saves the user; the caller is responsible for saving the order itself.
 */
async function applyOrderCancellation(order) {
  const user = await User.findById(order.user);
  if (!user) throw ApiError.notFound('Order owner not found', 'USER_NOT_FOUND');

  // Wallet refund.
  if (order.walletPaid > 0) {
    const before = user.wallet;
    user.wallet = Math.round((before + order.walletPaid) * 100) / 100;
    user.walletTxs = user.walletTxs || [];
    user.walletTxs.push(
      walletTx('credit', {
        title: `Refund ${order.code}`,
        note: 'Order cancelled',
        amount: order.walletPaid,
        balanceAfter: user.wallet,
      }),
    );
  }

  // Loyalty clawback - points earned by this order are taken back.
  if (order.loyaltyEarned > 0 && (user.loyaltyPoints || 0) >= order.loyaltyEarned) {
    user.loyaltyPoints -= order.loyaltyEarned;
    user.loyaltyTxs = user.loyaltyTxs || [];
    user.loyaltyTxs.push(
      loyaltyTx('reversed', {
        title: 'Reward reversed',
        note: `Order ${order.code} cancelled`,
        points: order.loyaltyEarned,
        balanceAfter: user.loyaltyPoints,
      }),
    );
  }

  // Coupon restore - the code becomes usable again.
  if (order.couponId) {
    const coupon = (user.coupons || []).find((c) => c.id === order.couponId);
    if (coupon && coupon.usedAt) coupon.usedAt = null;
  }

  await user.save();
  return user;
}

/**
 * POST /api/v1/orders (auth)
 * body: { module, items, deliveryFee, address, payBy?, couponCode?, etaMinutes? }
 * - Prices are recomputed from the catalogue (client prices are ignored).
 * - `payBy: 'wallet'` charges the user's wallet (insufficient balance → 400).
 * - An optional `couponCode` is validated + consumed atomically with the order.
 * - Every order earns loyalty points (5 per ₹100) with a ledger entry.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { module, items, deliveryFee = 0, address, payBy = 'cod', couponCode, etaMinutes, instructions } = req.body;

  if (!items || items.length === 0) throw ApiError.badRequest('Order must contain at least one item', 'EMPTY_ORDER');
  if (!address || !address.trim()) throw ApiError.badRequest('Delivery address is required', 'ADDRESS_REQUIRED');

  const pricedItems = await verifyAndRepriceItems(items);
  const { itemTotal } = computeTotals(
    pricedItems.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.qty), 0),
    0,
    0,
  );

  const user = req.user;
  user.walletTxs = user.walletTxs || [];
  user.loyaltyTxs = user.loyaltyTxs || [];

  // Coupon is resolved + consumed server-side; the client discount is ignored.
  const coupon = findUsableCoupon(user, couponCode, itemTotal);
  const discount = discountForCoupon(coupon, itemTotal);
  const { total } = computeTotals(itemTotal, deliveryFee, discount);

  const orderCode = makeOrderCode(module);
  let walletPaid = 0;

  if (payBy === 'wallet') {
    if (user.wallet < total) {
      throw ApiError.badRequest(
        `Insufficient wallet balance - add ₹${Math.ceil(total - user.wallet)} or choose another method`,
        'WALLET_INSUFFICIENT',
      );
    }
    walletPaid = total;
    const before = user.wallet;
    user.wallet = Math.round((before - total) * 100) / 100;
    user.walletTxs.push(
      walletTx('debit', { title: `Order ${orderCode}`, note: module === 'food' ? 'Food delivery' : 'Shop order', amount: total, balanceAfter: user.wallet }),
    );
  }

  const loyaltyEarned = pointsForOrder(total);
  if (loyaltyEarned > 0) {
    const before = user.loyaltyPoints || 0;
    user.loyaltyPoints = before + loyaltyEarned;
    user.loyaltyTxs.push(
      loyaltyTx('earned', { title: 'Order reward', note: `₹${Math.round(total)} spent → points`, points: loyaltyEarned, balanceAfter: user.loyaltyPoints }),
    );
  }
  if (coupon) coupon.usedAt = new Date();
  if (walletPaid > 0 || loyaltyEarned > 0 || coupon) await user.save();

  const order = await Order.create({
    id: newId('ord'),
    code: orderCode,
    user: user._id,
    module,
    items: pricedItems,
    itemTotal,
    deliveryFee,
    discount,
    total,
    payBy,
    walletPaid,
    loyaltyEarned,
    couponId: coupon ? coupon.id : null,
    couponCode: coupon ? coupon.code : null,
    etaMinutes: Number.isFinite(Number(etaMinutes)) ? Number(etaMinutes) : 0,
    address: address.trim(),
    instructions: instructions && String(instructions).trim() ? String(instructions).trim().slice(0, 200) : '',
  });

  return created(res, { order, wallet: user.wallet, loyaltyPoints: user.loyaltyPoints });
});

/** GET /api/v1/orders?module=food|shop&status=&page=&limit= (auth) */
const listOrders = asyncHandler(async (req, res) => {
  const { module, status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const query = { user: req.user._id };
  if (module === 'food' || module === 'shop') query.module = module;
  if (status) query.status = status;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ placedAt: -1 }).skip(skip).limit(limit);
  return ok(res, { orders }, listMeta(total, page, limit));
});

/** GET /api/v1/orders/:id (auth) */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  return ok(res, { order });
});

/** PATCH /api/v1/orders/:id/status (auth) - lets a user cancel a live order */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOne({ id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');

  if (status !== 'cancelled') {
    throw ApiError.forbidden('Only the kitchen can update this status', 'STATUS_READONLY');
  }
  if (!['placed', 'confirmed'].includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be cancelled', 'CANT_CANCEL');
  }

  order.status = 'cancelled';
  await applyOrderCancellation(order);
  await order.save();
  return ok(res, { order });
});

module.exports = { createOrder, listOrders, getOrder, updateStatus, applyOrderCancellation, pointsForOrder };
