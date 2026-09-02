#!/usr/bin/env node
/**
 * DEV-ONLY mock of the Aurasure Node.js API.
 *
 * The real backend lives in `../server` and needs MongoDB. When you just want
 * to look at the admin panel (or work on the UI on a machine without Mongo),
 * run this instead: it speaks the exact same contract — `/api/v1/...`,
 * `{ success, data, meta }` envelopes, JWT-ish bearer tokens and every
 * `/admin/...` route the panel calls — but keeps everything in memory.
 *
 *   npm run dev:mock      # http://127.0.0.1:5000
 *
 * Nothing in `server/` is touched or imported. For real work point
 * ADMIN_API_URL at the actual Express server.
 */
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const PORT = Number(process.env.MOCK_PORT || 5000);
const app = express();
app.use(express.json({ limit: '1mb' }));

/* ------------------------------- utilities ------------------------------ */

const ok = (res, data, meta) => res.json(meta ? { success: true, data, meta } : { success: true, data });
const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });
const id = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
const daysAgo = (d, h = 10) => new Date(Date.now() - d * 86400000 + h * 3600000).toISOString();
const pick = (arr, i) => arr[i % arr.length];
const img = (seed) => ({ kind: 'uri', uri: `https://picsum.photos/seed/${seed}/600/400` });

const listMeta = (total, page, limit) => ({ page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });

function paginate(query, rows, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, slice: rows.slice((page - 1) * limit, page * limit), meta: listMeta(rows.length, page, limit) };
}

function search(rows, q, fields) {
  if (!q) return rows;
  const needle = String(q).toLowerCase();
  return rows.filter((row) => fields.some((f) => String(row[f] ?? '').toLowerCase().includes(needle)));
}

/* --------------------------------- seed --------------------------------- */

const foodCategories = ['Biryani', 'Pizza', 'Burgers', 'South Indian', 'Desserts', 'Chinese'].map((name, i) => ({
  id: `fcat_${i + 1}`,
  name,
  icon: 'restaurant-outline',
  image: img(`cat${i}`),
  sortOrder: i + 1,
  createdAt: daysAgo(40 - i),
}));

const vibes = ['Late night cravings', 'Healthy & light', 'Comfort food'].map((name, i) => ({
  id: `vibe_${i + 1}`,
  name,
  tagline: ['Open till 2 AM', 'Under 500 calories', 'Warm and filling'][i],
  image: img(`vibe${i}`),
  from: ['#6a5ef5', '#16a34a', '#ff6a3d'][i],
  to: ['#8b5cf6', '#22c55e', '#f2542a'][i],
  sortOrder: i + 1,
  createdAt: daysAgo(38 - i),
}));

const restaurants = [
  ['Spice Villa', 'Civil Lines, Raipur', ['North Indian', 'Mughlai']],
  ['Napoli Pizzeria', 'Shankar Nagar', ['Italian', 'Pizza']],
  ['Dosa Junction', 'Telibandha', ['South Indian']],
  ['Burger Bros', 'Pandri', ['American', 'Fast food']],
  ['Wok & Roll', 'Devendra Nagar', ['Chinese', 'Thai']],
].map(([name, line, cuisines], i) => ({
  id: `rst_${i + 1}`,
  name,
  line,
  cuisines,
  rating: 4.1 + (i % 5) * 0.15,
  reviews: 120 + i * 47,
  deliveryTime: 22 + i * 4,
  deliveryFee: i % 2 ? 0 : 29,
  minOrder: 99,
  distanceKm: 1.2 + i * 0.6,
  priceForTwo: 350 + i * 60,
  promo: i % 2 ? '50% OFF up to ₹100' : '',
  isVeg: i === 2,
  isPopular: i < 3,
  isNewlyJoined: i === 4,
  isClosed: i === 3,
  offer: '',
  cover: img(`rest${i}`),
  tags: ['Trending'],
  categoryIds: [pick(foodCategories, i).id],
  createdAt: daysAgo(35 - i),
}));

