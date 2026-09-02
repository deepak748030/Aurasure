'use strict';

/**
 * Seeder - populates MongoDB with the Aurasure dataset.
 *
 *   npm run seed          → upserts (safe, keeps existing docs)
 *   npm run seed:fresh    → SEED_FRESH=1 wipes collections first
 *
 * Idempotent: each doc is upserted on its unique `id`, so re-running never
 * creates duplicates. Also creates a demo user (phone/password below).
 */
const bcrypt = require('bcryptjs');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { newId } = require('./utils/id');
const seed = require('./seed/data');

const FoodCategory = require('./models/FoodCategory');
const FoodVibe = require('./models/FoodVibe');
const Restaurant = require('./models/Restaurant');
const FoodItem = require('./models/FoodItem');
const ShopCategory = require('./models/ShopCategory');
const ShopStore = require('./models/ShopStore');
const Product = require('./models/Product');
const Banner = require('./models/Banner');
const User = require('./models/User');
const Order = require('./models/Order');

const FRESH = process.env.SEED_FRESH === '1' || process.argv.includes('--fresh');

async function upsert(Model, docs) {
  if (!docs.length) return 0;
  await Model.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { id: doc.id },
        update: { $set: doc },
        upsert: true,
      },
    })),
  );
  return docs.length;
}

async function seedDemoUser() {
  const phone = process.env.SEED_USER_PHONE || '9876543210';
  const password = process.env.SEED_USER_PASSWORD || 'aurasure123';
  const existing = await User.findOne({ phone });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const inDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

  return User.create({
    id: newId('usr'),
    name: 'Aarav Sharma',
    phone,
    email: 'aarav.sharma@example.com',
    passwordHash,
    // Wallet: 250 opening + 300 referral + 250 added = 800 for the demo.
    wallet: 800,
    walletTxs: [
      { id: newId('wtx'), type: 'credit', title: 'Welcome bonus', note: 'Thanks for joining Aurasure', amount: 250, balanceAfter: 250, createdAt: daysAgo(20) },
      { id: newId('wtx'), type: 'credit', title: 'Referral bonus', note: 'Friend joined with your code', amount: 300, balanceAfter: 550, createdAt: daysAgo(12) },
      { id: newId('wtx'), type: 'debit', title: 'Order AUR-FD-88K2', note: 'Food delivery', amount: 120, balanceAfter: 430, createdAt: daysAgo(4) },
      { id: newId('wtx'), type: 'credit', title: 'Money added', note: 'Instant top-up · UPI', amount: 250, balanceAfter: 680, createdAt: daysAgo(2) },
      { id: newId('wtx'), type: 'credit', title: 'Cashback', note: 'Coupon AURA50', amount: 120, balanceAfter: 800, createdAt: daysAgo(1) },
    ],
    loyaltyPoints: 1240,
    loyaltyTxs: [
      { id: newId('ltx'), type: 'earned', title: 'Order reward', note: '₹620 spent → points', points: 310, balanceAfter: 310, createdAt: daysAgo(4) },
      { id: newId('ltx'), type: 'earned', title: 'Referral bonus', note: 'Friend joined', points: 250, balanceAfter: 560, createdAt: daysAgo(12) },
      { id: newId('ltx'), type: 'earned', title: 'Order reward', note: '₹780 spent → points', points: 390, balanceAfter: 950, createdAt: daysAgo(2) },
      { id: newId('ltx'), type: 'earned', title: 'Order reward', note: '₹580 spent → points', points: 290, balanceAfter: 1240, createdAt: daysAgo(1) },
    ],
    coupons: [
      { id: newId('cpn'), code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat', offValue: 50, expiresAt: inDays(25) },
      { id: newId('cpn'), code: 'FOOD25', title: '25% off on food delivery', subtitle: 'Up to ₹120', minOrder: 349, offType: 'percent', offValue: 25, expiresAt: inDays(18) },
      { id: newId('cpn'), code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat', offValue: 0, expiresAt: inDays(30) },
    ],
    referralCode: 'AAR3210',
    addresses: [
      { id: newId('adr'), label: 'Home', line: '402, Aurora Heights, Civil Lines', city: 'Raipur', pin: '492001', isDefault: true },
      { id: newId('adr'), label: 'Work', line: 'Tech Park, 5th Floor, GE Road', city: 'Raipur', pin: '492001', isDefault: false },
    ],
  });
}


/** Create a user only when the phone number is not registered yet. */
async function ensureUser({ name, phone, password, role = 'customer', extras = {} }) {
  const existing = await User.findOne({ phone });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  return User.create({
    id: newId('usr'),
    name,
    phone,
    passwordHash,
    role,
    ...extras,
  });
}

/** Platform admin - powers the in-app Admin Console (seed idempotent). */
async function seedAdminUser() {
  const phone = process.env.SEED_ADMIN_PHONE || '8888888888';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin@aurasure';
  const admin = await ensureUser({ name: 'Aurasure Admin', phone, password, role: 'admin' });
  if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }
  return admin;
}

/** A couple of partner applications so the admin console has real content. */
async function seedPartnerApplicants() {
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const apps = [
    { name: 'Rohan Verma', phone: process.env.SEED_PARTNER1_PHONE || '7000000001', kind: 'vendor', city: 'Raipur', appliedAt: daysAgo(1) },
    { name: 'Imran Khan', phone: process.env.SEED_PARTNER2_PHONE || '7000000002', kind: 'delivery', city: 'Bhilai', appliedAt: daysAgo(2) },
  ];
  const created = [];
  for (const app of apps) {
    const user = await ensureUser({ name: app.name, phone: app.phone, password: 'aurasure123' });
    if (!user.partnerApplication) {
      user.partnerApplication = {
        kind: app.kind,
        name: app.name,
        city: app.city,
        appliedAt: app.appliedAt,
        status: 'submitted',
      };
      await user.save();
      created.push(`${app.kind}@${app.phone}`);
    }
  }
  return created;
}

/** A few orders for the demo customer so the admin console has live rows. */
async function seedDemoOrders(userId) {
  const existing = await Order.findOne({ user: userId });
  if (existing) return 0;

  const docs = [
    {
      id: newId('ord'),
      code: 'AUR-FD-20517',
      module: 'food',
      status: 'placed',
      items: [
        { id: newId('lin'), refId: 'f1', kind: 'food', name: 'Aurora Classic Burger', meta: 'Medium', unitPrice: 249, qty: 2, image: null },
        { id: newId('lin'), refId: 'f3', kind: 'food', name: 'Butter Croissant', meta: '', unitPrice: 119, qty: 1, image: null },
      ],
      itemTotal: 617,
      deliveryFee: 0,
      discount: 0,
      total: 617,
      payBy: 'wallet',
      walletPaid: 617,
      loyaltyEarned: 30,
      etaMinutes: 25,
      address: '402, Aurora Heights, Civil Lines, Raipur 492001',
    },
    {
      id: newId('ord'),
      code: 'AUR-SH-19842',
      module: 'shop',
      status: 'confirmed',
      items: [
        { id: newId('lin'), refId: 'p10', kind: 'shop', name: 'Aura ANC Headphones', meta: 'Indigo', unitPrice: 4999, qty: 1, image: null },
      ],
      itemTotal: 4999,
      deliveryFee: 0,
      discount: 2000,
      total: 2999,
      payBy: 'cod',
      walletPaid: 0,
      loyaltyEarned: 145,
      etaMinutes: 0,
      address: 'Tech Park, 5th Floor, GE Road, Raipur 492001',
    },
  ];
  for (const doc of docs) {
    await Order.create({ user: userId, placedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), ...doc });
  }
  return docs.length;
}

