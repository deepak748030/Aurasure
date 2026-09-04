'use strict';

const Vendor = require('../models/Vendor');
const FoodItem = require('../models/FoodItem');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');

/** Admin moderation queue for vendor-created items and price rises. */
const pending = asyncHandler(async (req, res) => {
  const [food, shop] = await Promise.all([
    FoodItem.find({ approvalStatus: 'pending' }).sort({ updatedAt: -1 }).lean(),
    Product.find({ approvalStatus: 'pending' }).sort({ updatedAt: -1 }).lean(),
  ]);
  const [restaurants, stores] = await Promise.all([
    Restaurant.find({ id: { $in: food.map((item) => item.restaurantId) } }).select('id vendorId name').lean(),
    ShopStore.find({ id: { $in: shop.map((item) => item.storeId) } }).select('id vendorId name').lean(),
  ]);
  const outlets = new Map([...restaurants, ...stores].map((outlet) => [outlet.id, outlet]));
  const vendorIds = [...new Set([...restaurants, ...stores].map((outlet) => outlet.vendorId).filter(Boolean))];
  const vendors = vendorIds.length ? await Vendor.find({ id: { $in: vendorIds } }).select('id outletName module').lean() : [];
  const names = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  return ok(res, { items: [
    ...food.map((item) => ({ ...item, module: 'food', outlet: outlets.get(item.restaurantId) || null, vendor: names.get(outlets.get(item.restaurantId)?.vendorId) || null })),
    ...shop.map((item) => ({ ...item, module: 'shop', outlet: outlets.get(item.storeId) || null, vendor: names.get(outlets.get(item.storeId)?.vendorId) || null })),
  ] });
});

const decide = asyncHandler(async (req, res) => {
  const decision = String(req.body.decision || req.body.status || '');
  if (!['approved', 'rejected'].includes(decision)) throw ApiError.badRequest('Decision must be approved or rejected', 'INVALID_DECISION');
  const update = { approvalStatus: decision, rejectionReason: decision === 'rejected' ? String(req.body.reason || 'Please review the item details').slice(0, 300) : '' };
  const [food, shop] = await Promise.all([
    FoodItem.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }),
    Product.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }),
  ]);
  const item = food || shop;
  if (!item) throw ApiError.notFound('Catalogue item not found', 'ITEM_NOT_FOUND');
  return ok(res, { item: item.toJSON() });
});

module.exports = { pending, decide };
