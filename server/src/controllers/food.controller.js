'use strict';

const FoodCategory = require('../models/FoodCategory');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const FoodVibe = require('../models/FoodVibe');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { toAppImage } = require('../utils/imageRef');

function cleanImages(doc) {
  const json = doc.toJSON();
  if (json.image) json.image = toAppImage(json.image);
  if (json.cover) json.cover = toAppImage(json.cover);
  return json;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** GET /api/v1/food/categories */
const listCategories = asyncHandler(async (req, res) => {
  const items = await FoodCategory.find().sort({ sortOrder: 1 }).lean();
  return ok(res, { categories: items.map((c) => ({ ...c, image: toAppImage(c.image) })) });
});

/** GET /api/v1/food/vibes */
const listVibes = asyncHandler(async (req, res) => {
  const items = await FoodVibe.find().sort({ sortOrder: 1 }).lean();
  return ok(res, { vibes: items.map((v) => ({ ...v, image: toAppImage(v.image) })) });
});

/** GET /api/v1/food/vibes/:id/items */
const getVibeItems = asyncHandler(async (req, res) => {
  const vibe = await FoodVibe.findOne({ id: req.params.id }).lean();
  if (!vibe) throw ApiError.notFound('Collection not found', 'VIBE_NOT_FOUND');
  const items = await FoodItem.find({ vibeId: vibe.id }).sort({ rating: -1 });
  return ok(res, { vibe, items: items.map(cleanImages) });
});

/** GET /api/v1/food/restaurants?category=&filter=all|new|popular|top&q=&page=&limit= */
const listRestaurants = asyncHandler(async (req, res) => {
  const { category, filter, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const query = {};
  if (category) query.categoryIds = category;
  if (filter === 'new') query.isNewlyJoined = true;
  if (filter === 'popular') query.isPopular = true;
  if (filter === 'top') query.rating = { $gte: 4.7 };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { cuisines: rx }, { tags: rx }, { line: rx }];
  }

  const total = await Restaurant.countDocuments(query);
  const items = await Restaurant.find(query).sort({ rating: -1, reviews: -1 }).skip(skip).limit(limit);
  return ok(res, { restaurants: items.map(cleanImages) }, listMeta(total, page, limit));
});

/** GET /api/v1/food/restaurants/:id */
const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne({ id: req.params.id });
  if (!restaurant) throw ApiError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  const items = await FoodItem.find({ restaurantId: restaurant.id }).sort({ isBestseller: -1, rating: -1 });
  return ok(res, { restaurant: cleanImages(restaurant), items: items.map(cleanImages) });
});

/** GET /api/v1/food/restaurants/:id/items */
const getRestaurantItems = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne({ id: req.params.id }).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  const items = await FoodItem.find({ restaurantId: restaurant.id }).sort({ isBestseller: -1, rating: -1 });
  return ok(res, { items: items.map(cleanImages) });
});

/** GET /api/v1/food/items?category=&popular=&special=&bestseller=&vibeId=&q=&page=&limit= */
const listItems = asyncHandler(async (req, res) => {
  const { category, popular, special, bestseller, vibeId, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const query = {};
  if (category) query.categoryIds = category;
  if (popular === 'true') query.isPopular = true;
  if (special === 'true') query.isSpecial = true;
  if (bestseller === 'true') query.isBestseller = true;
  if (vibeId) query.vibeId = vibeId;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  const total = await FoodItem.countDocuments(query);
  const items = await FoodItem.find(query).sort({ isBestseller: -1, rating: -1, reviews: -1 }).skip(skip).limit(limit);
  return ok(res, { items: items.map(cleanImages) }, listMeta(total, page, limit));
});

/** GET /api/v1/food/items/:id */
const getItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findOne({ id: req.params.id });
  if (!item) throw ApiError.notFound('Item not found', 'FOOD_ITEM_NOT_FOUND');
  return ok(res, { item: cleanImages(item) });
});

/** GET /api/v1/food/popular */
const listPopular = asyncHandler(async (req, res) =>
  listItemsByFlag({ isPopular: true }, req, res));

/** GET /api/v1/food/offers */
const listOffers = asyncHandler(async (req, res) =>
  listItemsByFlag({ isSpecial: true }, req, res));

/** GET /api/v1/food/new-stores */
const listNewStores = asyncHandler(async (req, res) => {
  const items = await Restaurant.find({ isNew: true }).sort({ createdAt: -1 });
  return ok(res, { restaurants: items.map(cleanImages) });
});

async function listItemsByFlag(flag, req, res) {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12 });
  const total = await FoodItem.countDocuments(flag);
  const items = await FoodItem.find(flag).sort({ rating: -1, reviews: -1 }).skip(skip).limit(limit);
  return ok(res, { items: items.map(cleanImages) }, listMeta(total, page, limit));
}

module.exports = {
  listCategories,
  listVibes,
  getVibeItems,
  listRestaurants,
  getRestaurant,
  getRestaurantItems,
  listItems,
  getItem,
  listPopular,
  listOffers,
  listNewStores,
};
