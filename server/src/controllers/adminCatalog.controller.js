'use strict';

/**
 * Admin console - catalogue CRUD, customer management and reporting.
 *
 * Additive companion to `admin.controller.js`: that file owns order
 * fulfilment + partner applications, this one owns everything the Next.js
 * admin panel needs on top of it (catalogue records, customers, reports).
 *
 * Every route here is mounted behind `authenticate() + requireRole('admin')`
 * in `routes/admin.routes.js`, so no handler re-checks the role.
 */

const mongoose = require('mongoose');

const User = require('../models/User');
const Order = require('../models/Order');
const FoodCategory = require('../models/FoodCategory');
const FoodVibe = require('../models/FoodVibe');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const ShopCategory = require('../models/ShopCategory');
const ShopStore = require('../models/ShopStore');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const Promo = require('../models/Promo');

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { walletTx, loyaltyTx } = require('../utils/ledger');

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Coerce the query-string flavour of a boolean ("true"/"1") into a real one. */
function asBool(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return undefined;
}

/** Strip unknown keys so a client can never write fields we do not expose. */
function pick(body, fields) {
  const out = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) out[field] = body[field];
  }
  return out;
}

/** Normalise `image` / `cover` coming from the panel (URL string or object). */
function normaliseImage(value) {
  if (value === null || value === '') return null;
  if (typeof value === 'string') return { kind: 'uri', uri: value.trim() };
  return value;
}

const IMAGE_FIELDS = ['image', 'cover', 'avatar'];

function normalisePayload(payload) {
  const out = { ...payload };
  for (const field of IMAGE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(out, field)) out[field] = normaliseImage(out[field]);
  }
  // Comma separated strings are convenient from the panel's tag inputs.
  for (const field of ['cuisines', 'tags', 'categoryIds', 'colors', 'sizes']) {
    if (typeof out[field] === 'string') {
      out[field] = out[field].split(',').map((v) => v.trim()).filter(Boolean);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Generic catalogue CRUD factory
 * ------------------------------------------------------------------ */

/**
 * Builds list/create/update/remove handlers for a simple `id`-keyed model.
 *
 * @param {object} options
 * @param {import('mongoose').Model} options.model    Mongoose model
 * @param {string} options.key       Response key, e.g. `restaurants`
 * @param {string} options.prefix    Public id prefix used by `newId()`
 * @param {string[]} options.fields  Writable fields
 * @param {string[]} options.search  Fields included in the `q` regex search
 * @param {object} [options.sort]    Default sort
 * @param {(query, req) => void} [options.filter] Extra query-string filters
 */
function crud({ model, key, prefix, fields, search, sort = { createdAt: -1 }, filter }) {
  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
    const query = {};

    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      query.$or = search.map((field) => ({ [field]: rx }));
    }
    if (filter) filter(query, req);

    const [total, docs] = await Promise.all([
      model.countDocuments(query),
      model.find(query).sort(sort).skip(skip).limit(limit),
    ]);

    return ok(res, { [key]: docs.map((d) => d.toJSON()) }, listMeta(total, page, limit));
  });

  const getOne = asyncHandler(async (req, res) => {
    const doc = await model.findOne({ id: req.params.id });
    if (!doc) throw ApiError.notFound('Record not found', 'NOT_FOUND');
    return ok(res, { [key.replace(/ies$/, 'y').replace(/s$/, '')]: doc.toJSON() });
  });

  const create = asyncHandler(async (req, res) => {
    const payload = normalisePayload(pick(req.body, fields));
    payload.id = req.body.id ? String(req.body.id).trim() : newId(prefix);

    const clash = await model.findOne({ id: payload.id }).select('id').lean();
    if (clash) throw ApiError.conflict('A record with this id already exists', 'DUPLICATE_ID');

    let doc;
    try {
      doc = await model.create(payload);
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        throw ApiError.unprocessable(err.message, 'VALIDATION_ERROR');
      }
      throw err;
    }
    return created(res, { [key.replace(/ies$/, 'y').replace(/s$/, '')]: doc.toJSON() });
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await model.findOne({ id: req.params.id });
    if (!doc) throw ApiError.notFound('Record not found', 'NOT_FOUND');

    const payload = normalisePayload(pick(req.body, fields));
    doc.set(payload);
    try {
      await doc.save();
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        throw ApiError.unprocessable(err.message, 'VALIDATION_ERROR');
      }
      throw err;
    }
    return ok(res, { [key.replace(/ies$/, 'y').replace(/s$/, '')]: doc.toJSON() });
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await model.findOneAndDelete({ id: req.params.id });
    if (!doc) throw ApiError.notFound('Record not found', 'NOT_FOUND');
    return ok(res, { deleted: req.params.id });
  });

  return { list, getOne, create, update, remove };
}

