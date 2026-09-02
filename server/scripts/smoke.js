'use strict';

/**
 * End-to-end smoke test against a real MongoDB.
 *
 * Uses `mongodb-memory-server` (bundled) when the binary can be downloaded,
 * OR a running local MongoDB when you set:
 *   SMOKE_MONGODB_URI=mongodb://127.0.0.1:27017/aurasure-smoke
 *
 * Run: npm run smoke
 */
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const SERVER_ROOT = path.join(__dirname, '..');
const SMOKE_PORT = 5099;
const EXTERNAL_URI = process.env.SMOKE_MONGODB_URI;

async function startMongo() {
  if (EXTERNAL_URI) {
    console.log('[smoke] using external MongoDB:', EXTERNAL_URI);
    return { uri: EXTERNAL_URI, stop: async () => {} };
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  console.log('[smoke] in-memory MongoDB up:', mongod.getUri());
  return { uri: mongod.getUri(), stop: async () => mongod.stop() };
}

function get(port, reqPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port, path: reqPath, method: opts.method || 'GET', headers: opts.headers },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(body || '{}');
          } catch {
            /* not json */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.end(opts.data ? JSON.stringify(opts.data) : undefined);
  });
}

async function main() {
  const mongo = await startMongo();

  // Seed with the test database.
  execFileSync(process.execPath, ['src/seed.js'], {
    cwd: SERVER_ROOT,
    env: { ...process.env, MONGODB_URI: mongo.uri, SEED_USER_PHONE: '9999999999' },
    stdio: 'inherit',
  });

  const { connectDB, disconnectDB } = require(path.join(SERVER_ROOT, 'src/config/db'));
  const createApp = require(path.join(SERVER_ROOT, 'src/app'));
  await connectDB();

  const server = createApp().listen(SMOKE_PORT);
  const api = (p, o) => get(SMOKE_PORT, `/api/v1${p}`, o);

  let failed = 0;
  const check = (name, cond) => {
    console.log(cond ? `  ✔ ${name}` : `  ✘ FAIL: ${name}`);
    if (!cond) failed += 1;
  };
  const json = { 'Content-Type': 'application/json' };

  console.log('\n[smoke] running checks...\n');

  let r = await api('/health');
  check('health ok while db connected', r.status === 200 && r.body.data.status === 'ok');

  r = await api('/banners?module=food');
  check('food banners (2)', r.status === 200 && r.body.data.banners.length === 2);

  r = await api('/food/categories');
  check('food categories (5)', r.status === 200 && r.body.data.categories.length === 5);

  r = await api('/food/vibes');
  check('food vibes (6)', r.status === 200 && r.body.data.vibes.length === 6);

  r = await api('/food/restaurants?filter=popular');
  check('popular restaurants', r.status === 200 && r.body.data.restaurants.length >= 5);

  r = await api('/food/restaurants/r_spicy');
  check('restaurant detail + items', r.status === 200 && r.body.data.items.length === 2);

  r = await api('/food/items?popular=true&limit=6');
  check('popular items (6)', r.status === 200 && r.body.data.items.length === 6);

  r = await api('/food/offers');
  check('food offers', r.status === 200 && r.body.data.items.length > 0);

  r = await api('/food/vibes/vibe_litti/items');
  check('vibe items (f32)', r.status === 200 && r.body.data.items[0]?.id === 'f32');

  r = await api('/shop/categories/sc_sunglasses/products');
  check('sunglasses products (6)', r.status === 200 && r.body.data.products.length === 6);

  r = await api('/shop/stores?recommended=true');
  check('recommended stores (9, no dupes)', r.status === 200 && r.body.data.stores.length === 9);

  r = await api('/shop/stores/s_solace');
  check('store detail + products', r.status === 200 && r.body.data.products.length === 6);

  r = await api('/shop/products?trending=true');
  check('trending products (6)', r.status === 200 && r.body.data.products.length === 6);

  r = await api('/search?q=biryani&module=food');
  check('search food', r.status === 200 && (r.body.data.items.length > 0 || r.body.data.restaurants.length > 0));

  // Auth + users + orders (JWT)
  r = await api('/auth/register', { method: 'POST', data: { name: 'Test User', phone: '9876500001', password: 'secret123' }, headers: json });
  check('register → token', r.status === 201 && Boolean(r.body.data.token));
  const token = r.body.data.token;

  r = await api('/auth/login', { method: 'POST', data: { phone: '9999999999', password: 'aurasure123' }, headers: json });
  check('demo user login', r.status === 200 && Boolean(r.body.data.token));

  r = await api('/users/me/addresses', { method: 'POST', data: { label: 'Home', line: 'Test Lane 1', city: 'Raipur', pin: '492001' }, headers: { ...json, Authorization: `Bearer ${token}` } });
  check('add address', r.status === 201);

  r = await api('/users/me/addresses', { headers: { Authorization: `Bearer ${token}` } });
  check('list addresses', r.status === 200 && r.body.data.addresses.length === 1);

  r = await api('/users/me/favorites', { method: 'PUT', data: { module: 'shop', refId: 'p10', liked: true }, headers: { ...json, Authorization: `Bearer ${token}` } });
  check('add favorite', r.status === 200 && r.body.data.favorites.length === 1);

  r = await api('/orders', { method: 'POST', data: { module: 'shop', items: [{ id: 'x1', refId: 'p10', kind: 'shop', name: 'Aura ANC Headphones', unitPrice: 4999, qty: 1 }], deliveryFee: 0, discount: 2000, address: 'Test Lane 1, Raipur' }, headers: { ...json, Authorization: `Bearer ${token}` } });
  check('place order (total recomputed 2999)', r.status === 201 && r.body.data.order.total === 2999);

  r = await api('/orders', { headers: { Authorization: `Bearer ${token}` } });
  check('list orders', r.status === 200 && r.body.data.orders.length >= 1);

  await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
  await mongo.stop();

  if (failed) {
    console.error(`\n[smoke] ${failed} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\n[smoke] ALL CHECKS PASSED ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[smoke] ERROR:', err);
  process.exit(1);
});
