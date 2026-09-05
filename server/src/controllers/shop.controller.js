'use strict';

const ShopCategory = require('../models/ShopCategory');
const ShopStore = require('../models/ShopStore');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { toAppImage } = require('../utils/imageRef');

const VISIBLE_APPROVAL = { approvalStatus: { $in: ['approved', null] } };

function cleanImages(doc) {
  const json = doc.toJSON();
  if (json.image) json.image = toAppImage(json.image);
  if (json.cover) json.cover = toAppImage(json.cover);
  return json;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** GET /api/v1/shop/categories */
const listCategories = asyncHandler(async (req, res) => {
  const items = await ShopCategory.find().sort({ sortOrder: 1 }).lean();
  return ok(res, { categories: items.map((c) => ({ ...c, image: toAppImage(c.image) })) });
});

/** GET /api/v1/shop/categories/:id */
const getCategory = asyncHandler(async (req, res) => {
  const category = await ShopCategory.findOne({ id: req.params.id }).lean();
  if (!category) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  const count = await Product.countDocuments({ categoryId: category.id, ...VISIBLE_APPROVAL });
  return ok(res, { category: { ...category, image: toAppImage(category.image) }, itemCount: count });
});

/** GET /api/v1/shop/categories/:id/products */
const getCategoryProducts = asyncHandler(async (req, res) => {
  const category = await ShopCategory.findOne({ id: req.params.id }).lean();
  if (!category) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
  const items = await Product.find({ categoryId: category.id, ...VISIBLE_APPROVAL }).sort({ rating: -1, reviews: -1 });
  return ok(res, { category: { ...category, image: toAppImage(category.image) }, products: items.map(cleanImages) });
});

/**
 * GET /api/v1/shop/stores?recommended=&niche=&popular=&city=&q=&page=&limit=
 * `recommended=true` returns top picks + niche stores that aren't top picks
 * (mirrors the home rail).
 */
const listStores = asyncHandler(async (req, res) => {
  const { recommended, niche, popular, city, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const query = {};
  if (niche === 'true') query.isNiche = true;
  if (popular === 'true') query.isPopular = true;
  if (city) query.city = city;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { road: rx }, { tags: rx }];
  }

  let items;
  let total;
  if (recommended === 'true') {
    const top = await ShopStore.find(query).sort({ rating: -1, reviews: -1 });
    const ids = top.map((s) => s.id);
    const extra = await ShopStore.find({ ...query, isNiche: true, id: { $nin: ids } }).sort({ rating: -1 });
    items = [...top, ...extra];
    total = items.length;
    // recommended rail is returned in full; pagination kept for parity
    const sliced = items.slice(skip, skip + limit);
    return ok(res, { stores: sliced.map(cleanImages) }, listMeta(total, page, limit));
  }

  total = await ShopStore.countDocuments(query);
  items = await ShopStore.find(query).sort({ isPopular: -1, rating: -1, reviews: -1 }).skip(skip).limit(limit);
  return ok(res, { stores: items.map(cleanImages) }, listMeta(total, page, limit));
});

/** GET /api/v1/shop/stores/:id */
const getStore = asyncHandler(async (req, res) => {
  const store = await ShopStore.findOne({ id: req.params.id });
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');
  const products = await Product.find({ storeId: store.id, ...VISIBLE_APPROVAL }).sort({ rating: -1, reviews: -1 });
  return ok(res, { store: cleanImages(store), products: products.map(cleanImages) });
});

/** GET /api/v1/shop/stores/:id/products */
const getStoreProducts = asyncHandler(async (req, res) => {
  const store = await ShopStore.findOne({ id: req.params.id }).lean();
  if (!store) throw ApiError.notFound('Store not found', 'STORE_NOT_FOUND');
  const items = await Product.find({ storeId: store.id, ...VISIBLE_APPROVAL }).sort({ rating: -1, reviews: -1 });
  return ok(res, { products: items.map(cleanImages) });
});

/**
 * GET /api/v1/shop/products?category=&store=&trending=&special=&new=&q=&page=&limit=
 */
const listProducts = asyncHandler(async (req, res) => {
  const { category, store, trending, special, isNew, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });

  const query = { ...VISIBLE_APPROVAL };
  if (category) query.categoryId = category;
  if (store) query.storeId = store;
  if (trending === 'true') query.isTrending = true;
  if (special === 'true') query.isSpecialOffer = true;
  if (isNew === 'true') query.isNew = true;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ name: rx }, { brand: rx }, { description: rx }, { tags: rx }];
  }

  const total = await Product.countDocuments(query);
  const items = await Product.find(query)
    .sort({ isTrending: -1, rating: -1, reviews: -1 })
    .skip(skip)
    .limit(limit);
  return ok(res, { products: items.map(cleanImages) }, listMeta(total, page, limit));
});

/** GET /api/v1/shop/products/:id */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.id, ...VISIBLE_APPROVAL });
  if (!product) throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  return ok(res, { product: cleanImages(product) });
});

/** GET /api/v1/shop/popular */
const listPopular = asyncHandler(async (req, res) =>
  listProductsByFlag({ isTrending: true }, req, res));

/** GET /api/v1/shop/offers */
const listOffers = asyncHandler(async (req, res) =>
  listProductsByFlag({ isSpecialOffer: true }, req, res));

async function listProductsByFlag(flag, req, res) {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12 });
  const total = await Product.countDocuments({ ...flag, ...VISIBLE_APPROVAL });
  const items = await Product.find({ ...flag, ...VISIBLE_APPROVAL }).sort({ rating: -1, reviews: -1 }).skip(skip).limit(limit);
  return ok(res, { products: items.map(cleanImages) }, listMeta(total, page, limit));
}

/** GET /api/v1/shop/brands — maker tiles + live product counts. */
const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ active: true }).sort({ featured: -1, sortOrder: 1, name: 1 });
  const counts = await Product.aggregate([
    { $match: { ...VISIBLE_APPROVAL, brand: { $nin: [null, ''] } } },
    { $group: { _id: '$brand', items: { $sum: 1 } } },
  ]);
  const byName = new Map(counts.map((row) => [row._id, row.items]));
  return ok(res, {
    brands: brands.map((brand) => {
      const json = brand.toJSON();
      if (json.image) json.image = toAppImage(json.image);
      return { ...json, items: byName.get(brand.name) || 0 };
    }),
  });
});

/** GET /api/v1/shop/brands/:id — brand + live products + store snapshots. */
const getBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findOne({ id: req.params.id, active: true });
  if (!brand) throw ApiError.notFound('Brand not found', 'BRAND_NOT_FOUND');
  const products = await Product.find({ brand: brand.name, ...VISIBLE_APPROVAL }).sort({ rating: -1, reviews: -1 });
  const json = brand.toJSON();
  if (json.image) json.image = toAppImage(json.image);
  const storeIds = [...new Set(products.map((p) => p.storeId).filter(Boolean))];
  const stores = {};
  if (storeIds.length) {
    const docs = await ShopStore.find({ id: { $in: storeIds } });
    for (const doc of docs) {
      stores[doc.id] = {
        id: doc.id,
        name: doc.name,
        deliveryFee: doc.deliveryFee || 0,
        minOrder: doc.minOrder || 0,
        etaMinutes: doc.deliveryMins || 40,
      };
    }
  }
  return ok(res, { brand: json, products: products.map(cleanImages), stores });
});

module.exports = {
  listBrands,
  getBrand,
  listCategories,
  getCategory,
  getCategoryProducts,
  listStores,
  getStore,
  getStoreProducts,
  listProducts,
  getProduct,
  listPopular,
  listOffers,
};
