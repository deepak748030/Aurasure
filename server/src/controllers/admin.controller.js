'use strict';

/**
 * Admin console endpoints - order fulfilment (advance/cancel) and review of
 * delivery-partner / vendor applications. All routes sit behind
 * `authenticate() + requireRole('admin')` (see routes/admin.routes.js).
 */

const Order = require('../models/Order');
const User = require('../models/User');
const FoodCategory = require('../models/FoodCategory');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const ShopCategory = require('../models/ShopCategory');
const ShopStore = require('../models/ShopStore');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { applyOrderCancellation } = require('./order.controller');

const LIVE_STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery'];
const TERMINAL_STATUSES = ['delivered', 'cancelled'];

// Forward-only fulfilment order: an order moves placed → confirmed →
// preparing → out_for_delivery → delivered and can never jump backwards.
const STATUS_RANK = { placed: 0, confirmed: 1, preparing: 2, out_for_delivery: 3, delivered: 4 };

function publicOrder(order) {
  const json = order.toJSON ? order.toJSON() : { ...order };
  delete json._id;
  delete json.__v;
  return json;
}

/** GET /api/v1/admin/stats - headline numbers for the console overview. */
const getStats = asyncHandler(async (req, res) => {
  const [users, restaurants, foodItems, shops, products, totalOrders, foodCategories, shopCategories, banners] = await Promise.all([
    User.countDocuments(),
    Restaurant.countDocuments(),
    FoodItem.countDocuments(),
    ShopStore.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    FoodCategory.countDocuments(),
    ShopCategory.countDocuments(),
    Banner.countDocuments(),
  ]);

  const [money] = await Order.aggregate([
    {
      $group: {
        _id: null,
        revenue: {
          $sum: {
            $cond: [{ $in: ['$status', ['cancelled']] }, 0, '$total'],
          },
        },
        liveOrders: {
          $sum: { $cond: [{ $in: ['$status', LIVE_STATUSES] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        walletCollected: { $sum: '$walletPaid' },
      },
    },
  ]);

  const pendingPartners = await User.countDocuments({ 'partnerApplication.status': 'submitted' });
  const partnerTally = await User.aggregate([
    { $match: { 'partnerApplication': { $ne: null } } },
    { $group: { _id: '$partnerApplication.kind', count: { $sum: 1 } } },
  ]);
  const byKind = {};
  for (const row of partnerTally) byKind[row._id || 'other'] = row.count;

  return ok(res, {
    users,
    restaurants,
    foodItems,
    foodCategories,
    shops,
    products,
    shopCategories,
    banners,
    orders: totalOrders,
    revenue: money ? money.revenue : 0,
    liveOrders: money ? money.liveOrders : 0,
    cancelledOrders: money ? money.cancelledOrders : 0,
    walletCollected: money ? money.walletCollected : 0,
    pendingPartners,
    partnerKinds: byKind,
  });
});

/** GET /api/v1/admin/orders?module=&status=&page=&limit= - every order. */
const listOrders = asyncHandler(async (req, res) => {
  const { module, status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 100 });

  const query = {};
  if (module === 'food' || module === 'shop') query.module = module;
  if (status) query.status = status;

  const total = await Order.countDocuments(query);
  const docs = await Order.find(query)
    .sort({ placedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name phone');

  const orders = docs.map((doc) => {
    const order = publicOrder(doc);
    order.user = doc.user
      ? { name: doc.user.name, phone: doc.user.phone }
      : null;
    return order;
  });

  return ok(res, { orders }, listMeta(total, page, limit));
});

/**
 * PATCH /api/v1/admin/orders/:id/status { status }
 * Admin fulfilment: advance placed → confirmed → preparing → out_for_delivery
 * → delivered, or cancel live orders (full wallet refund + loyalty/coupon
 * reversal via the same path the customer cancel uses).
 */
const setOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOne({ id: req.params.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');

  if (TERMINAL_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(`Order is already ${order.status} - no further changes`, 'ORDER_FINISHED');
  }
  if (status === order.status) return ok(res, { order: publicOrder(order) });

  if (status === 'cancelled') {
    if (!['placed', 'confirmed'].includes(order.status)) {
      throw ApiError.badRequest('This order can no longer be cancelled', 'CANT_CANCEL');
    }
    order.status = 'cancelled';
    const user = await applyOrderCancellation(order);
    await order.save();
    const out = publicOrder(order);
    out.user = { name: user.name, phone: user.phone };
    out.wallet = user.wallet;
    out.loyaltyPoints = user.loyaltyPoints;
    return ok(res, { order: out });
  }

  if (!Object.prototype.hasOwnProperty.call(STATUS_RANK, status)) {
    throw ApiError.badRequest('Invalid status for this action', 'INVALID_STATUS');
  }
  if (STATUS_RANK[status] <= STATUS_RANK[order.status]) {
    throw ApiError.badRequest(
      `Orders can only move forward - it is already ${order.status}`,
      'STATUS_REGRESSION',
    );
  }
  order.status = status;
  if (status === 'out_for_delivery' && order.module === 'food' && !order.etaMinutes) {
    order.etaMinutes = 15;
  }
  if (status === 'delivered') order.etaMinutes = 0;
  await order.save();
  return ok(res, { order: publicOrder(order) });
});

/** GET /api/v1/admin/partners - every submitted partner/vendor application. */
const listPartners = asyncHandler(async (req, res) => {
  const users = await User.find({ partnerApplication: { $ne: null } })
    .select('id name phone partnerApplication')
    .sort({ updatedAt: -1 })
    .lean();

  const applications = users
    .filter((u) => u.partnerApplication && u.partnerApplication.kind)
    .map((u) => ({
      userId: u.id,
      name: u.name,
      phone: u.phone,
      kind: u.partnerApplication.kind,
      city: u.partnerApplication.city || '',
      appliedAt: u.partnerApplication.appliedAt || null,
      status: u.partnerApplication.status || 'submitted',
      note: u.partnerApplication.note || '',
    }))
    .sort((a, b) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (b.status === 'submitted' && a.status !== 'submitted') return 1;
      return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0);
    });

  return ok(res, { applications });
});

/** PATCH /api/v1/admin/partners/:userId { status, note? } - approve/reject. */
const decidePartner = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const user = await User.findOne({ id: req.params.userId });
  if (!user || !user.partnerApplication) {
    throw ApiError.notFound('Application not found', 'APPLICATION_NOT_FOUND');
  }
  if (!['approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Decision must be approved or rejected', 'INVALID_DECISION');
  }

  user.partnerApplication.status = status;
  if (req.body.note) user.partnerApplication.note = String(req.body.note).trim().slice(0, 300);
  await user.save();

  return ok(res, {
    application: {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      kind: user.partnerApplication.kind,
      city: user.partnerApplication.city || '',
      appliedAt: user.partnerApplication.appliedAt || null,
      status: user.partnerApplication.status,
      note: user.partnerApplication.note || '',
    },
  });
});

module.exports = { getStats, listOrders, setOrderStatus, listPartners, decidePartner };