/* ------------------------------------------------------------------ *
 * Resource definitions (mirrors the mobile app's data model)
 * ------------------------------------------------------------------ */

const resources = {
  'food/categories': crud({
    model: FoodCategory,
    key: 'categories',
    prefix: 'fcat',
    fields: ['name', 'icon', 'image', 'sortOrder'],
    search: ['name', 'id'],
    sort: { sortOrder: 1 },
  }),

  'food/vibes': crud({
    model: FoodVibe,
    key: 'vibes',
    prefix: 'vibe',
    fields: ['name', 'tagline', 'image', 'from', 'to', 'sortOrder'],
    search: ['name', 'tagline', 'id'],
    sort: { sortOrder: 1 },
  }),

  'food/restaurants': crud({
    model: Restaurant,
    key: 'restaurants',
    prefix: 'rst',
    fields: [
      'name', 'cuisines', 'rating', 'reviews', 'deliveryTime', 'deliveryFee', 'minOrder',
      'distanceKm', 'priceForTwo', 'promo', 'isVeg', 'isNew', 'isNewlyJoined', 'isClosed',
      'isPopular', 'offer', 'line', 'cover', 'tags', 'categoryIds',
    ],
    search: ['name', 'line', 'promo', 'id'],
    sort: { createdAt: -1 },
    filter: (query, req) => {
      if (req.query.category) query.categoryIds = req.query.category;
      const closed = asBool(req.query.closed);
      if (closed !== undefined) query.isClosed = closed;
      const veg = asBool(req.query.veg);
      if (veg !== undefined) query.isVeg = veg;
    },
  }),

  'food/items': crud({
    model: FoodItem,
    key: 'items',
    prefix: 'fitm',
    fields: [
      'restaurantId', 'name', 'description', 'price', 'mrp', 'rating', 'reviews', 'prepTime',
      'isVeg', 'isBestseller', 'isPopular', 'isSpecial', 'vibeId', 'tags', 'image', 'categoryIds',
    ],
    search: ['name', 'description', 'id'],
    sort: { createdAt: -1 },
    filter: (query, req) => {
      if (req.query.restaurantId) query.restaurantId = req.query.restaurantId;
      if (req.query.vibeId) query.vibeId = req.query.vibeId;
      const veg = asBool(req.query.veg);
      if (veg !== undefined) query.isVeg = veg;
    },
  }),

  'shop/categories': crud({
    model: ShopCategory,
    key: 'categories',
    prefix: 'scat',
    fields: ['name', 'icon', 'tagline', 'image', 'sortOrder'],
    search: ['name', 'tagline', 'id'],
    sort: { sortOrder: 1 },
  }),

  'shop/stores': crud({
    model: ShopStore,
    key: 'stores',
    prefix: 'str',
    fields: [
      'name', 'brand', 'road', 'house', 'city', 'pin', 'rating', 'reviews', 'deliveryMins',
      'deliveryFee', 'minOrder', 'promo', 'isNiche', 'isPopular', 'tags', 'categoryIds', 'cover',
    ],
    search: ['name', 'brand', 'city', 'road', 'id'],
    sort: { createdAt: -1 },
    filter: (query, req) => {
      if (req.query.category) query.categoryIds = req.query.category;
      if (req.query.city) query.city = new RegExp(escapeRegex(req.query.city), 'i');
    },
  }),

  'shop/products': crud({
    model: Product,
    key: 'products',
    prefix: 'prd',
    fields: [
      'storeId', 'name', 'brand', 'description', 'price', 'mrp', 'rating', 'reviews', 'inStock',
      'isNew', 'isTrending', 'isBestseller', 'isSpecialOffer', 'deliveryMins', 'tags', 'colors',
      'sizes', 'image', 'categoryId',
    ],
    search: ['name', 'brand', 'description', 'id'],
    sort: { createdAt: -1 },
    filter: (query, req) => {
      if (req.query.storeId) query.storeId = req.query.storeId;
      if (req.query.categoryId) query.categoryId = req.query.categoryId;
      const stock = asBool(req.query.inStock);
      if (stock !== undefined) query.inStock = stock;
    },
  }),

  banners: crud({
    model: Banner,
    key: 'banners',
    prefix: 'bnr',
    fields: ['module', 'title', 'subtitle', 'badge', 'image', 'target', 'sortOrder', 'active'],
    search: ['title', 'subtitle', 'badge', 'id'],
    sort: { sortOrder: 1 },
    filter: (query, req) => {
      if (req.query.module === 'food' || req.query.module === 'shop') query.module = req.query.module;
      const active = asBool(req.query.active);
      if (active !== undefined) query.active = active;
    },
  }),

  // Promo codes / coupon campaigns. Issuing + claiming live in
  // `promo.controller.js`; this is the plain CRUD surface.
  promos: crud({
    model: Promo,
    key: 'promos',
    prefix: 'promo',
    fields: [
      'code', 'title', 'subtitle', 'description', 'module', 'offType', 'offValue',
      'maxDiscount', 'minOrder', 'startsAt', 'expiresAt', 'usageLimit', 'perUserLimit',
      'selfClaim', 'active',
    ],
    search: ['code', 'title', 'subtitle', 'id'],
    sort: { createdAt: -1 },
    filter: (query, req) => {
      if (['all', 'food', 'shop'].includes(req.query.module)) query.module = req.query.module;
      if (['flat', 'percent'].includes(req.query.offType)) query.offType = req.query.offType;
      const active = asBool(req.query.active);
      if (active !== undefined) query.active = active;
      // `status=live|scheduled|expired` on top of the raw active flag.
      const now = new Date();
      if (req.query.status === 'live') {
        query.active = true;
        query.$and = [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
        ];
      } else if (req.query.status === 'scheduled') {
        query.startsAt = { $gt: now };
      } else if (req.query.status === 'expired') {
        query.expiresAt = { $lt: now };
      }
    },
  }),
};

