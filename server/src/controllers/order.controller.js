'use strict';

const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');

function makeOrderCode(module) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `AUR-${module === 'shop' ? 'SH' : 'FD'}-${stamp}`;
}

function computeTotals(items, deliveryFee = 0, discount = 0) {
  const itemTotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.qty), 0);
  const total = Math.max(0, itemTotal + Number(deliveryFee) - Number(discount));
  return { itemTotal, total };
}

/** POST /api/v1/orders (auth) */
const createOrder = asyncHandler(async (req, res) => {
  const { module, items, deliveryFee, discount, address, meta } = req.body;

  if (!items || items.length === 0) throw ApiError.badRequest('Order must contain at least one item', 'EMPTY_ORDER');
  if (!address || !address.trim()) throw ApiError.badRequest('Delivery address is required', 'ADDRESS_REQUIRED');

  const { itemTotal, total } = computeTotals(items, deliveryFee, discount);

  const order = await Order.create({
    id: newId('ord'),
    code: makeOrderCode(module),
    user: req.user._id,
    module,
    items,
    itemTotal,
    deliveryFee,
    discount,
    total,
    etaMinutes: meta && Number.isFinite(Number(meta.etaMinutes)) ? Number(meta.etaMinutes) : 0,
    address: address.trim(),
  });

  return created(res, { order });
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
  } else {
    throw ApiError.forbidden('Only the kitchen can update this status', 'STATUS_READONLY');
  }

  await order.save();
  return ok(res, { order });
});

module.exports = { createOrder, listOrders, getOrder, updateStatus };