const foodItems = [
  'Hyderabadi Chicken Biryani',
  'Paneer Butter Masala',
  'Margherita Pizza',
  'Farmhouse Pizza',
  'Masala Dosa',
  'Idli Sambar',
  'Classic Cheeseburger',
  'Peri Peri Fries',
  'Hakka Noodles',
  'Chilli Paneer',
  'Gulab Jamun',
  'Chocolate Brownie',
].map((name, i) => ({
  id: `fitm_${i + 1}`,
  restaurantId: pick(restaurants, Math.floor(i / 2.5)).id,
  name,
  description: 'Freshly prepared, served hot.',
  price: 129 + (i % 6) * 40,
  mrp: 159 + (i % 6) * 40,
  rating: 3.9 + (i % 6) * 0.18,
  reviews: 40 + i * 13,
  prepTime: 12 + (i % 4) * 5,
  isVeg: i % 3 !== 0,
  isBestseller: i % 4 === 0,
  isPopular: i % 3 === 0,
  isSpecial: i % 5 === 0,
  vibeId: pick(vibes, i).id,
  tags: ['Chef special'],
  image: img(`food${i}`),
  categoryIds: [pick(foodCategories, i).id],
  createdAt: daysAgo(30 - (i % 20)),
}));

const shopCategories = ['Fashion', 'Electronics', 'Home & Living', 'Beauty'].map((name, i) => ({
  id: `scat_${i + 1}`,
  name,
  tagline: ['Trending fits', 'Gadgets that matter', 'Make it yours', 'Glow up'][i],
  icon: 'pricetag-outline',
  image: img(`scat${i}`),
  sortOrder: i + 1,
  createdAt: daysAgo(36 - i),
}));

const stores = [
  ['Urban Threads', 'Fashion Street', 'Raipur'],
  ['Gadget Hub', 'MG Road', 'Bhilai'],
  ['Casa Living', 'Ring Road', 'Raipur'],
  ['Glow Bar', 'Shankar Nagar', 'Raipur'],
].map(([name, road, city], i) => ({
  id: `str_${i + 1}`,
  name,
  brand: name.split(' ')[0],
  road,
  house: `${10 + i}`,
  city,
  pin: '492001',
  rating: 4.0 + (i % 5) * 0.2,
  reviews: 80 + i * 33,
  deliveryMins: 45 + i * 15,
  deliveryFee: i % 2 ? 39 : 0,
  minOrder: 199,
  promo: i % 2 ? 'Extra 10% off' : '',
  isNiche: i === 3,
  isPopular: i < 2,
  tags: ['Fast delivery'],
  categoryIds: [pick(shopCategories, i).id],
  cover: img(`store${i}`),
  createdAt: daysAgo(34 - i),
}));

const products = [
  'Cotton oversized tee',
  'Slim fit denim',
  'Wireless earbuds',
  'Fast charger 65W',
  'Ceramic vase',
  'Cotton bedsheet set',
  'Vitamin C serum',
  'Matte lipstick',
  'Running shoes',
  'Bluetooth speaker',
  'Table lamp',
  'Face wash',
].map((name, i) => ({
  id: `prd_${i + 1}`,
  storeId: pick(stores, Math.floor(i / 3)).id,
  name,
  brand: pick(['Aura', 'Nord', 'Kite', 'Loom'], i),
  description: 'Best seller across the Aurasure shop module.',
  price: 299 + (i % 8) * 220,
  mrp: 499 + (i % 8) * 220,
  rating: 3.8 + (i % 7) * 0.16,
  reviews: 25 + i * 19,
  inStock: i % 7 !== 0,
  isNew: i % 5 === 0,
  isTrending: i % 3 === 0,
  isBestseller: i % 4 === 0,
  isSpecialOffer: i % 6 === 0,
  deliveryMins: 60 + (i % 4) * 30,
  tags: ['Top rated'],
  colors: ['#0b1020', '#5b46e5'],
  sizes: ['S', 'M', 'L'],
  image: img(`prod${i}`),
  categoryId: pick(shopCategories, Math.floor(i / 3)).id,
  createdAt: daysAgo(28 - (i % 18)),
}));

const banners = [
  ['food', 'Flat ₹100 off this weekend', 'On orders above ₹399', 'LIMITED'],
  ['food', 'Biryani fest is live', 'Up to 40% off', 'HOT'],
  ['shop', 'Fashion week deals', 'Min 30% off on top brands', 'NEW'],
  ['shop', 'Gadget carnival', 'EMI from ₹499/month', ''],
].map(([module, title, subtitle, badge], i) => ({
  id: `bnr_${i + 1}`,
  module,
  title,
  subtitle,
  badge,
  image: img(`banner${i}`),
  target: { kind: 'search' },
  sortOrder: i + 1,
  active: i !== 3,
  createdAt: daysAgo(20 - i),
}));

