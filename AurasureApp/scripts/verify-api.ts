/**
 * Verifies the app's API layer (src/api/*) against:
 *  1. A fixture server that speaks the exact server envelope - confirms the
 *     mapping functions produce app-shaped data.
 *  2. A dead port / the real local server - confirms failures throw
 *     ApiError so the mock fallback kicks in.
 *
 *   npx tsx scripts/verify-api.ts
 */
import http from 'node:http';
import { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';

const FIXTURE_PORT = 5123;

const img = (seed: string) => ({ kind: 'uri', uri: `https://picsum.photos/seed/${seed}/800/560` });

const FIXTURES = {
  banners: [
    { id: 'b1', module: 'food', title: 'Food fest', subtitle: '50% off', badge: 'NEW', image: img('b1'), target: { kind: 'search' } },
    { id: 'b2', module: 'shop', title: 'Electronics sale', subtitle: 'Up to 40%', badge: 'SALE', image: img('b2'), target: { kind: 'category', categoryId: 'sc_audio' } },
  ],
  foodCategories: [
    { id: 'cat_biryani', name: 'Biryani', icon: 'utensils', image: img('biryani') },
    { id: 'cat_pizza', name: 'Pizza', icon: 'pizza', image: img('pizza') },
  ],
  vibes: [{ id: 'vibe_litti', name: 'Litti Chokha', tagline: "Bihar's Dish", image: img('litti'), from: '#7B2FF7', to: '#B23FE0' }],
  restaurants: [
    { id: 'r_aurora', name: 'Aurora Bistro', cuisines: ['Continental'], rating: 4.7, reviews: 2840, deliveryTime: 24, deliveryFee: 19, minOrder: 149, distanceKm: 1.2, priceForTwo: 650, promo: '50% OFF', isVeg: false, isNew: false, isNewlyJoined: false, isPopular: true, line: 'Shankar Nagar', offer: 'Free delivery', cover: img('r1'), tags: ['Bestseller'], categoryIds: ['cat_biryani'] },
    { id: 'r_pizzarep', name: 'Pizza Republic', cuisines: ['Italian'], rating: 4.4, reviews: 3620, deliveryTime: 27, deliveryFee: 25, minOrder: 249, distanceKm: 1.8, priceForTwo: 690, isVeg: false, isNew: true, isNewlyJoined: true, isPopular: false, line: 'Pandri', offer: '', cover: img('r2'), tags: [], categoryIds: ['cat_pizza'] },
  ],
  items: [
    { id: 'f1', restaurantId: 'r_aurora', name: 'Aurora Classic Burger', description: 'Sesame bun', price: 249, mrp: 320, rating: 4.7, reviews: 820, prepTime: 18, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_litti', tags: ['Bestseller'], image: img('f1'), categoryIds: ['cat_biryani'] },
    { id: 'f2', restaurantId: 'r_pizzarep', name: 'Truffle Margherita', description: 'Wood-fired', price: 329, mrp: 399, rating: 4.6, reviews: 540, prepTime: 22, isVeg: true, isPopular: true, isSpecial: false, tags: [], image: img('f2'), categoryIds: ['cat_pizza'] },
    { id: 'f3', restaurantId: 'r_aurora', name: 'Butter Croissant', description: 'Flaky', price: 119, mrp: 149, rating: 4.8, reviews: 410, prepTime: 10, isVeg: true, isPopular: false, isSpecial: false, tags: [], image: null, categoryIds: ['cat_biryani'] },
  ],
  shopCategories: [
    { id: 'sc_audio', name: 'Audio', icon: 'headphones', tagline: 'Sound you love', image: img('audio') },
    { id: 'sc_fashion', name: 'Fashion', icon: 'shirt', tagline: 'Style up', image: img('fashion') },
  ],
  stores: [
    { id: 's_solace', name: 'Solace Eyewear', brand: 'Solace', road: 'GE Road', house: '14', city: 'Raipur', pin: '492001', rating: 4.6, reviews: 120, deliveryMins: 30, deliveryFee: 20, minOrder: 499, promo: '35% OFF', isNiche: true, isPopular: true, tags: ['Eyewear'], categoryIds: ['sc_fashion'], cover: img('s1') },
    { id: 's_nova', name: 'Nova Audio', brand: 'Nova', road: 'Pandri', house: '9', city: 'Raipur', pin: '492001', rating: 4.4, reviews: 80, deliveryMins: 40, deliveryFee: 0, minOrder: 999, isNiche: false, isPopular: false, tags: ['Audio'], categoryIds: ['sc_audio'], cover: img('s2') },
  ],
  products: [
    { id: 'p1', storeId: 's_solace', name: 'Aura Sunglasses', brand: 'Aura', description: 'UV 400', price: 1499, mrp: 2299, rating: 4.5, reviews: 210, inStock: true, isNew: false, isTrending: true, isBestseller: true, isSpecialOffer: true, deliveryMins: 30, tags: ['Sunglasses'], colors: ['#000000'], image: img('p1'), categoryId: 'sc_fashion' },
    { id: 'p2', storeId: 's_nova', name: 'Aura ANC Headphones', brand: 'Aura', description: 'ANC 40h', price: 4999, mrp: 6999, rating: 4.8, reviews: 340, inStock: true, isNew: true, isTrending: true, isBestseller: false, isSpecialOffer: false, deliveryMins: 40, tags: ['ANC'], colors: ['#101010'], categoryId: 'sc_audio' },
    { id: 'p3', storeId: 's_solace', name: 'Aura Minimal Watch', brand: 'Aura', description: 'Minimal', price: 2999, mrp: 3999, rating: 4.6, reviews: 150, inStock: true, isNew: false, isTrending: false, isBestseller: true, isSpecialOffer: true, deliveryMins: 30, tags: ['Watch'], colors: ['#FFFFFF'], categoryId: 'sc_fashion' },
  ],
  user: {
    id: 'usr_1',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '9876543210',
    avatar: null,
    wallet: 250,
    addresses: [{ id: 'adr_1', label: 'Home', line: '402 Aurora Heights', city: 'Raipur', pin: '492001', isDefault: true }],
  },
  order: {
    id: 'ord_1',
    code: 'AUR-FD-20517',
    module: 'food',
    placedAt: '2026-08-27T19:42:00.000Z',
    status: 'out_for_delivery',
    items: [{ id: 'li1', refId: 'f1', kind: 'food', name: 'Aurora Classic Burger', meta: 'Medium', unitPrice: 249, qty: 2, image: img('f1') }],
    itemTotal: 498,
    deliveryFee: 0,
    discount: 0,
    total: 498,
    etaMinutes: 12,
    address: '402 Aurora Heights, Raipur',
  },
};

const ok = (data: unknown) => JSON.stringify({ success: true, data });
const fail = (status: number, code: string, message: string, data = {}) => ({
  status,
  body: JSON.stringify({ success: false, error: { code, message, details: data } }),
});

function startFixtureServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://x');
      const p = url.pathname;
      res.setHeader('Content-Type', 'application/json');

      // Auth
      if (p === '/api/v1/auth/login' && req.method === 'POST') {
        res.end(ok({ token: 'fixture-token', user: FIXTURES.user }));
        return;
      }
      // Account
      if (p === '/api/v1/users/me') {
        res.end(ok({ user: FIXTURES.user }));
        return;
      }
      if (p === '/api/v1/orders' && req.method === 'GET') {
        res.end(ok({ orders: [FIXTURES.order], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } }));
        return;
      }
      if (p === '/api/v1/orders/ord_1') {
        res.end(ok({ order: FIXTURES.order }));
        return;
      }
      if (p === '/api/v1/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          const input = JSON.parse(body);
          // Server reprices from its catalogue and never trusts a client
          // `discount` - coupons are optional and applied server-side only.
          const total = input.items.reduce((s: number, i: any) => s + i.unitPrice * i.qty, 0) + (input.deliveryFee ?? 0);
          res.end(ok({ order: { ...FIXTURES.order, id: 'ord_new', total, itemTotal: total - (input.deliveryFee ?? 0), items: input.items, address: input.address }, wallet: 250, loyaltyPoints: 5 }));
        });
        return;
      }

      // Banners
      if (p === '/api/v1/banners') {
        const module = url.searchParams.get('module');
        res.end(ok({ banners: FIXTURES.banners.filter((b) => b.module === module) }));
        return;
      }

      // Food
      if (p === '/api/v1/food/categories') { res.end(ok({ categories: FIXTURES.foodCategories })); return; }
      if (p === '/api/v1/food/vibes') { res.end(ok({ vibes: FIXTURES.vibes })); return; }
      if (/^\/api\/v1\/food\/restaurants\/[^/]+$/.test(p)) {
        const id = p.split('/').pop()!;
        const restaurant = FIXTURES.restaurants.find((r) => r.id === id);
        if (!restaurant) { res.statusCode = 404; res.end(fail(404, 'RESTAURANT_NOT_FOUND', 'not found').body); return; }
        res.end(ok({ restaurant, items: FIXTURES.items.filter((i) => i.restaurantId === id) }));
        return;
      }
      if (p === '/api/v1/food/restaurants') { res.end(ok({ restaurants: FIXTURES.restaurants, meta: { total: 2 } })); return; }
      if (p === '/api/v1/food/new-stores') { res.end(ok({ restaurants: FIXTURES.restaurants.filter((r) => r.isNew) })); return; }
      if (p === '/api/v1/food/popular') { res.end(ok({ items: FIXTURES.items.filter((i) => i.isPopular) })); return; }
      if (p === '/api/v1/food/offers') { res.end(ok({ items: FIXTURES.items.filter((i) => i.isSpecial) })); return; }
      if (p.startsWith('/api/v1/food/vibes/')) {
        res.end(ok({ vibe: FIXTURES.vibes[0], items: FIXTURES.items.filter((i) => i.vibeId === 'vibe_litti') }));
        return;
      }
      if (p === '/api/v1/food/items') { res.end(ok({ items: FIXTURES.items })); return; }

      // Shop
      if (p === '/api/v1/shop/categories') { res.end(ok({ categories: FIXTURES.shopCategories })); return; }
      if (/^\/api\/v1\/shop\/categories\/[^/]+\/products$/.test(p)) {
        const id = p.split('/')[5];
        res.end(ok({ category: FIXTURES.shopCategories.find((c) => c.id === id), products: FIXTURES.products.filter((x) => x.categoryId === id) }));
        return;
      }
      if (/^\/api\/v1\/shop\/categories\/[^/]+$/.test(p)) {
        const id = p.split('/').pop()!;
        res.end(ok({ category: FIXTURES.shopCategories.find((c) => c.id === id), itemCount: FIXTURES.products.filter((x) => x.categoryId === id).length }));
        return;
      }
      if (p === '/api/v1/shop/stores') {
        const recommended = url.searchParams.get('recommended');
        const niche = url.searchParams.get('niche');
        let list = FIXTURES.stores;
        if (niche === 'true') list = list.filter((s) => s.isNiche);
        if (recommended === 'true') list = [...list].sort((a, b) => b.rating - a.rating);
        res.end(ok({ stores: list }));
        return;
      }
      if (/^\/api\/v1\/shop\/stores\/[^/]+$/.test(p)) {
        const id = p.split('/').pop()!;
        const store = FIXTURES.stores.find((s) => s.id === id);
        if (!store) { res.statusCode = 404; res.end(fail(404, 'STORE_NOT_FOUND', 'not found').body); return; }
        res.end(ok({ store, products: FIXTURES.products.filter((x) => x.storeId === id) }));
        return;
      }
      if (p === '/api/v1/shop/products') { res.end(ok({ products: FIXTURES.products })); return; }
      if (/^\/api\/v1\/shop\/products\/[^/]+$/.test(p)) {
        const id = p.split('/').pop()!;
        const product = FIXTURES.products.find((x) => x.id === id);
        if (!product) { res.statusCode = 404; res.end(fail(404, 'PRODUCT_NOT_FOUND', 'not found').body); return; }
        res.end(ok({ product }));
        return;
      }
      if (p === '/api/v1/shop/popular') { res.end(ok({ products: FIXTURES.products.filter((x) => x.isTrending) })); return; }
      if (p === '/api/v1/shop/offers') { res.end(ok({ products: FIXTURES.products.filter((x) => x.isSpecialOffer) })); return; }

      // Search
      if (p === '/api/v1/search') {
        const q = url.searchParams.get('q') ?? '';
        const module = url.searchParams.get('module') === 'shop' ? 'shop' : 'food';
        if (module === 'food') {
          res.end(ok({ query: q, items: FIXTURES.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())), restaurants: FIXTURES.restaurants.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())), products: [], stores: [] }));
        } else {
          res.end(ok({ query: q, items: [], restaurants: [], products: FIXTURES.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), stores: FIXTURES.stores.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) }));
        }
        return;
      }

      res.statusCode = 404;
      res.end(fail(404, 'ROUTE_NOT_FOUND', `no fixture for ${req.method} ${p}`).body);
    });
    server.listen(FIXTURE_PORT, '127.0.0.1', () => resolve(server));
  });
}

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✘ FAIL: ${name}`);
  }
};

async function main() {
  // ── Phase 1: fixture server (success path) ─────────────────────────────
  const fixture = await startFixtureServer();
  process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${FIXTURE_PORT}`;
  process.env.EXPO_PUBLIC_API_PHONE = '9876543210';
  process.env.EXPO_PUBLIC_API_PASSWORD = 'aurasure123';

  const { fetchFoodHome } = await import('../src/api/food');
  const { fetchShopHome, fetchProduct, fetchShopCategory } = await import('../src/api/shop');
  const { fetchMe, fetchOrders, placeOrder } = await import('../src/api/account');
  const { fetchFoodSearch, fetchRestaurant, fetchFoodSeeAll } = await import('../src/api/food');
  const { fetchShopSearch, fetchShopSeeAll } = await import('../src/api/shop');

  console.log('\nPhase 1 · fixture server (server-connected mapping)\n');

  const food = await fetchFoodHome();
  check('food home: banners only food module', food.banners.length === 1 && food.banners[0]!.module === 'food');
  check('food home: categories/vibes/restaurants mapped', food.categories.length === 2 && food.vibes.length === 1 && food.restaurants.length === 2);
  check('food home: popular/offers/newStores mapped', food.popular.length === 2 && food.offers.length === 1 && food.newStores.length === 1);
  check('food home: user profile mapped', food.user?.name === 'Aarav Sharma' && food.user.addresses.length === 1);
  check('food home: NO shop payload (no collapse)', !('products' in food) && !('stores' in food) && !('counts' in food));

  const restaurant = await fetchRestaurant('r_aurora');
  check('restaurant: detail + items + categories', restaurant.restaurant?.id === 'r_aurora' && restaurant.items.length === 2 && restaurant.categories.length === 2);
  check('restaurant: items are FOOD only (no products)', restaurant.items.every((i) => 'restaurantId' in i && !('storeId' in i)));

  const shop = await fetchShopHome();
  check('shop home: banners only shop module', shop.banners.length === 1 && shop.banners[0]!.module === 'shop');
  check('shop home: counts built', shop.counts.store['s_solace'] === 2 && shop.counts.category['sc_fashion'] === 2);
  check('shop home: recommended + niche + popular + offers', shop.recommended.length === 2 && shop.niche.length === 1 && shop.popular.length === 2 && shop.offers.length === 2);
  check('shop home: NO food payload (no collapse)', !('vibes' in shop) && !('items' in shop) && !('categories' in shop && shop.categories[0]?.id.startsWith('cat_')));

  const category = await fetchShopCategory('sc_fashion');
  check('shop category: products + category', category.category?.id === 'sc_fashion' && category.items.length === 2);

  const product = await fetchProduct('p1');
  check('product: product + seller store', product.product?.id === 'p1' && product.store?.id === 's_solace');

  const me = await fetchMe();
  check('fetchMe maps user', me?.name === 'Aarav Sharma');

  const orders = await fetchOrders('food');
  check('orders list', orders.length === 1 && orders[0]!.code === 'AUR-FD-20517');

  const created = await placeOrder({
    module: 'food',
    items: [{ id: 'x1', refId: 'f1', kind: 'food', name: 'Burger', unitPrice: 249, qty: 2, image: null }],
    deliveryFee: 10,
    address: 'Home, 402 Aurora Heights, Raipur',
  });
  // Server reprices from the catalogue (f1 = ₹249) and applies no client
  // discount - coupon codes are the only way to discount an order now.
  check('place order repriced + total recomputed by server', created.order.itemTotal === 498 && created.order.total === 508);

  const foodSearch = await fetchFoodSearch('burger');
  check('food search hits /search?module=food', foodSearch.items.length === 1 && foodSearch.items[0]!.name.includes('Burger'));
  check('food search: NO shop results (no collapse)', foodSearch.restaurants.every((r) => !('brand' in r)));
  const shopSearch = await fetchShopSearch('aura');
  check('shop search hits /search?module=shop', shopSearch.products.length === 3 && shopSearch.stores.length === 0);
  check('shop search: NO food results (no collapse)', shopSearch.products.every((p) => !('restaurantId' in p)));

  const seeAll = await fetchShopSeeAll('recommended');
  check('shop see-all stores have counts', seeAll.kind === 'shopStores' && seeAll.countByStore['s_solace'] === 2);

  const foodSeeAll = await fetchFoodSeeAll('foodPopular');
  check('food see-all returns food items only', foodSeeAll.kind === 'foodItems' && foodSeeAll.data.every((i) => 'restaurantId' in i));
  const shopSeeAllProducts = await fetchShopSeeAll('popular');
  check('shop see-all returns shop products only', shopSeeAllProducts.kind === 'shopProducts' && shopSeeAllProducts.data.every((p) => 'storeId' in p));

  const foodModule = await import('../src/api/food');
  const shopModule = await import('../src/api/shop');
  const foodCatalog = await foodModule.fetchFoodCatalog();
  const shopCatalog = await shopModule.fetchShopCatalog();
  check('food catalog: every item has restaurantId, none has storeId', foodCatalog.length === 3 && foodCatalog.every((i) => 'restaurantId' in i && !('storeId' in i)));
  check('shop catalog: every product has storeId, none has restaurantId', shopCatalog.length === 3 && shopCatalog.every((p) => 'storeId' in p && !('restaurantId' in p)));

  // ── Phase 2: unreachable server (fallback path) ─────────────────────────
  console.log('\nPhase 2 · unreachable server (mock fallback path)\n');
  process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:59999';
  const { apiGet, ApiError } = await import('../src/api/client');

  try {
    await apiGet('/health');
    check('dead server throws ApiError', false);
  } catch (err) {
    check('dead server throws ApiError', err instanceof ApiError && err.code === 'NETWORK_ERROR' && err.status === 0);
  }

  // ── Phase 2b: timeout + external abort (production request hardening) ────
  const slow = http.createServer(() => {
    /* never responds - used to assert the client's own deadlines */
  });
  await new Promise<void>((resolve) => slow.listen(5124, '127.0.0.1', resolve));
  process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:5124';
  const { apiGet: slowApiGet } = await import('../src/api/client');

  try {
    await slowApiGet('/never', { timeoutMs: 150 });
    check('request times out with ApiError TIMEOUT', false);
  } catch (err) {
    check('request times out with ApiError TIMEOUT', err instanceof ApiError && err.code === 'TIMEOUT');
  }

  const external = new AbortController();
  const aborted = slowApiGet('/never', { signal: external.signal }).then(
    () => false,
    (err: unknown) => err instanceof ApiError && err.code === 'ABORTED',
  );
  external.abort();
  check('external AbortSignal cancels the fetch (ABORTED)', await aborted);
  await new Promise<void>((resolve) => slow.close(() => resolve()));

  // ── Phase 3: live local server (DB down → graceful 503 ApiError) ────────
  process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:5000';
  const { fetchFoodHome: liveFetch } = await import('../src/api/food');
  try {
    await liveFetch();
    check('local server without DB → cannot complete (unexpected pass)', false);
  } catch (err) {
    check('local server without DB throws ApiError (503/network)', err instanceof ApiError && err.status !== 200);
  }

  fixture.close();
  console.log(`\n${failed === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failed} CHECK(S) FAILED`} (${passed} passed)\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verify-api crashed:', err);
  process.exit(1);
});