/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */

/** GET /api/v1/admin/customers?q=&role=&page=&limit= */
const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = {};

  if (['customer', 'admin', 'vendor', 'delivery'].includes(req.query.role)) query.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    query.$or = [{ name: rx }, { phone: rx }, { email: rx }, { id: rx }, { referralCode: rx }];
  }

  const [total, docs] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('id role name email phone wallet loyaltyPoints referralCode createdAt partnerApplication')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const ids = docs.map((d) => d._id);
  const tally = await Order.aggregate([
    { $match: { user: { $in: ids } } },
    {
      $group: {
        _id: '$user',
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
      },
    },
  ]);
  const byUser = new Map(tally.map((row) => [String(row._id), row]));

  const customers = docs.map((doc) => {
    const stat = byUser.get(String(doc._id));
    return {
      id: doc.id,
      role: doc.role,
      name: doc.name,
      email: doc.email || '',
      phone: doc.phone,
      wallet: doc.wallet || 0,
      loyaltyPoints: doc.loyaltyPoints || 0,
      referralCode: doc.referralCode || '',
      joinedAt: doc.createdAt,
      partnerKind: doc.partnerApplication ? doc.partnerApplication.kind || null : null,
      orders: stat ? stat.orders : 0,
      spent: stat ? Math.round(stat.spent) : 0,
    };
  });

  return ok(res, { customers }, listMeta(total, page, limit));
});

