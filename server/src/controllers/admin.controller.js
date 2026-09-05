'use strict';

/**
 * Admin console endpoints - order fulfilment (advance/cancel) and review of
 * delivery-partner / vendor applications. All routes sit behind
 * `authenticate() + requireRole('admin')` (see routes/admin.routes.js).
 */

const Order = require('../models/Order');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryTask = require('../models/DeliveryTask');
const AdminAudit = require('../models/AdminAudit');
const FoodCategory = require('../models/FoodCategory');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const ShopCategory = require('../models/ShopCategory');
const ShopStore = require('../models/ShopStore');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const SupportTicket = require('../models/SupportTicket');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { applyOrderCancellation } = require('./order.controller');
const { creditVendorPayout } = require('../utils/payout');
const { createDeliveryTaskForOrder, completeDeliveryTask } = require('../utils/delivery');
const { writeAudit } = require('../utils/audit');

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
  const [
    users,
    restaurants,
    foodItems,
    shops,
    products,
    totalOrders,
    foodCategories,
    shopCategories,
    banners,
    deliveryPartners,
    ridersOnline,
  ] = await Promise.all([
    User.countDocuments(),
    Restaurant.countDocuments(),
    FoodItem.countDocuments(),
    ShopStore.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    FoodCategory.countDocuments(),
    ShopCategory.countDocuments(),
    Banner.countDocuments(),
    DeliveryPartner.countDocuments(),
    DeliveryPartner.countDocuments({ dutyState: { $in: ['online', 'on_task'] } }),
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
  const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } });
  const pendingVendors = await Vendor.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
  const pendingRiders = await DeliveryPartner.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
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
    pendingVendors,
    pendingRiders,
    openTickets,
    deliveryPartners,
    ridersOnline,
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

/** GET /api/v1/admin/audit - server-side admin audit trail. */
const listAudit = asyncHandler(async (req, res) => {
  const { action, target, q, from, to } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 50, maxLimit: 100 });
  const query = {};
  if (action) query.action = action;
  if (target) query.$or = [{ targetId: target }, { targetCode: target }];
  const text = q ? String(q).trim() : '';
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    const or = [{ actorName: rx }, { action: rx }, { targetCode: rx }, { targetType: rx }];
    if (query.$or) query.$or = [...query.$or, ...or];
    else query.$or = or;
  }
  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    query.createdAt = range;
  }
  const total = await AdminAudit.countDocuments(query);
  const entries = await AdminAudit.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return ok(res, { entries }, listMeta(total, page, limit));
});

/** Escape a value for safe regex use in query filters. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * PATCH /api/v1/admin/orders/:id/status { status }
 * Admin fulfilment: advance placed → confirmed → preparing → out_for_delivery
 * → delivered, or cancel live orders (full wallet refund + loyalty/coupon
 * reversal via the same path the customer cancel uses).
 */
const setOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (status === 'cancelled') {
    // Atomic claim - only the first cancel flips the status, so refunds and
    // loyalty/coupon reversals can never run twice (even on a double tap or a
    // race with the customer's own cancel request).
    const order = await Order.findOneAndUpdate(
      { id: req.params.id, status: { $in: ['placed', 'confirmed'] } },
      { $set: { status: 'cancelled' } },
      { new: true },
    );
    if (!order) {
      const exists = await Order.findOne({ id: req.params.id }).select('status');
      if (!exists) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
      if (TERMINAL_STATUSES.includes(exists.status)) {
        throw ApiError.badRequest(`Order is already ${exists.status} - no further changes`, 'ORDER_FINISHED');
      }
      throw ApiError.badRequest('This order can no longer be cancelled', 'CANT_CANCEL');
    }
    const user = await applyOrderCancellation(order);
    const out = publicOrder(order);
    out.user = { name: user.name, phone: user.phone };
    out.wallet = user.wallet;
    out.loyaltyPoints = user.loyaltyPoints;
    await writeAudit({
      actor: req.user,
      action: 'order.cancel',
      targetType: 'order',
      targetId: order.id,
      targetCode: order.code,
      detail: `Cancelled by admin · refunded ₹${order.walletPaid || 0}`,
      req,
    });
    return ok(res, { order: out });
  }

  const order = await Order.findOne({ id: req.params.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');

  if (TERMINAL_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(`Order is already ${order.status} - no further changes`, 'ORDER_FINISHED');
  }
  if (status === order.status) return ok(res, { order: publicOrder(order) });

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
  if (status === 'delivered') {
    order.etaMinutes = 0;
    order.deliveredAt = new Date();
    await creditVendorPayout(order);
  }
  await order.save();
  if (status === 'out_for_delivery') {
    // Publish a delivery task for the rider app (idempotent).
    await createDeliveryTaskForOrder(order);
  }
  if (status === 'delivered') {
    const task = await DeliveryTask.findOne({ orderId: order._id });
    if (task && !['delivered', 'failed', 'cancelled'].includes(task.state)) {
      if (task.riderId) {
        const rider = await DeliveryPartner.findOne({ id: task.riderId });
        await completeDeliveryTask(task, { rider, note: task.note || 'Completed by operations' });
      } else {
        task.state = 'delivered';
        task.note = task.note || 'Completed by operations';
        await task.save();
      }
    }
  }
  await writeAudit({
    actor: req.user,
    action: 'order.status',
    targetType: 'order',
    targetId: order.id,
    targetCode: order.code,
    detail: `${order.status} → ${status}`,
    req,
  });
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

  await writeAudit({
    actor: req.user,
    action: status === 'approved' ? 'partner.approve' : 'partner.reject',
    targetType: 'partner_application',
    targetId: user.id,
    targetCode: `${user.name} · ${user.phone}`,
    detail: String(req.body.note || ''),
    req,
  });

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

module.exports = { getStats, listOrders, setOrderStatus, listPartners, decidePartner, listAudit };
