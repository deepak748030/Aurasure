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
  return User.create({
    id: newId('usr'),
    name: 'Aarav Sharma',
    phone,
    email: 'aarav.sharma@example.com',
    passwordHash,
    wallet: 250,
    addresses: [
      { id: newId('adr'), label: 'Home', line: '402, Aurora Heights, Civil Lines', city: 'Raipur', pin: '492001', isDefault: true },
      { id: newId('adr'), label: 'Work', line: 'Tech Park, 5th Floor, GE Road', city: 'Raipur', pin: '492001', isDefault: false },
    ],
  });
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

  console.log('[seed] done ✓');
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
