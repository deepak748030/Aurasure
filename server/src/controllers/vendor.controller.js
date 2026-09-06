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
const { docsComplete, profileComplete, emptyDocs, missingProfileFields, missingDocumentLabels } = require('../utils/vendorDocs');
const { describeUpload } = require('./upload.controller');
const { applyOrderCancellation } = require('./order.controller');
const { createDeliveryTaskForOrder } = require('../utils/delivery');

async function loadVendor(req) {
  const vendor = await Vendor.findOne({ userId: req.user.id });
  if (!vendor) throw ApiError.notFound('Vendor profile missing', 'VENDOR_MISSING');
  if (vendor.pauseUntil && vendor.pauseUntil <= new Date() && !vendor.isOpen) {
    vendor.isOpen = true;
    vendor.acceptingOrders = true;
    vendor.pauseUntil = null;
    vendor.pauseReason = '';
    await vendor.save();
    if (vendor.outletId) {
      const Model = vendor.module === 'food' ? Restaurant : ShopStore;
      await Model.updateOne({ id: vendor.outletId }, { $set: { isClosed: false } });
    }
  }
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
  return ok(res, { vendor, outlets: vendor.outletId ? [{ id: vendor.outletId, name: vendor.outletName, isOpen: vendor.isOpen }] : [], permissions: { orders: true, menu: true, business: true } });
});

// Contract aliases keep the mobile app's resumable onboarding flow separate
// from the live profile endpoint while persisting to the same scoped document.
const getOnboarding = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  return ok(res, { vendor, documents: vendor.documents, required: require('../utils/vendorDocs').requiredDocuments(vendor.module) });
});

const patchOnboarding = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  const allowed = [
    'ownerName', 'email', 'outletName', 'legalName', 'description', 'address', 'landmark',
    'city', 'pin', 'gstin', 'pan', 'fssai', 'tradeLicense', 'cuisines', 'categoryIds',
    'priceForTwo', 'minOrder', 'deliveryFee', 'deliveryMins', 'isVeg', 'bank', 'hours', 'geo', 'cover',
  ];
  if (vendor.status === 'approved' || vendor.status === 'suspended') {
    throw ApiError.forbidden('Onboarding is locked for this outlet', 'ONBOARDING_LOCKED');
  }
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (['bank', 'hours', 'geo'].includes(key) && typeof req.body[key] === 'object') {
        vendor[key] = { ...(vendor[key]?.toObject?.() || vendor[key] || {}), ...req.body[key] };
      } else {
        vendor[key] = req.body[key];
      }
    }
  }
  await vendor.save();
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
  // `ownerName` has no field on the onboarding form — it is captured at
  // registration. Backfill it from the account name so a legacy or partially
  // seeded vendor is not permanently blocked from submitting.
  if (!String(vendor.ownerName || '').trim() && String(vendor.name || '').trim()) {
    vendor.ownerName = vendor.name;
  }

  const missingFields = missingProfileFields(vendor);
  if (missingFields.length) {
    throw ApiError.badRequest(`Still needed: ${missingFields.join(', ')}`, 'PROFILE_INCOMPLETE');
  }
  const missingDocs = missingDocumentLabels(vendor);
  if (missingDocs.length) {
    throw ApiError.badRequest(`Upload these documents first: ${missingDocs.join(', ')}`, 'DOCS_INCOMPLETE');
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
  vendor.pauseUntil = null;
  vendor.pauseReason = '';
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
    { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: '$itemTotal' } } },
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
  if (status === 'new') query.status = 'placed';
  else if (status === 'preparing') query.status = { $in: ['confirmed', 'preparing'] };
  else if (status === 'ready') query.status = 'out_for_delivery';
  else if (status === 'completed') query.status = { $in: ['delivered', 'cancelled'] };
  else if (status) query.status = status;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).populate('user', 'name phone').sort({ placedAt: -1 }).skip(skip).limit(limit);
  const taskIds = orders.map((o) => o.deliveryTaskId).filter(Boolean);
  const tasks = taskIds.length ? await DeliveryTask.find({ id: { $in: taskIds } }).lean() : [];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const out = orders.map((order) => {
    const json = order.toJSON ? order.toJSON() : { ...order };
    if (json.user && typeof json.user === 'object') {
      json.customer = { name: json.user.name || '', phone: json.user.phone || '' };
    }
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

const getOrder = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const order = await Order.findOne({ id: req.params.id, vendorId: vendor.id }).populate('user', 'name phone');
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  const json = order.toJSON();
  if (order.deliveryTaskId) {
    const task = await DeliveryTask.findOne({ id: order.deliveryTaskId }).lean();
    if (task) {
      json.delivery = { taskId: task.id, state: task.state, pickupOtp: task.pickup?.otp || '', riderName: task.riderName || '', riderPhone: task.riderPhone || '' };
      if (!['picked_up', 'at_drop', 'delivered'].includes(task.state)) json.address = 'Shared with the rider after pickup';
    }
  }
  return ok(res, { order: json });
});

