'use strict';

const Vendor = require('../models/Vendor');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const FoodItem = require('../models/FoodItem');
const Product = require('../models/Product');
const Order = require('../models/Order');
const DeliveryTask = require('../models/DeliveryTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { docsComplete, profileComplete, emptyDocs } = require('../utils/vendorDocs');
const { describeUpload } = require('./upload.controller');
const { applyOrderCancellation } = require('./order.controller');
const { createDeliveryTaskForOrder } = require('../utils/delivery');

async function loadVendor(req) {
  const vendor = await Vendor.findOne({ userId: req.user.id });
  if (!vendor) throw ApiError.notFound('Vendor profile missing', 'VENDOR_MISSING');
  return vendor;
}

function requireApproved(vendor) {
  if (vendor.status !== 'approved') {
    throw ApiError.forbidden('Outlet goes live only after admin verifies every document', 'NOT_APPROVED');
  }
}

async function ensureOutlet(vendor) {
  if (vendor.outletId) return vendor;
  if (vendor.module === 'food') {
    const id = newId('rst');
    await Restaurant.create({
      id,
      name: vendor.outletName,
      cuisines: vendor.cuisines,
      deliveryTime: vendor.deliveryMins || 30,
      deliveryFee: vendor.deliveryFee || 0,
      minOrder: vendor.minOrder || 0,
      priceForTwo: vendor.priceForTwo || 0,
      isVeg: vendor.isVeg,
      isClosed: !vendor.isOpen,
      isNewlyJoined: true,
      line: vendor.address,
      cover: vendor.cover,
      tags: vendor.cuisines,
      categoryIds: vendor.categoryIds,
      vendorId: vendor.id,
    });
    vendor.outletId = id;
  } else {
    const id = newId('str');
    await ShopStore.create({
      id,
      name: vendor.outletName,
      city: vendor.city || 'City',
      pin: vendor.pin,
      road: vendor.address,
      deliveryMins: vendor.deliveryMins || 40,
      deliveryFee: vendor.deliveryFee || 0,
      minOrder: vendor.minOrder || 0,
      tags: vendor.categoryIds,
      categoryIds: vendor.categoryIds,
      cover: vendor.cover,
      vendorId: vendor.id,
      isClosed: !vendor.isOpen,
    });
    vendor.outletId = id;
  }
  await vendor.save();
  return vendor;
}

const getMe = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  return ok(res, { vendor });
});

const updateProfile = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (['approved', 'suspended'].includes(vendor.status) === false) {
    const fields = [
      'ownerName', 'email', 'outletName', 'legalName', 'description', 'address', 'landmark',
      'city', 'pin', 'gstin', 'pan', 'fssai', 'tradeLicense', 'cuisines', 'categoryIds',
      'priceForTwo', 'minOrder', 'deliveryFee', 'deliveryMins', 'isVeg',
    ];
    for (const key of fields) {
      if (req.body[key] !== undefined) vendor[key] = req.body[key];
    }
    if (req.body.bank && typeof req.body.bank === 'object') {
      vendor.bank = { ...vendor.bank.toObject?.() || vendor.bank, ...req.body.bank };
    }
    if (req.body.hours && typeof req.body.hours === 'object') {
      vendor.hours = { ...vendor.hours.toObject?.() || vendor.hours, ...req.body.hours };
    }
    if (req.body.cover !== undefined) vendor.cover = req.body.cover;
  } else {
    const live = ['description', 'minOrder', 'deliveryFee', 'deliveryMins', 'hours', 'cover', 'isVeg', 'priceForTwo'];
    for (const key of live) {
      if (req.body[key] !== undefined) vendor[key] = req.body[key];
    }
    if (req.body.hours) vendor.hours = { ...vendor.hours.toObject?.() || vendor.hours, ...req.body.hours };
  }
  await vendor.save();
  return ok(res, { vendor });
});