async function main() {
  console.log('[seed] connecting to', config.mongodb.uri);
  await connectDB();

  if (FRESH) {
    console.log('[seed] FRESH mode - clearing collections...');
    await Promise.all([
      FoodCategory.deleteMany({}),
      FoodVibe.deleteMany({}),
      Restaurant.deleteMany({}),
      FoodItem.deleteMany({}),
      ShopCategory.deleteMany({}),
      ShopStore.deleteMany({}),
      Product.deleteMany({}),
      Banner.deleteMany({}),
    ]);
  }

  const foodCategories = await upsert(FoodCategory, seed.foodCategories);
  const foodVibes = await upsert(FoodVibe, seed.foodVibes);
  const restaurants = await upsert(Restaurant, seed.restaurants);
  const foodItems = await upsert(FoodItem, seed.foodItems);
  const shopCategories = await upsert(ShopCategory, seed.shopCategories);
  const shopStores = await upsert(ShopStore, seed.shopStores);
  const products = await upsert(Product, seed.products);
  const banners = await upsert(Banner, seed.banners);

  const demoUser = await seedDemoUser();
  const adminUser = await seedAdminUser();
  const partnerApplicants = await seedPartnerApplicants();
  const seededOrders = await seedDemoOrders(demoUser._id);

  console.log('[seed] done ✓');
  console.log('  admin user      → phone ' + adminUser.phone + ' / role ' + adminUser.role);
  if (partnerApplicants.length) console.log('  partner apps    ', partnerApplicants);
  if (seededOrders) console.log('  demo orders     ', seededOrders);
  console.log('  food categories ', foodCategories);
  console.log('  food vibes      ', foodVibes);
  console.log('  restaurants     ', restaurants);
  console.log('  food items      ', foodItems);
  console.log('  shop categories ', shopCategories);
  console.log('  shop stores     ', shopStores);
  console.log('  products        ', products);
  console.log('  banners         ', banners);
  console.log(`  demo user       → phone ${demoUser.phone} / password ${process.env.SEED_USER_PASSWORD || 'aurasure123'}`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