const promos = [
  ['WELCOME50', 'Flat ₹50 off your first order', 'On orders above ₹199', 'all', 'flat', 50, 0, 199, 0, 1],
  ['FOOD25', '25% off on food orders', 'Up to ₹120 off', 'food', 'percent', 25, 120, 249, 500, 1],
  ['SHOP150', 'Flat ₹150 off electronics', 'On orders above ₹999', 'shop', 'flat', 150, 0, 999, 200, 1],
  ['WEEKEND10', '10% weekend saver', 'Every Saturday & Sunday', 'all', 'percent', 10, 80, 0, 0, 2],
].map(([code, title, subtitle, module, offType, offValue, maxDiscount, minOrder, usageLimit, perUserLimit], i) => ({
  id: `promo_${i + 1}`,
  code,
  title,
  subtitle,
  description: 'Cannot be clubbed with other offers.',
  module,
  offType,
  offValue,
  maxDiscount,
  minOrder,
  startsAt: null,
  expiresAt: i === 3 ? daysAgo(2) : new Date(Date.now() + (30 + i * 10) * 86400000).toISOString(),
  usageLimit,
  perUserLimit,
  issuedCount: [12, 48, 7, 0][i],
  redeemedCount: [5, 21, 2, 0][i],
  selfClaim: true,
  active: true,
  createdAt: daysAgo(25 - i * 5),
}));

const users = [
  ['Aurasure Admin', '8888888888', 'admin'],
  ['Nisha Patel', '9876543210', 'customer'],
  ['Rohan Verma', '7000000001', 'customer'],
  ['Imran Khan', '7000000002', 'customer'],
  ['Sneha Rao', '7000000003', 'customer'],
  ['Aditya Singh', '7000000004', 'customer'],
  ['Meera Joshi', '7000000005', 'customer'],
].map(([name, phone, role], i) => ({
  _id: `oid_${i + 1}`,
  id: `usr_${i + 1}`,
  role,
  name,
  phone,
  email: role === 'admin' ? 'admin@aurasure.app' : `${name.split(' ')[0].toLowerCase()}@example.com`,
  password: role === 'admin' ? 'admin@aurasure' : 'aurasure123',
  wallet: role === 'admin' ? 0 : 250 + i * 120,
  walletTxs: [
    { id: id('wtx'), type: 'credit', title: 'Money added', note: 'UPI', amount: 500, balanceAfter: 500, createdAt: daysAgo(9) },
    { id: id('wtx'), type: 'debit', title: 'Order AUR-100' + i, note: '', amount: 250, balanceAfter: 250, createdAt: daysAgo(4) },
  ],
  loyaltyPoints: role === 'admin' ? 0 : 120 * (i + 1),
  loyaltyTxs: [
    { id: id('ltx'), type: 'earned', title: 'Order reward', note: '', points: 120, balanceAfter: 120, createdAt: daysAgo(6) },
  ],
  coupons: [
    { id: id('cpn'), code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat', offValue: 50, expiresAt: daysAgo(-20), usedAt: null },
    { id: id('cpn'), code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat', offValue: 0, expiresAt: daysAgo(-12), usedAt: i % 2 ? daysAgo(3) : null },
  ],
  addresses: [
    { id: id('adr'), label: 'Home', line: `${100 + i}, Sector ${i + 1}`, city: 'Raipur', pin: '492001', isDefault: true },
  ],
  referralCode: `${name.slice(0, 3).toUpperCase()}${1000 + i}`,
  referredBy: null,
  partnerApplication:
    i === 2
      ? { kind: 'vendor', city: 'Raipur', status: 'submitted', note: '', appliedAt: daysAgo(1) }
      : i === 3
        ? { kind: 'delivery', city: 'Bhilai', status: 'submitted', note: '', appliedAt: daysAgo(2) }
        : i === 4
          ? { kind: 'delivery', city: 'Raipur', status: 'approved', note: 'Docs verified', appliedAt: daysAgo(9) }
          : null,
  createdAt: daysAgo(60 - i * 4),
}));

const STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'delivered', 'delivered', 'cancelled'];

const orders = Array.from({ length: 46 }).map((_, i) => {
  const module = i % 3 === 0 ? 'shop' : 'food';
  const buyer = users[1 + (i % (users.length - 1))];
  const pool = module === 'food' ? foodItems : products;
  const lines = [0, 1].slice(0, 1 + (i % 2)).map((n) => {
    const item = pick(pool, i + n * 3);
    return {
      id: id('line'),
      refId: item.id,
      kind: module,
      name: item.name,
      meta: module === 'food' ? 'Regular' : 'Size M',
      unitPrice: item.price,
      qty: 1 + ((i + n) % 3),
      image: item.image,
    };
  });
  const itemTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const deliveryFee = i % 4 === 0 ? 0 : 29;
  const discount = i % 5 === 0 ? 50 : 0;
  const status = i < 6 ? STATUSES[i % 4] : pick(STATUSES, i);
  const payBy = pick(['cod', 'wallet', 'upi', 'card'], i);
  return {
    id: `ord_${i + 1}`,
    code: `AUR-${1000 + i}`,
    user: buyer._id,
    module,
    placedAt: daysAgo(i < 6 ? 0 : i % 14, 8 + (i % 10)),
    status,
    items: lines,
    itemTotal,
    deliveryFee,
    discount,
    total: itemTotal + deliveryFee - discount,
    payBy,
    walletPaid: payBy === 'wallet' ? itemTotal : 0,
    loyaltyEarned: Math.round(itemTotal / 20),
    etaMinutes: status === 'out_for_delivery' ? 15 : 0,
    address: `${100 + i}, Sector ${1 + (i % 9)}, Raipur — 492001`,
    couponId: discount ? 'cpn_demo' : null,
    couponCode: discount ? 'AURA50' : null,
    instructions: i % 6 === 0 ? 'Call on arrival, gate code 4412.' : '',
  };
});

/* --------------------------------- auth --------------------------------- */

const sessions = new Map();

function currentUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return token ? sessions.get(token) ?? null : null;
}