const setDocument = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (vendor.status === 'suspended') throw ApiError.forbidden('Account suspended', 'SUSPENDED');
  const { key, uri, label } = req.body;
  if (!key) throw ApiError.badRequest('Document key required', 'DOC_KEY');
  if (!vendor.documents.length) vendor.documents = emptyDocs(vendor.module);
  const idx = vendor.documents.findIndex((d) => d.key === key);
  if (idx < 0) {
    vendor.documents.push({ key, label: label || key, uri: uri || '', verified: false, note: '' });
  } else {
    vendor.documents[idx].uri = uri || '';
    vendor.documents[idx].verified = false;
    vendor.documents[idx].note = '';
    if (label) vendor.documents[idx].label = label;
  }
  if (vendor.status === 'needs_info' || vendor.status === 'rejected') vendor.status = 'onboarding';
  await vendor.save();
  return ok(res, { vendor });
});

const submit = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (vendor.status === 'approved') return ok(res, { vendor });
  if (vendor.status === 'suspended') throw ApiError.forbidden('Account suspended', 'SUSPENDED');
  if (!profileComplete(vendor)) {
    throw ApiError.badRequest('Fill outlet, KYC and bank details before submitting', 'PROFILE_INCOMPLETE');
  }
  if (!docsComplete(vendor)) {
    throw ApiError.badRequest('Upload every required document before submitting', 'DOCS_INCOMPLETE');
  }
  vendor.status = 'submitted';
  vendor.submittedAt = new Date();
  vendor.reviewNote = '';
  await vendor.save();
  return ok(res, { vendor });
});

const setOpen = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  vendor.isOpen = Boolean(req.body.isOpen);
  vendor.acceptingOrders = vendor.isOpen;
  await vendor.save();
  if (vendor.outletId) {
    if (vendor.module === 'food') {
      await Restaurant.updateOne({ id: vendor.outletId }, { $set: { isClosed: !vendor.isOpen } });
    } else {
      await ShopStore.updateOne({ id: vendor.outletId }, { $set: { isClosed: !vendor.isOpen } });
    }
  }
  return ok(res, { vendor });
});

const dashboard = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (vendor.status !== 'approved') {
    return ok(res, {
      vendor,
      stats: { todayOrders: 0, todaySales: 0, liveOrders: 0, menuCount: 0, payoutBalance: vendor.payoutBalance },
      live: [],
    });
  }
  const match = { vendorId: vendor.id };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [todayAgg] = await Order.aggregate([
    { $match: { ...match, placedAt: { $gte: start }, status: { $ne: 'cancelled' } } },
    { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$total' } } },
  ]);
  const liveOrders = await Order.countDocuments({
    ...match,
    status: { $in: ['placed', 'confirmed', 'preparing', 'out_for_delivery'] },
  });
  const menuCount = vendor.module === 'food'
    ? await FoodItem.countDocuments({ restaurantId: vendor.outletId })
    : await Product.countDocuments({ storeId: vendor.outletId });
  const live = await Order.find({
    ...match,
    status: { $in: ['placed', 'confirmed', 'preparing'] },
  }).sort({ placedAt: -1 }).limit(8).lean();

  return ok(res, {
    vendor,
    stats: {
      todayOrders: todayAgg ? todayAgg.orders : 0,
      todaySales: todayAgg ? todayAgg.sales : 0,
      liveOrders,
      menuCount,
      payoutBalance: vendor.payoutBalance,
    },
    live,
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const { status } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 80 });
  const query = { vendorId: vendor.id };
  if (status) query.status = status;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ placedAt: -1 }).skip(skip).limit(limit);
  const taskIds = orders.map((o) => o.deliveryTaskId).filter(Boolean);
  const tasks = taskIds.length ? await DeliveryTask.find({ id: { $in: taskIds } }).lean() : [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const out = orders.map((order) => {
    const json = order.toJSON ? order.toJSON() : { ...order };
    const task = taskById.get(json.deliveryTaskId);
    if (task) {
      json.delivery = {
        taskId: task.id,
        state: task.state,
        pickupOtp: task.pickup?.otp || '',
        riderName: task.riderName || '',
        riderPhone: task.riderPhone || '',
      };
    }
    return json;
  });
  return ok(res, { orders: out }, listMeta(total, page, limit));
});

