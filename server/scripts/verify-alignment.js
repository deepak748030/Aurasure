'use strict';

/**
 * Verifies that the app's mock data and the server's seed data stay perfectly
 * in lockstep, and that food/shop data never bleeds into each other.
 *
 *   1. Same entity ids everywhere (set equality).
 *   2. Referential integrity (items → restaurants, products → stores,
 *      categories, vibes, banners → targets).
 *   3. Module separation: no id is shared between food and shop; banner
 *      `module` values match the app exactly.
 *
 * Run: node scripts/verify-alignment.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP_DATA = path.join(ROOT, 'AurasureApp', 'src', 'data');
const SEED = path.join(ROOT, 'server', 'src', 'seed', 'data.js');

const seedSrc = fs.readFileSync(SEED, 'utf8');
const foodSrc = fs.readFileSync(path.join(APP_DATA, 'food.ts'), 'utf8');
const shopSrc = fs.readFileSync(path.join(APP_DATA, 'shop.ts'), 'utf8');
const mockSrc = fs.readFileSync(path.join(APP_DATA, 'mock.ts'), 'utf8');

const ids = (src) => [...src.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
const refIds = (src, field) => [...src.matchAll(new RegExp(`${field}:\\s*'([^']+)'`, 'g'))].map((m) => m[1]);
const uniq = (arr) => [...new Set(arr)];
const asSet = (arr) => new Set(arr);

// App source of truth
const appFood = {
  categories: uniq(ids(foodSrc).filter((x) => x.startsWith('cat_'))),
  vibes: uniq(ids(foodSrc).filter((x) => x.startsWith('vibe_'))),
  restaurants: uniq(ids(foodSrc).filter((x) => x.startsWith('r_'))),
  items: uniq(ids(foodSrc).filter((x) => /^f\d+$/.test(x))),
  restaurantRefs: refIds(foodSrc, 'restaurantId'),
  vibeRefs: refIds(foodSrc, 'vibeId'),
  categoryRefs: [...foodSrc.matchAll(/categoryIds:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])),
};

const appShop = {
  categories: uniq(ids(shopSrc).filter((x) => x.startsWith('sc_'))),
  stores: uniq(ids(shopSrc).filter((x) => x.startsWith('s_'))),
  products: uniq(ids(shopSrc).filter((x) => /^p\d+$/.test(x))),
  storeRefs: refIds(shopSrc, 'storeId'),
  categoryRefs: refIds(shopSrc, 'categoryId'),
};

const seed = {
  foodCategories: uniq(ids(seedSrc).filter((x) => x.startsWith('cat_'))),
  vibes: uniq(ids(seedSrc).filter((x) => x.startsWith('vibe_'))),
  restaurants: uniq(ids(seedSrc).filter((x) => x.startsWith('r_'))),
  items: uniq(ids(seedSrc).filter((x) => /^f\d+$/.test(x))),
  shopCategories: uniq(ids(seedSrc).filter((x) => x.startsWith('sc_'))),
  stores: uniq(ids(seedSrc).filter((x) => x.startsWith('s_'))),
  products: uniq(ids(seedSrc).filter((x) => /^p\d+$/.test(x))),
  banners: [...seedSrc.matchAll(/id:\s*'(b\d+)',\s*module:\s*'(food|shop)'/g)].map((m) => ({ id: m[1], module: m[2] })),
};

let failed = 0;
const p = (name, cond, extra = '') => {
  if (cond) console.log(`  ✔ ${name}${extra ? ` (${extra})` : ''}`);
  else {
    console.error(`  ✘ FAIL: ${name}${extra ? ` (${extra})` : ''}`);
    failed += 1;
  }
};

const cmp = (name, a, b) => {
  const sa = asSet(a);
  const sb = asSet(b);
  const onlyA = a.filter((x) => !sb.has(x));
  const onlyB = b.filter((x) => !sa.has(x));
  p(name, onlyA.length === 0 && onlyB.length === 0, onlyA.length ? `app-only: ${onlyA.slice(0, 5).join(', ')}` : onlyB.length ? `seed-only: ${onlyB.slice(0, 5).join(', ')}` : `${b.length} ids`);
};
const unionSize = (arrays) => new Set(arrays.flat()).size;

console.log('\n[alignment] id sets — app mock  vs  server seed\n');

cmp('food categories', appFood.categories, seed.foodCategories);
cmp('food vibes', appFood.vibes, seed.vibes);
cmp('restaurants', appFood.restaurants, seed.restaurants);
cmp('food items', appFood.items, seed.items);
cmp('shop categories', appShop.categories, seed.shopCategories);
cmp('shop stores', appShop.stores, seed.stores);
cmp('shop products', appShop.products, seed.products);

console.log('\n[alignment] counts\n');
p('seed: 5 food categories', seed.foodCategories.length === 5, `${seed.foodCategories.length}`);
p('seed: 6 vibes', seed.vibes.length === 6, `${seed.vibes.length}`);
p('seed: 9 restaurants', seed.restaurants.length === 9, `${seed.restaurants.length}`);
p('seed: 33 food items', seed.items.length === 33, `${seed.items.length}`);
p('seed: 10 shop categories', seed.shopCategories.length === 10, `${seed.shopCategories.length}`);
p('seed: 9 shop stores', seed.stores.length === 9, `${seed.stores.length}`);
p('seed: 24 products', seed.products.length === 24, `${seed.products.length}`);
p('seed: 6 banners (2 food / 4 shop)', seed.banners.length === 6 && seed.banners.filter((b) => b.module === 'food').length === 2, seed.banners.map((b) => `${b.id}:${b.module}`).join(' '));

const appBannerModules = [...mockSrc.matchAll(/id:\s*'(b\d+)',\s*module:\s*'(food|shop)'/g)].map((m) => ({ id: m[1], module: m[2] }));
p('banner modules match app mock 1:1', JSON.stringify(seed.banners.sort((a, b) => a.id.localeCompare(b.id))) === JSON.stringify(appBannerModules.sort((a, b) => a.id.localeCompare(b.id))));

console.log('\n[alignment] referential integrity (seed)\n');

const foodChunk = seedSrc.slice(seedSrc.indexOf('const foodItems'), seedSrc.indexOf('const shopCategories'));
const shopChunk = seedSrc.slice(seedSrc.indexOf('const shopCategories'), seedSrc.indexOf('const banners'));

const itemRestRefs = refIds(foodChunk, 'restaurantId');
const itemVibeRefs = refIds(foodChunk, 'vibeId');
const itemCatRefs = [...foodChunk.matchAll(/categoryIds:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
const storeCatRefs = [...shopChunk.matchAll(/categoryIds:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
const productStoreRefs = refIds(shopChunk, 'storeId');
const productCatRefs = refIds(shopChunk, 'categoryId');

p('every food item has a restaurantId', itemRestRefs.length === seed.items.length, `${itemRestRefs.length}/${seed.items.length}`);
p('every food item restaurantId resolves', uniq(itemRestRefs).every((r) => asSet(seed.restaurants).has(r)));
p('every food item vibeId resolves', uniq(itemVibeRefs).filter(Boolean).every((v) => asSet(seed.vibes).has(v)));
p('every food item categoryIds resolve', itemCatRefs.every((c) => asSet(seed.foodCategories).has(c)));
p('every array categoryId in food resolves', [...foodChunk.matchAll(/categoryIds:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])).every((c) => asSet(seed.foodCategories).has(c)));

p('every product storeId resolves', uniq(productStoreRefs).every((s) => asSet(seed.stores).has(s)));
p('every product categoryId resolves', uniq(productCatRefs).every((c) => asSet(seed.shopCategories).has(c)));
p('every store categoryIds resolve', storeCatRefs.every((c) => asSet(seed.shopCategories).has(c)));

for (const b of seed.banners) {
  const chunk = seedSrc.split(`{ id: '${b.id}',`)[1]?.split('\n')[0] ?? '';
  const toProduct = chunk.match(/productId:\s*'([^']+)'/);
  const toStore = chunk.match(/storeId:\s*'([^']+)'/);
  const toCategory = chunk.match(/categoryId:\s*'([^']+)'/);
  // Food banners use `store` target meaning a restaurant (matches the app's
  // FoodHome openBanner → navigate('Restaurant')).
  const storePool = b.module === 'food' ? asSet(seed.restaurants) : asSet(seed.stores);
  const ok =
    (!toProduct || asSet(seed.products).has(toProduct[1])) &&
    (!toStore || storePool.has(toStore[1])) &&
    (!toCategory || asSet(seed.shopCategories).has(toCategory[1]));
  p(`banner ${b.id} target resolves (${b.module})`, ok);
}

console.log('\n[alignment] module separation (no collapse)\n');

const foodIds = [...appFood.categories, ...appFood.vibes, ...appFood.restaurants, ...appFood.items];
const shopIds = [...appShop.categories, ...appShop.stores, ...appShop.products];
p('no id shared between food and shop (app)', unionSize([foodIds, shopIds]) === foodIds.length + shopIds.length, `${foodIds.length} food + ${shopIds.length} shop = ${unionSize([foodIds, shopIds])} unique`);
p(
  'no id shared between food and shop (seed)',
  unionSize([seed.foodCategories, seed.vibes, seed.restaurants, seed.items, seed.shopCategories, seed.stores, seed.products]) ===
    seed.foodCategories.length + seed.vibes.length + seed.restaurants.length + seed.items.length + seed.shopCategories.length + seed.stores.length + seed.products.length,
);
p('seed food item count matches app', seed.items.length === appFood.items.length, `${seed.items.length}`);
p('seed product count matches app', seed.products.length === appShop.products.length, `${seed.products.length}`);

console.log(failed ? '\n[alignment] FAILURES PRESENT ❌' : '\n[alignment] ALL CHECKS PASSED ✅');
process.exit(failed ? 1 : 0);