function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return fail(res, 401, 'TOKEN_MISSING', 'Authentication token missing');
  if (user.role !== 'admin') return fail(res, 403, 'ADMIN_ONLY', 'Admin access required');
  req.user = user;
  return next();
}

const publicUser = (u) => {
  const { password, _id, ...rest } = u;
  return rest;
};

app.post('/api/v1/auth/login', (req, res) => {
  const { phone, password } = req.body ?? {};
  const user = users.find((u) => u.phone === String(phone ?? '').trim());
  if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'No account found for this phone number');
  if (user.password !== password) return fail(res, 401, 'INVALID_CREDENTIALS', 'Incorrect password');
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, user);
  return ok(res, { user: publicUser(user), token });
});

app.get('/api/v1/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return fail(res, 401, 'TOKEN_MISSING', 'Authentication token missing');
  return ok(res, { user: publicUser(user) });
});

app.use('/api/v1/admin', requireAdmin);

/* -------------------------------- stats --------------------------------- */

const LIVE = ['placed', 'confirmed', 'preparing', 'out_for_delivery'];

app.get('/api/v1/admin/stats', (req, res) =>
  ok(res, {
    users: users.length,
    restaurants: restaurants.length,
    foodItems: foodItems.length,
    foodCategories: foodCategories.length,
    shops: stores.length,
    products: products.length,
    shopCategories: shopCategories.length,
    banners: banners.length,
    orders: orders.length,
    revenue: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    liveOrders: orders.filter((o) => LIVE.includes(o.status)).length,
    cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
    walletCollected: orders.reduce((s, o) => s + o.walletPaid, 0),
    pendingPartners: users.filter((u) => u.partnerApplication?.status === 'submitted').length,
    partnerKinds: users.reduce((acc, u) => {
      if (u.partnerApplication) acc[u.partnerApplication.kind] = (acc[u.partnerApplication.kind] ?? 0) + 1;
      return acc;
    }, {}),
  }),
);

/* -------------------------------- orders -------------------------------- */

const withUser = (order) => {
  const buyer = users.find((u) => u._id === order.user);
  return { ...order, user: buyer ? { id: buyer.id, name: buyer.name, phone: buyer.phone, email: buyer.email, wallet: buyer.wallet, loyaltyPoints: buyer.loyaltyPoints } : null };
};