const advanceOrder = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const { status } = req.body;
  const allowed = ['confirmed', 'preparing', 'out_for_delivery', 'cancelled'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid kitchen status', 'INVALID_STATUS');

  const order = await Order.findOne({ id: req.params.id, vendorId: vendor.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw ApiError.badRequest('Order already finished', 'ORDER_FINISHED');
  }
  if (status === 'cancelled') {
    if (!['placed', 'confirmed'].includes(order.status)) {
      throw ApiError.badRequest('Too late to reject this order', 'CANT_CANCEL');
    }
    order.status = 'cancelled';
    await order.save();
    await applyOrderCancellation(order);
    return ok(res, { order });
  }
  order.status = status;
  await order.save();
  if (status === 'out_for_delivery') {
    // A delivery partner task is published only after the item is ready.
    await createDeliveryTaskForOrder(order);
  }
  return ok(res, { order });
});

const listCatalog = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  await ensureOutlet(vendor);
  if (vendor.module === 'food') {
    const items = await FoodItem.find({ restaurantId: vendor.outletId }).sort({ createdAt: -1 });
    return ok(res, {
      items: items.map((it) => {
        const json = it.toJSON();
        json.inStock = json.isAvailable !== false;
        return json;
      }),
    });
  }
  const items = await Product.find({ storeId: vendor.outletId }).sort({ createdAt: -1 });
  return ok(res, { items });
});

const upsertCatalog = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  await ensureOutlet(vendor);
  const body = req.body || {};
  if (vendor.module === 'food') {
    if (body.id) {
      const item = await FoodItem.findOneAndUpdate(
        { id: body.id, restaurantId: vendor.outletId },
        { $set: { ...body, restaurantId: vendor.outletId } },
        { new: true },
      );
      if (!item) throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
      return ok(res, { item });
    }
    const item = await FoodItem.create({
      id: newId('fit'),
      restaurantId: vendor.outletId,
      name: body.name,
      description: body.description || '',
      price: Number(body.price) || 0,
      mrp: Number(body.mrp) || Number(body.price) || 0,
      isVeg: body.isVeg !== false,
      isAvailable: body.inStock !== false && body.isAvailable !== false,
      prepTime: Number(body.prepTime) || 15,
      tags: body.tags || [],
      image: body.image || null,
      categoryIds: body.categoryIds || [],
    });
    return created(res, { item });
  }
  if (body.id) {
    const item = await Product.findOneAndUpdate(
      { id: body.id, storeId: vendor.outletId },
      { $set: { ...body, storeId: vendor.outletId } },
      { new: true },
    );
    if (!item) throw ApiError.notFound('Product not found', 'ITEM_NOT_FOUND');
    return ok(res, { item });
  }
  const item = await Product.create({
    id: newId('prd'),
    storeId: vendor.outletId,
    name: body.name,
    brand: body.brand || vendor.outletName,
    description: body.description || '',
    price: Number(body.price) || 0,
    mrp: Number(body.mrp) || Number(body.price) || 0,
    inStock: body.inStock !== false,
    tags: body.tags || [],
    image: body.image || null,
    categoryId: body.categoryId || (vendor.categoryIds[0] || 'cat_general'),
  });
  return created(res, { item });
});

const deleteCatalog = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  if (vendor.module === 'food') {
    const r = await FoodItem.deleteOne({ id: req.params.id, restaurantId: vendor.outletId });
    if (!r.deletedCount) throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
  } else {
    const r = await Product.deleteOne({ id: req.params.id, storeId: vendor.outletId });
    if (!r.deletedCount) throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
  }
  return ok(res, { deleted: req.params.id });
});

const raiseIssue = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  const { title, body } = req.body;
  if (!title) throw ApiError.badRequest('Title required', 'TITLE_REQUIRED');
  vendor.issues.push({
    id: newId('iss'),
    title: String(title).slice(0, 120),
    body: String(body || '').slice(0, 800),
    status: 'open',
  });
  await vendor.save();
  return created(res, { vendor });
});

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image received', 'NO_FILE');
  return ok(res, describeUpload(req, req.file), undefined, 201);
});

module.exports = {
  getMe,
  updateProfile,
  setDocument,
  submit,
  setOpen,
  dashboard,
  listOrders,
  advanceOrder,
  listCatalog,
  upsertCatalog,
  deleteCatalog,
  raiseIssue,
  upload,
  ensureOutlet,
  loadVendor,
};