const acceptOrder = asyncHandler(async (req, res) => {
  req.body.status = 'confirmed';
  req.body.prepMins = Number(req.body.prepMins) || 15;
  return advanceOrder(req, res);
});

const readyOrder = asyncHandler(async (req, res) => {
  req.body.status = 'out_for_delivery';
  return advanceOrder(req, res);
});

const rejectOrder = asyncHandler(async (req, res) => {
  req.body.status = 'cancelled';
  return advanceOrder(req, res);
});

const partialAcceptOrder = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const order = await Order.findOne({ id: req.params.id, vendorId: vendor.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.status !== 'placed') throw ApiError.badRequest('Partial acceptance is only available for new orders', 'INVALID_ORDER_STATE');
  if (order.payBy !== 'cod') throw ApiError.badRequest('Partial acceptance is currently available for cash-on-delivery orders only', 'PARTIAL_PAYMENT_UNSUPPORTED');
  const remove = new Set(Array.isArray(req.body.removeLineIds) ? req.body.removeLineIds : []);
  if (!remove.size) throw ApiError.badRequest('Select at least one item to remove', 'LINES_REQUIRED');
  const remaining = order.items.filter((line) => !remove.has(line.id));
  if (!remaining.length) throw ApiError.badRequest('Keep at least one item or reject the order', 'EMPTY_ORDER');
  if (remaining.length === order.items.length) throw ApiError.badRequest('Select an item from this order', 'LINES_NOT_FOUND');
  order.items = remaining;
  order.itemTotal = order.items.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  order.total = Math.max(0, order.itemTotal + order.deliveryFee - order.discount);
  await order.save();
  return ok(res, { order });
});

const advanceOrder = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const { status } = req.body;
  const allowed = ['confirmed', 'preparing', 'out_for_delivery', 'cancelled'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid kitchen status', 'INVALID_STATUS');

  const order = await Order.findOne({ id: req.params.id, vendorId: vendor.id });
  if (!order) throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (req.body.expectedStatus && req.body.expectedStatus !== order.status) {
    throw ApiError.conflict('Order changed on another device. Refresh and try again.', 'STALE_STATE');
  }
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw ApiError.badRequest('Order already finished', 'ORDER_FINISHED');
  }
  const allowedNext = {
    placed: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'out_for_delivery', 'cancelled'],
    preparing: ['out_for_delivery'],
    out_for_delivery: [],
  };
  if (!allowedNext[order.status]?.includes(status)) {
    throw ApiError.conflict(`Cannot move an ${order.status} order to ${status}`, 'INVALID_TRANSITION');
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
  if (req.body.prepMins !== undefined) order.etaMinutes = Math.max(0, Number(req.body.prepMins) || 15);
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
  const search = req.query.q ? new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'i') : null;
  if (vendor.module === 'food') {
    const filter = { restaurantId: vendor.outletId };
    if (search) filter.$or = [{ name: search }, { description: search }, { tags: search }];
    if (req.query.categoryId) filter.categoryIds = req.query.categoryId;
    if (req.query.status === 'available') filter.isAvailable = true;
    if (req.query.status === 'unavailable') filter.isAvailable = false;
    if (req.query.status === 'pending') filter.approvalStatus = 'pending';
    const items = await FoodItem.find(filter).sort({ createdAt: -1 });
    return ok(res, {
      items: items.map((it) => {
        const json = it.toJSON();
        json.inStock = json.isAvailable !== false;
        return json;
      }),
    });
  }
  const filter = { storeId: vendor.outletId };
  if (search) filter.$or = [{ name: search }, { brand: search }, { description: search }, { tags: search }];
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.status === 'available') filter.inStock = true;
  if (req.query.status === 'unavailable') filter.inStock = false;
  if (req.query.status === 'pending') filter.approvalStatus = 'pending';
  const items = await Product.find(filter).sort({ createdAt: -1 });
  return ok(res, { items });
});

function catalogFields(body, module) {
  const fields = module === 'food'
    ? ['name', 'description', 'price', 'mrp', 'isVeg', 'isAvailable', 'inStock', 'prepTime', 'tags', 'image', 'categoryIds', 'variants', 'addonGroups', 'stockQty']
    : ['name', 'brand', 'description', 'price', 'mrp', 'inStock', 'isAvailable', 'tags', 'image', 'categoryId', 'variants', 'addonGroups', 'stockQty'];
  return Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
}