app.get('/api/v1/admin/orders', (req, res) => {
  let rows = [...orders].sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  if (req.query.module) rows = rows.filter((o) => o.module === req.query.module);
  if (req.query.status) rows = rows.filter((o) => o.status === req.query.status);
  const { slice, meta } = paginate(req.query, rows, 30);
  return ok(res, { orders: slice.map(withUser) }, meta);
});

app.get('/api/v1/admin/orders/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  return ok(res, { order: withUser(order) });
});

const RANK = { placed: 0, confirmed: 1, preparing: 2, out_for_delivery: 3, delivered: 4 };

app.patch('/api/v1/admin/orders/:id/status', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  const { status } = req.body ?? {};
  if (['delivered', 'cancelled'].includes(order.status)) {
    return fail(res, 400, 'ORDER_FINISHED', `Order is already ${order.status} - no further changes`);
  }
  if (status === 'cancelled') {
    if (!['placed', 'confirmed'].includes(order.status)) {
      return fail(res, 400, 'CANT_CANCEL', 'This order can no longer be cancelled');
    }
    order.status = 'cancelled';
    return ok(res, { order: withUser(order) });
  }
  if (!(status in RANK) || RANK[status] <= RANK[order.status]) {
    return fail(res, 400, 'STATUS_REGRESSION', `Orders can only move forward - it is already ${order.status}`);
  }
  order.status = status;
  order.etaMinutes = status === 'out_for_delivery' ? 15 : 0;
  return ok(res, { order: withUser(order) });
});

/* ------------------------------- partners -------------------------------- */

app.get('/api/v1/admin/partners', (req, res) =>
  ok(res, {
    applications: users
      .filter((u) => u.partnerApplication)
      .map((u) => ({
        userId: u.id,
        name: u.name,
        phone: u.phone,
        kind: u.partnerApplication.kind,
        city: u.partnerApplication.city,
        appliedAt: u.partnerApplication.appliedAt,
        status: u.partnerApplication.status,
        note: u.partnerApplication.note,
      }))
      .sort((a, b) => (a.status === 'submitted' ? -1 : 1)),
  }),
);

app.patch('/api/v1/admin/partners/:userId', (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user?.partnerApplication) return fail(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
  user.partnerApplication.status = req.body.status;
  if (req.body.note) user.partnerApplication.note = String(req.body.note).slice(0, 300);
  return ok(res, { application: { userId: user.id, ...user.partnerApplication, name: user.name, phone: user.phone } });
});

/* ------------------------------- customers ------------------------------- */

app.get('/api/v1/admin/customers', (req, res) => {
  let rows = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (req.query.role) rows = rows.filter((u) => u.role === req.query.role);
  rows = search(rows, req.query.q, ['name', 'phone', 'email', 'id', 'referralCode']);
  const { slice, meta } = paginate(req.query, rows);
  return ok(
    res,
    {
      customers: slice.map((u) => {
        const mine = orders.filter((o) => o.user === u._id);
        return {
          id: u.id,
          role: u.role,
          name: u.name,
          email: u.email,
          phone: u.phone,
          wallet: u.wallet,
          loyaltyPoints: u.loyaltyPoints,
          referralCode: u.referralCode,
          joinedAt: u.createdAt,
          partnerKind: u.partnerApplication?.kind ?? null,
          orders: mine.length,
          spent: mine.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
        };
      }),
    },
    meta,
  );
});

app.get('/api/v1/admin/customers/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  const mine = orders.filter((o) => o.user === user._id).sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  return ok(res, {
    customer: publicUser(user),
    stats: {
      orders: mine.length,
      spent: mine.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
      cancelled: mine.filter((o) => o.status === 'cancelled').length,
    },
    orders: mine.slice(0, 20),
  });
});

app.post('/api/v1/admin/customers/:id/wallet', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  const amount = Math.round(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, 'INVALID_AMOUNT', 'amount must be greater than 0');
  if (req.body.type === 'debit' && user.wallet < amount) {
    return fail(res, 400, 'INSUFFICIENT_BALANCE', 'Wallet balance is lower than the debit amount');
  }
  user.wallet += req.body.type === 'credit' ? amount : -amount;
  user.walletTxs.unshift({
    id: id('wtx'),
    type: req.body.type,
    title: req.body.type === 'credit' ? 'Added by admin' : 'Deducted by admin',
    note: req.body.note ?? '',
    amount,
    balanceAfter: user.wallet,
    createdAt: new Date().toISOString(),
  });
  return ok(res, { wallet: user.wallet, walletTxs: user.walletTxs.slice(0, 20) });
});

