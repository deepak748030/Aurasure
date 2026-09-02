'use strict';

const FoodItem = require('../models/FoodItem');
const Restaurant = require('../models/Restaurant');
const Product = require('../models/Product');
const ShopStore = require('../models/ShopStore');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate } = require('../utils/response');
const { toAppImage } = require('../utils/imageRef');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clean(list) {
  return list.map((doc) => {
    const json = doc.toJSON();
    if (json.image) json.image = toAppImage(json.image);
    if (json.cover) json.cover = toAppImage(json.cover);
    return json;
  });
}

/**
 * GET /api/v1/search?q=&module=food|shop
 * Food -> dishes + restaurants | Shop -> products + stores.
 */
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const module = req.query.module === 'shop' ? 'shop' : 'food';
  const { limit } = paginate(req.query, { defaultLimit: 30 });

  if (!q) {
    return ok(res, { query: q, module, items: [], restaurants: [], products: [], stores: [] });
  }

  const rx = new RegExp(escapeRegex(q), 'i');

  if (module === 'food') {
    const [items, restaurants] = await Promise.all([
      FoodItem.find({ $or: [{ name: rx }, { description: rx }, { tags: rx }] }).limit(limit),
      Restaurant.find({ $or: [{ name: rx }, { cuisines: rx }, { tags: rx }, { line: rx }] }).limit(limit),
    ]);
    return ok(res, { query: q, module, items: clean(items), restaurants: clean(restaurants), products: [], stores: [] });
  }

  const [products, stores] = await Promise.all([
    Product.find({ $or: [{ name: rx }, { brand: rx }, { description: rx }, { tags: rx }] }).limit(limit),
    ShopStore.find({ $or: [{ name: rx }, { road: rx }, { tags: rx }] }).limit(limit),
  ]);
  return ok(res, { query: q, module, items: [], restaurants: [], products: clean(products), stores: clean(stores) });
});

module.exports = { search, ApiError };