const upsertCatalog = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  await ensureOutlet(vendor);
  const body = req.body || {};
  if (vendor.module === 'food') {
    if (body.id) {
      const existing = await FoodItem.findOne({ id: body.id, restaurantId: vendor.outletId });
      if (!existing) throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
      const nextPrice = body.price !== undefined ? Number(body.price) : existing.price;
      const priceRose = existing.price > 0 && nextPrice > existing.price * 1.2;
      const item = await FoodItem.findOneAndUpdate(
        { id: body.id, restaurantId: vendor.outletId },
        { $set: { ...catalogFields(body, 'food'), restaurantId: vendor.outletId, ...(priceRose ? { approvalStatus: 'pending' } : {}) } },
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
      variants: body.variants || [],
      addonGroups: body.addonGroups || [],
      stockQty: body.stockQty ?? null,
      approvalStatus: 'pending',
    });
    return created(res, { item });
  }
  if (body.id) {
    const existing = await Product.findOne({ id: body.id, storeId: vendor.outletId });
    if (!existing) throw ApiError.notFound('Product not found', 'ITEM_NOT_FOUND');
    const nextPrice = body.price !== undefined ? Number(body.price) : existing.price;
    const priceRose = existing.price > 0 && nextPrice > existing.price * 1.2;
    const item = await Product.findOneAndUpdate(
      { id: body.id, storeId: vendor.outletId },
      { $set: { ...catalogFields(body, 'shop'), storeId: vendor.outletId, ...(priceRose ? { approvalStatus: 'pending' } : {}) } },
      { new: true },
    );
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
    variants: body.variants || [],
    addonGroups: body.addonGroups || [],
    stockQty: body.stockQty ?? null,
    approvalStatus: 'pending',
  });
  return created(res, { item });
});

const bulkCatalog = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw ApiError.badRequest('Select at least one item', 'ITEMS_REQUIRED');
  const Model = vendor.module === 'food' ? FoodItem : Product;
  const ownerField = vendor.module === 'food' ? 'restaurantId' : 'storeId';
  const update = {};
  if (req.body.op === 'availability') update[vendor.module === 'food' ? 'isAvailable' : 'inStock'] = Boolean(req.body.value);
  if (req.body.op === 'category' && req.body.value) update[vendor.module === 'food' ? 'categoryIds' : 'categoryId'] = req.body.value;
  if (req.body.op === 'price') {
    const percent = Number(req.body.value);
    if (!Number.isFinite(percent) || percent < -90 || percent > 200) throw ApiError.badRequest('Price adjustment must be between -90% and 200%', 'INVALID_PRICE_ADJUSTMENT');
    const docs = await Model.find({ id: { $in: ids }, [ownerField]: vendor.outletId });
    await Promise.all(docs.map((doc) => { doc.price = Number((doc.price * (1 + percent / 100)).toFixed(2)); return doc.save(); }));
    return ok(res, { updated: docs.length });
  }
  if (!Object.keys(update).length) throw ApiError.badRequest('Unsupported bulk operation', 'INVALID_BULK_OP');
  const result = await Model.updateMany({ id: { $in: ids }, [ownerField]: vendor.outletId }, { $set: update });
  return ok(res, { updated: result.modifiedCount || result.nModified || 0 });
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

const updateOutlet = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  if (vendor.outletId && req.params.id !== vendor.outletId) throw ApiError.forbidden('Outlet is outside your vendor scope', 'SCOPE_DENIED');
  const allowed = ['hours', 'geo', 'deliveryMins', 'deliveryFee', 'minOrder', 'description', 'cover', 'isVeg', 'priceForTwo'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) vendor[key] = ['hours', 'geo'].includes(key) ? { ...(vendor[key]?.toObject?.() || vendor[key] || {}), ...req.body[key] } : req.body[key];
  }
  await vendor.save();
  if (vendor.outletId) {
    const Model = vendor.module === 'food' ? Restaurant : ShopStore;
    const outletUpdate = {};
    if (req.body.deliveryMins !== undefined) outletUpdate[vendor.module === 'food' ? 'deliveryTime' : 'deliveryMins'] = vendor.deliveryMins;
    for (const key of ['deliveryFee', 'minOrder', 'cover', 'isVeg', 'priceForTwo']) {
      if (req.body[key] !== undefined) outletUpdate[key] = vendor[key];
    }
    if (Object.keys(outletUpdate).length) await Model.updateOne({ id: vendor.outletId }, { $set: outletUpdate });
  }
  return ok(res, { outlet: { id: vendor.outletId, name: vendor.outletName, hours: vendor.hours, geo: vendor.geo, isOpen: vendor.isOpen }, vendor });
});