app.post('/api/v1/admin/customers/:id/loyalty', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  const points = Math.round(Number(req.body.points));
  if (!Number.isFinite(points) || points <= 0) return fail(res, 400, 'INVALID_POINTS', 'points must be greater than 0');
  if (req.body.type === 'redeemed' && user.loyaltyPoints < points) {
    return fail(res, 400, 'INSUFFICIENT_POINTS', 'Not enough loyalty points');
  }
  user.loyaltyPoints += req.body.type === 'earned' ? points : -points;
  user.loyaltyTxs.unshift({
    id: id('ltx'),
    type: req.body.type,
    title: req.body.type === 'earned' ? 'Granted by admin' : 'Deducted by admin',
    note: req.body.note ?? '',
    points,
    balanceAfter: user.loyaltyPoints,
    createdAt: new Date().toISOString(),
  });
  return ok(res, { loyaltyPoints: user.loyaltyPoints, loyaltyTxs: user.loyaltyTxs.slice(0, 20) });
});

app.patch('/api/v1/admin/customers/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  if (user._id === req.user._id && req.body.role !== 'admin') {
    return fail(res, 400, 'SELF_DEMOTE', 'You cannot remove your own admin access');
  }
  user.role = req.body.role;
  return ok(res, { customer: { id: user.id, role: user.role } });
});

/* -------------------------------- reports -------------------------------- */

app.get('/api/v1/admin/reports/overview', (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 14));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const rows = orders.filter((o) => o.placedAt.slice(0, 10) === date);
    series.push({
      date,
      orders: rows.length,
      revenue: rows.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
      cancelled: rows.filter((o) => o.status === 'cancelled').length,
    });
  }

  const group = (keyFn) => {
    const map = new Map();
    for (const order of orders) {
      const key = keyFn(order);
      const row = map.get(key) ?? { key, orders: 0, revenue: 0 };
      row.orders += 1;
      if (order.status !== 'cancelled') row.revenue += order.total;
      map.set(key, row);
    }
    return [...map.values()];
  };

  const itemMap = new Map();
  for (const order of orders) {
    for (const line of order.items) {
      const row = itemMap.get(line.refId) ?? { refId: line.refId, name: line.name, kind: line.kind, qty: 0, revenue: 0 };
      row.qty += line.qty;
      row.revenue += line.qty * line.unitPrice;
      itemMap.set(line.refId, row);
    }
  }

  const spend = users
    .map((u) => {
      const mine = orders.filter((o) => o.user === u._id && o.status !== 'cancelled');
      return { id: u.id, name: u.name, phone: u.phone, orders: mine.length, spent: mine.reduce((s, o) => s + o.total, 0) };
    })
    .filter((row) => row.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8);

  return ok(res, {
    days,
    series,
    byModule: group((o) => o.module),
    byStatus: group((o) => o.status).map(({ key, orders: count }) => ({ key, orders: count })),
    byPayment: group((o) => o.payBy),
    topItems: [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    topCustomers: spend,
  });
});

/* -------------------------------- lookups -------------------------------- */

app.get('/api/v1/admin/lookups', (req, res) =>
  ok(res, {
    restaurants: restaurants.map((r) => ({ id: r.id, name: r.name })),
    stores: stores.map((s) => ({ id: s.id, name: s.name })),
    foodCategories: foodCategories.map((c) => ({ id: c.id, name: c.name })),
    shopCategories: shopCategories.map((c) => ({ id: c.id, name: c.name })),
    vibes: vibes.map((v) => ({ id: v.id, name: v.name })),
  }),
);

app.get('/api/v1/admin/system', (req, res) =>
  ok(res, {
    service: 'aurasure-api (mock)',
    version: '1.0.0',
    env: 'development',
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    database: { state: 'connected', name: 'aurasure-mock', host: '127.0.0.1' },
  }),
);

/* ---------------------------- catalogue CRUD ----------------------------- */