/** GET /api/v1/admin/customers/:id - profile + ledgers + recent orders. */
const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.params.id });
  if (!user) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const orders = await Order.find({ user: user._id }).sort({ placedAt: -1 }).limit(20).lean();
  const [totals] = await Order.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
  ]);

  const json = user.toJSON();
  return ok(res, {
    customer: json,
    stats: {
      orders: totals ? totals.orders : 0,
      spent: totals ? Math.round(totals.spent) : 0,
      cancelled: totals ? totals.cancelled : 0,
    },
    orders: orders.map((o) => {
      const { _id, __v, ...rest } = o;
      return rest;
    }),
  });
});

/** POST /api/v1/admin/customers/:id/wallet { type, amount, note } */
const adjustWallet = asyncHandler(async (req, res) => {
  const { type, note = '' } = req.body;
  const amount = Math.round(Number(req.body.amount));

  if (!['credit', 'debit'].includes(type)) {
    throw ApiError.badRequest('type must be credit or debit', 'INVALID_TYPE');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest('amount must be greater than 0', 'INVALID_AMOUNT');
  }

  const user = await User.findOne({ id: req.params.id });
  if (!user) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (type === 'debit' && user.wallet < amount) {
    throw ApiError.badRequest('Wallet balance is lower than the debit amount', 'INSUFFICIENT_BALANCE');
  }

  user.wallet = type === 'credit' ? user.wallet + amount : user.wallet - amount;
  user.walletTxs.unshift(
    walletTx(type, {
      title: type === 'credit' ? 'Added by admin' : 'Deducted by admin',
      note: String(note).slice(0, 200),
      amount,
      balanceAfter: user.wallet,
    }),
  );
  await user.save();

  return ok(res, { wallet: user.wallet, walletTxs: user.walletTxs.slice(0, 20) });
});

/** POST /api/v1/admin/customers/:id/loyalty { type, points, note } */
const adjustLoyalty = asyncHandler(async (req, res) => {
  const { type, note = '' } = req.body;
  const points = Math.round(Number(req.body.points));

  if (!['earned', 'redeemed'].includes(type)) {
    throw ApiError.badRequest('type must be earned or redeemed', 'INVALID_TYPE');
  }
  if (!Number.isFinite(points) || points <= 0) {
    throw ApiError.badRequest('points must be greater than 0', 'INVALID_POINTS');
  }

  const user = await User.findOne({ id: req.params.id });
  if (!user) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (type === 'redeemed' && user.loyaltyPoints < points) {
    throw ApiError.badRequest('Not enough loyalty points', 'INSUFFICIENT_POINTS');
  }

  user.loyaltyPoints = type === 'earned' ? user.loyaltyPoints + points : user.loyaltyPoints - points;
  user.loyaltyTxs.unshift(
    loyaltyTx(type, {
      title: type === 'earned' ? 'Granted by admin' : 'Deducted by admin',
      note: String(note).slice(0, 200),
      points,
      balanceAfter: user.loyaltyPoints,
    }),
  );
  await user.save();

  return ok(res, { loyaltyPoints: user.loyaltyPoints, loyaltyTxs: user.loyaltyTxs.slice(0, 20) });
});

/** PATCH /api/v1/admin/customers/:id { role } - promote/demote console access. */
const setCustomerRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['customer', 'admin'].includes(role)) {
    throw ApiError.badRequest('role must be customer or admin', 'INVALID_ROLE');
  }

  const user = await User.findOne({ id: req.params.id });
  if (!user) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (String(user._id) === String(req.user._id) && role !== 'admin') {
    throw ApiError.badRequest('You cannot remove your own admin access', 'SELF_DEMOTE');
  }

  user.role = role;
  await user.save();
  return ok(res, { customer: { id: user.id, role: user.role } });
});

/* ------------------------------------------------------------------ *
 * Orders (single order detail for the panel)
 * ------------------------------------------------------------------ */