const pauseOutlet = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const minutes = Math.min(24 * 60, Math.max(1, Number(req.body.minutes) || 30));
  vendor.isOpen = false;
  vendor.acceptingOrders = false;
  vendor.pauseUntil = new Date(Date.now() + minutes * 60 * 1000);
  vendor.pauseReason = String(req.body.reason || 'Temporarily paused').slice(0, 160);
  await vendor.save();
  if (vendor.outletId) {
    const Model = vendor.module === 'food' ? Restaurant : ShopStore;
    await Model.updateOne({ id: vendor.outletId }, { $set: { isClosed: true } });
  }
  return ok(res, { vendor, pauseUntil: vendor.pauseUntil });
});

const stats = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const range = String(req.query.range || 'today');
  const days = range === '30d' ? 30 : range === '7d' ? 7 : 1;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const [summary] = await Order.aggregate([
    { $match: { vendorId: vendor.id, placedAt: { $gte: start } } },
    { $group: { _id: null, orders: { $sum: 1 }, gross: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$itemTotal', 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } },
  ]);
  return ok(res, { range, orders: summary?.orders || 0, gross: summary?.gross || 0, net: Math.max(0, (summary?.gross || 0) * 0.95), cancelled: summary?.cancelled || 0, averagePrepMins: vendor.deliveryMins || 30, slaBreaches: 0 });
});

const payouts = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const delivered = await Order.find({ vendorId: vendor.id, status: 'delivered' }).sort({ placedAt: -1 }).limit(40).lean();
  const entries = delivered.map((order) => ({ id: order.id, orderCode: order.code, date: order.deliveredAt || order.placedAt, gross: order.itemTotal, commission: Number((order.itemTotal * 0.05).toFixed(2)), net: Number((order.itemTotal - order.itemTotal * 0.05).toFixed(2)), status: order.payoutCredited ? 'settled' : 'processing' }));
  return ok(res, { current: vendor.payoutBalance, nextPayoutDate: null, entries });
});

const payoutStatement = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  requireApproved(vendor);
  const order = await Order.findOne({ id: req.params.id, vendorId: vendor.id }).lean();
  if (!order) throw ApiError.notFound('Statement not found', 'STATEMENT_NOT_FOUND');
  return ok(res, { statement: { orderCode: order.code, gross: order.itemTotal, itemTotal: order.itemTotal, commission: Number((order.itemTotal * 0.05).toFixed(2)), net: Number((order.itemTotal - order.itemTotal * 0.05).toFixed(2)), date: order.placedAt } });
});

const ratings = asyncHandler(async (req, res) => {
  await loadVendor(req);
  return ok(res, { average: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, ratings: [] });
});

const replyRating = asyncHandler(async (req, res) => {
  await loadVendor(req);
  return ok(res, { rating: { id: req.params.id, reply: String(req.body.text || '').slice(0, 500) } });
});

const listStaff = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  return ok(res, { staff: vendor.staff || [] });
});

const addStaff = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (!req.body.name || !req.body.phone) throw ApiError.badRequest('Name and phone are required', 'STAFF_REQUIRED');
  const staff = { id: newId('stf'), name: String(req.body.name).slice(0, 80), phone: String(req.body.phone).slice(0, 15), role: 'vendor_staff', active: true };
  vendor.staff.push(staff);
  await vendor.save();
  return created(res, { staff });
});

const removeStaff = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  vendor.staff = (vendor.staff || []).filter((staff) => staff.id !== req.params.id);
  await vendor.save();
  return ok(res, { deleted: req.params.id });
});

const savePushToken = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req);
  if (!req.body.token) throw ApiError.badRequest('Push token required', 'TOKEN_REQUIRED');
  vendor.pushTokens = (vendor.pushTokens || []).filter((entry) => entry.token !== req.body.token);
  vendor.pushTokens.push({ token: String(req.body.token), platform: String(req.body.platform || 'unknown') });
  await vendor.save();
  return ok(res, { saved: true });
});

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image received', 'NO_FILE');
  return ok(res, describeUpload(req, req.file), undefined, 201);
});

module.exports = {
  getMe,
  getOnboarding,
  patchOnboarding,
  updateProfile,
  setDocument,
  submit,
  setOpen,
  dashboard,
  listOrders,
  getOrder,
  acceptOrder,
  rejectOrder,
  partialAcceptOrder,
  readyOrder,
  advanceOrder,
  listCatalog,
  upsertCatalog,
  bulkCatalog,
  deleteCatalog,
  updateOutlet,
  pauseOutlet,
  stats,
  payouts,
  payoutStatement,
  ratings,
  replyRating,
  listStaff,
  addStaff,
  removeStaff,
  savePushToken,
  raiseIssue,
  upload,
  ensureOutlet,
  loadVendor,
};