const resources = {
  'food/categories': { rows: foodCategories, key: 'categories', prefix: 'fcat', fields: ['name', 'icon', 'image', 'sortOrder'], search: ['name', 'id'] },
  'food/vibes': { rows: vibes, key: 'vibes', prefix: 'vibe', fields: ['name', 'tagline', 'image', 'from', 'to', 'sortOrder'], search: ['name', 'tagline', 'id'] },
  'food/restaurants': { rows: restaurants, key: 'restaurants', prefix: 'rst', fields: null, search: ['name', 'line', 'id'] },
  'food/items': { rows: foodItems, key: 'items', prefix: 'fitm', fields: null, search: ['name', 'description', 'id'] },
  'shop/categories': { rows: shopCategories, key: 'categories', prefix: 'scat', fields: null, search: ['name', 'tagline', 'id'] },
  'shop/stores': { rows: stores, key: 'stores', prefix: 'str', fields: null, search: ['name', 'brand', 'city', 'id'] },
  'shop/products': { rows: products, key: 'products', prefix: 'prd', fields: null, search: ['name', 'brand', 'id'] },
  banners: { rows: banners, key: 'banners', prefix: 'bnr', fields: null, search: ['title', 'subtitle', 'id'] },
  promos: { rows: promos, key: 'promos', prefix: 'promo', fields: null, search: ['code', 'title', 'subtitle', 'id'] },
};

/** Live / scheduled / expired state of a promo row (mirrors the API). */
const promoStatus = (row) => {
  const now = Date.now();
  if (!row.active) return 'paused';
  if (row.expiresAt && new Date(row.expiresAt).getTime() < now) return 'expired';
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return 'scheduled';
  return 'live';
};

const asBool = (value) => (value === 'true' ? true : value === 'false' ? false : undefined);

