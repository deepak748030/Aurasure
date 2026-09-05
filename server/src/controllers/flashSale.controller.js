'use strict';

const FlashSale = require('../models/FlashSale');
const FoodItem = require('../models/FoodItem');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { toAppImage } = require('../utils/imageRef');

const VISIBLE_APPROVAL = { approvalStatus: { $in: ['approved', null] } };

function clean(doc) {
  const json = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  if (json.image) json.image = toAppImage(json.image);
  if (json.cover) json.cover = toAppImage(json.cover);
  return json;
}

function discountOf(item) {
  const mrp = Number(item.mrp) || 0;
  const price = Number(item.price) || 0;
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * GET /api/v1/flash-sales/active?module=food|shop
 * The live event (if any) + its items in admin order + the outlet snapshot
 * the app needs to validate the cart (`{ id, name, deliveryFee, minOrder,
 * etaMinutes }` per outlet id).
 */
const getActive = asyncHandler(async (req, res) => {
  const module = req.query.module === 'shop' ? 'shop' : 'food';
  const now = new Date();
  const sale = await FlashSale.findOne({
    module,
    active: true,
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).sort({ startsAt: -1 });

  if (!sale) return ok(res, { sale: null, items: [], outlets: {} });

  const ids = (sale.itemIds || []).filter(Boolean);
  const Model = module === 'food' ? FoodItem : Product;
  const docs = ids.length ? await Model.find({ id: { $in: ids }, ...VISIBLE_APPROVAL }) : [];
  const byId = new Map(docs.map((d) => [d.id, clean(d)]));
  const items = ids.map((id) => byId.get(id)).filter(Boolean);

  // Deepest discount first inside the app's flash screen; keep admin order
  // for ties so the panel decides the visual story.
  items.sort((a, b) => discountOf(b) - discountOf(a));

  const outletIds = [...new Set(items.map((item) => (module === 'food' ? item.restaurantId : item.storeId)).filter(Boolean))];
  const outlets = {};
  if (outletIds.length) {
    const OutletModel = module === 'food' ? Restaurant : ShopStore;
    const outletDocs = await OutletModel.find({ id: { $in: outletIds } });
    for (const outlet of outletDocs) {
      outlets[outlet.id] = {
        id: outlet.id,
        name: outlet.name,
        deliveryFee: outlet.deliveryFee || 0,
        minOrder: outlet.minOrder || 0,
        etaMinutes: module === 'food' ? outlet.deliveryTime || 30 : outlet.deliveryMins || 40,
      };
    }
  }

  return ok(res, { sale: sale.toJSON(), items, outlets });
});

/** GET /api/v1/flash-sales/upcoming?module= — next scheduled event (teaser). */
const getUpcoming = asyncHandler(async (req, res) => {
  const module = req.query.module === 'shop' ? 'shop' : 'food';
  const now = new Date();
  const sale = await FlashSale.findOne({ module, active: true, startsAt: { $gt: now } }).sort({ startsAt: 1 });
  return ok(res, { sale: sale ? sale.toJSON() : null });
});

module.exports = { getActive, getUpcoming };
