'use strict';

const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { walletTx, loyaltyTx } = require('../utils/ledger');

function makeOrderCode(module) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `AUR-${module === 'shop' ? 'SH' : 'FD'}-${stamp}`;
}

function computeTotals(items, deliveryFee = 0, discount = 0) {
  const itemTotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.qty), 0);
  const total = Math.max(0, itemTotal + Number(deliveryFee) - Number(discount));
  return { itemTotal, total };
}

/** Loyalty: 5 points per full ₹100 spent. */
function pointsForOrder(total) {
  return Math.floor(total / 100) * 5;
}

/**
 * POST /api/v1/orders (auth)
 * body: { module, items, deliveryFee, discount, address, payBy?, meta? }
 * - `payBy: 'wallet'` charges the user's wallet (insufficient balance → 400).
 * - Every order earns loyalty points (5 per ₹100) with a ledger entry.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { module, items, deliveryFee, discount, address, payBy = 'cod', meta } = req.body;

  if (!items || items.length === 0) throw ApiError.badRequest('Order must contain at least one item', 'EMPTY_ORDER');
  if (!address || !address.trim()) throw ApiError.badRequest('Delivery address is required', 'ADDRESS_REQUIRED');

  const { itemTotal, total } = computeTotals(items, deliveryFee, discount);
  const orderCode = makeOrderCode(module);
  const user = req.user;
  user.walletTxs = user.walletTxs || [];
  user.loyaltyTxs = user.loyaltyTxs || [];
  let walletPaid = 0;

  // Charge the wallet first when the user picked wallet payment.
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
  if (walletPaid > 0 || loyaltyEarned > 0) await user.save();

  const order = await Order.create({
    id: newId('ord'),
    code: orderCode,
    user: user._id,
    module,
    items,
    itemTotal,
    deliveryFee,
    discount,
    total,
    payBy,
    walletPaid,
    loyaltyEarned,
    etaMinutes: meta && Number.isFinite(Number(meta.etaMinutes)) ? Number(meta.etaMinutes) : 0,
    address: address.trim(),
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

  if (status === 'cancelled' && !['placed', 'confirmed'].includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be cancelled', 'CANT_CANCEL');
  }
  if (status === 'cancelled') {
    order.status = 'cancelled';

    // Wallet-paid orders get the money refunded straight back on cancel.
    if (order.walletPaid > 0) {
      const user = await User.findById(order.user);
      if (user) {
        const before = user.wallet;
        user.wallet = Math.round((before + order.walletPaid) * 100) / 100;
        user.walletTxs.push(
          walletTx('credit', {
            title: `Refund ${order.code}`,
            note: 'Order cancelled',
            amount: order.walletPaid,
            balanceAfter: user.wallet,
          }),
        );
        await user.save();
      }
    }
  } else {
    throw ApiError.forbidden('Only the kitchen can update this status', 'STATUS_READONLY');
  }

  await order.save();
  return ok(res, { order });
});

module.exports = { createOrder, listOrders, getOrder, updateStatus };