for (const [path, resource] of Object.entries(resources)) {
  app.get(`/api/v1/admin/${path}`, (req, res) => {
    let rows = search([...resource.rows], req.query.q, resource.search);
    for (const [field, value] of Object.entries(req.query)) {
      if (['q', 'page', 'limit'].includes(field)) continue;
      const bool = asBool(value);
      if (field === 'status' && path === 'promos') rows = rows.filter((r) => promoStatus(r) === value);
      else if (field === 'category') rows = rows.filter((r) => (r.categoryIds ?? []).includes(value));
      else if (field === 'veg') rows = rows.filter((r) => Boolean(r.isVeg) === bool);
      else if (field === 'closed') rows = rows.filter((r) => Boolean(r.isClosed) === bool);
      else if (bool !== undefined) rows = rows.filter((r) => Boolean(r[field]) === bool);
      else rows = rows.filter((r) => String(r[field] ?? '') === value);
    }
    const { slice, meta } = paginate(req.query, rows);
    return ok(res, { [resource.key]: slice }, meta);
  });

  app.post(`/api/v1/admin/${path}`, (req, res) => {
    const extras = path === 'promos' ? { issuedCount: 0, redeemedCount: 0 } : {};
    const row = { ...extras, ...req.body, id: id(resource.prefix), createdAt: new Date().toISOString() };
    if (path === 'promos') row.code = String(row.code || '').trim().toUpperCase();
    resource.rows.unshift(row);
    return res.status(201).json({ success: true, data: { [resource.key.replace(/ies$/, 'y').replace(/s$/, '')]: row } });
  });

  const update = (req, res) => {
    const row = resource.rows.find((r) => r.id === req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Record not found');
    Object.assign(row, req.body);
    return ok(res, { [resource.key.replace(/ies$/, 'y').replace(/s$/, '')]: row });
  };
  app.put(`/api/v1/admin/${path}/:id`, update);
  app.patch(`/api/v1/admin/${path}/:id`, update);

  app.delete(`/api/v1/admin/${path}/:id`, (req, res) => {
    const index = resource.rows.findIndex((r) => r.id === req.params.id);
    if (index < 0) return fail(res, 404, 'NOT_FOUND', 'Record not found');
    resource.rows.splice(index, 1);
    return ok(res, { deleted: req.params.id });
  });
}

/* ------------------------------ promo codes ------------------------------ */

app.post('/api/v1/admin/promos/:id/issue', (req, res) => {
  const promo = promos.find((p) => p.id === req.params.id);
  if (!promo) return fail(res, 404, 'NOT_FOUND', 'Promo code not found');
  if (promoStatus(promo) !== 'live') return fail(res, 400, 'PROMO_UNAVAILABLE', 'This promo code is not live');

  const target = req.body.target === 'selected' ? 'selected' : 'all';
  const ids = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  if (target === 'selected' && ids.length === 0) return fail(res, 400, 'NO_CUSTOMERS', 'Pick at least one customer');

  const pool = users.filter((u) => (target === 'selected' ? ids.includes(u.id) : u.role === 'customer'));
  let remaining = promo.usageLimit > 0 ? Math.max(promo.usageLimit - promo.issuedCount, 0) : Infinity;
  let issued = 0;
  let skipped = 0;

  for (const user of pool) {
    user.coupons = user.coupons || [];
    const held = user.coupons.filter((c) => c.code === promo.code).length;
    if (remaining <= 0 || held >= promo.perUserLimit) {
      skipped += 1;
      continue;
    }
    user.coupons.push({
      id: id('cpn'),
      code: promo.code,
      title: promo.title,
      subtitle: promo.subtitle,
      minOrder: promo.minOrder,
      offType: promo.offType,
      offValue: promo.offValue,
      expiresAt: promo.expiresAt,
      usedAt: null,
    });
    issued += 1;
    remaining -= 1;
  }
  promo.issuedCount += issued;

  return ok(res, {
    promo,
    issued,
    skipped,
    message: `Issued to ${issued} customer${issued === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}`,
  });
});

app.get('/api/v1/admin/promos/:id/stats', (req, res) => {
  const promo = promos.find((p) => p.id === req.params.id);
  if (!promo) return fail(res, 404, 'NOT_FOUND', 'Promo code not found');
  const holders = users.filter((u) => (u.coupons || []).some((c) => c.code === promo.code)).length;
  const redeemed = users.filter((u) => (u.coupons || []).some((c) => c.code === promo.code && c.usedAt)).length;
  return ok(res, { promo, stats: { holders, redeemed, unused: holders - redeemed, status: promoStatus(promo) } });
});

/* ------------------------- uploads (same as server) ---------------------- */

const UPLOAD_DIR = path.resolve(process.env.MOCK_UPLOAD_DIR || '.uploads-dev');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const bucket = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(UPLOAD_DIR, bucket());
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const base = path.parse(file.originalname || 'image').name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'image';
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif', 'image/svg+xml': '.svg' }[file.mimetype] || '.jpg';
      cb(null, `${base}-${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error(`Unsupported image type: ${file.mimetype}`)),
});

app.use('/uploads', express.static(UPLOAD_DIR, { index: false, fallthrough: false }));

const describe = (req, file) => {
  const rel = path.relative(UPLOAD_DIR, file.path).split(path.sep).join('/');
  const url = `${req.protocol}://${req.get('host')}/uploads/${rel}`;
  return { image: { kind: 'uri', uri: url }, url, path: `/uploads/${rel}`, file: rel, name: file.originalname, size: file.size, mimeType: file.mimetype };
};

app.post('/api/v1/admin/uploads', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_FAILED', err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 5 MB' : err.message);
    if (!req.file) return fail(res, 400, 'NO_FILE', 'No image received - send a file in the `image` field');
    return res.status(201).json({ success: true, data: describe(req, req.file) });
  });
});

app.post('/api/v1/admin/uploads/bulk', (req, res) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) return fail(res, 400, 'UPLOAD_FAILED', err.message);
    if (!req.files?.length) return fail(res, 400, 'NO_FILE', 'No images received');
    return res.status(201).json({ success: true, data: { uploads: req.files.map((f) => describe(req, f)) } });
  });
});

app.delete('/api/v1/admin/uploads/:bucket/:file', (req, res) => {
  const target = path.resolve(UPLOAD_DIR, req.params.bucket, req.params.file);
  if (!target.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return fail(res, 400, 'INVALID_PATH', 'Invalid file path');
  try {
    fs.unlinkSync(target);
  } catch {
    return fail(res, 404, 'FILE_NOT_FOUND', 'File not found');
  }
  return ok(res, { deleted: `${req.params.bucket}/${req.params.file}` });
});

app.get('/api/v1/health', (req, res) => ok(res, { status: 'ok', mock: true }));
app.use((req, res) => fail(res, 404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock-api] Aurasure mock API listening on http://0.0.0.0:${PORT}`);
  console.log('[mock-api] admin login → 8888888888 / admin@aurasure');
});