/** GET /api/v1/admin/orders/:id - one order with its customer attached. */
const getOrder = asyncHandler(async (req, res) => {
  const doc = await Order.findOne({ id: req.params.id }).populate('user', 'id name phone email wallet loyaltyPoints');
  if (!doc) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');

  const order = doc.toJSON();
  order.user = doc.user
    ? {
      id: doc.user.id,
      name: doc.user.name,
      phone: doc.user.phone,
      email: doc.user.email || '',
      wallet: doc.user.wallet,
      loyaltyPoints: doc.user.loyaltyPoints,
    }
    : null;

  return ok(res, { order });
});

/* ------------------------------------------------------------------ *
 * Reports
 * ------------------------------------------------------------------ */

/** GET /api/v1/admin/reports/overview?days=14 - charts for the dashboard. */
const reportOverview = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 14));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const [daily, byModule, byStatus, byPayment, topItems, topCustomers] = await Promise.all([
    Order.aggregate([
      { $match: { placedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$module',
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: '$status', orders: { $sum: 1 } } }]),
    Order.aggregate([
      {
        $group: {
          _id: '$payBy',
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$total'] } },
        },
      },
    ]),
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: { refId: '$items.refId', name: '$items.name', kind: '$items.kind' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.qty'] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
      { $sort: { spent: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          id: '$user.id',
          name: '$user.name',
          phone: '$user.phone',
          orders: 1,
          spent: { $round: ['$spent', 0] },
        },
      },
    ]),
  ]);

  // Fill gaps so the chart never renders a broken axis on quiet days.
  const series = [];
  const found = new Map(daily.map((d) => [d._id, d]));
  for (let i = 0; i < days; i += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const row = found.get(key);
    series.push({
      date: key,
      orders: row ? row.orders : 0,
      revenue: row ? Math.round(row.revenue) : 0,
      cancelled: row ? row.cancelled : 0,
    });
  }

  const shape = (rows, extra = 'orders') =>
    rows.map((r) => ({ key: r._id || 'unknown', orders: r.orders, revenue: Math.round(r.revenue || 0), [extra]: r[extra] }));

  return ok(res, {
    days,
    series,
    byModule: shape(byModule),
    byStatus: byStatus.map((r) => ({ key: r._id, orders: r.orders })),
    byPayment: shape(byPayment),
    topItems: topItems.map((r) => ({
      refId: r._id.refId,
      name: r._id.name,
      kind: r._id.kind,
      qty: r.qty,
      revenue: Math.round(r.revenue),
    })),
    topCustomers,
  });
});

/* ------------------------------------------------------------------ *
 * Catalogue lookups used by the panel's dropdowns
 * ------------------------------------------------------------------ */

/** GET /api/v1/admin/lookups - lightweight id/name lists for select inputs. */
const lookups = asyncHandler(async (req, res) => {
  const [restaurants, stores, foodCategories, shopCategories, vibes] = await Promise.all([
    Restaurant.find().select('id name').sort({ name: 1 }).lean(),
    ShopStore.find().select('id name').sort({ name: 1 }).lean(),
    FoodCategory.find().select('id name').sort({ sortOrder: 1 }).lean(),
    ShopCategory.find().select('id name').sort({ sortOrder: 1 }).lean(),
    FoodVibe.find().select('id name').sort({ sortOrder: 1 }).lean(),
  ]);

  const strip = (rows) => rows.map((r) => ({ id: r.id, name: r.name }));

  return ok(res, {
    restaurants: strip(restaurants),
    stores: strip(stores),
    foodCategories: strip(foodCategories),
    shopCategories: strip(shopCategories),
    vibes: strip(vibes),
  });
});

/** GET /api/v1/admin/system - runtime info for the settings screen. */
const systemInfo = asyncHandler(async (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return ok(res, {
    service: 'aurasure-api',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      state: states[mongoose.connection.readyState] || 'unknown',
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
    },
  });
});

module.exports = {
  resources,
  listCustomers,
  getCustomer,
  adjustWallet,
  adjustLoyalty,
  setCustomerRole,
  getOrder,
  reportOverview,
  lookups,
  systemInfo,
};
