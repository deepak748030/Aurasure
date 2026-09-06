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
const { seedDemoWorld } = require('./seed/demo');

const FoodCategory = require('./models/FoodCategory');
const FoodVibe = require('./models/FoodVibe');
const Restaurant = require('./models/Restaurant');
const FoodItem = require('./models/FoodItem');
const ShopCategory = require('./models/ShopCategory');
const ShopStore = require('./models/ShopStore');
const Product = require('./models/Product');
const Banner = require('./models/Banner');
const Promo = require('./models/Promo');
const Brand = require('./models/Brand');
const FlashSale = require('./models/FlashSale');
const Content = require('./models/Content');
const AppSetting = require('./models/AppSetting');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Order = require('./models/Order');
const Vendor = require('./models/Vendor');
const DeliveryPartner = require('./models/DeliveryPartner');
const DeliveryTask = require('./models/DeliveryTask');
const { emptyDocs: emptyVendorDocs } = require('./utils/vendorDocs');
const { emptyDocs: emptyRiderDocs } = require('./utils/riderDocs');

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

/**
 * Back-fills payment/loyalty metadata on the two demo orders created by older
 * seeds (they predate walletPaid/loyaltyEarned). Never touches cancelled
 * orders - those were already reversed based on the amounts at the time.
 */
async function normalizeDemoOrders(userId) {
  const patches = [
    { code: 'AUR-FD-20517', $set: { payBy: 'wallet', walletPaid: 617, loyaltyEarned: 30 } },
    { code: 'AUR-SH-19842', $set: { payBy: 'cod', walletPaid: 0, loyaltyEarned: 145 } },
  ];
  let normalized = 0;
  for (const patch of patches) {
    const res = await Order.updateOne(
      { user: userId, code: patch.code, status: { $ne: 'cancelled' } },
      { $set: patch.$set },
    );
    normalized += res.modifiedCount || 0;
  }
  return normalized;
}

/** Demo vendor account for the vendor app (phone 7777777777 / vendor@123). */
async function seedDemoVendor() {
  const phone = process.env.SEED_VENDOR_PHONE || '7777777777';
  const password = process.env.SEED_VENDOR_PASSWORD || 'vendor@123';
  let user = await User.findOne({ phone });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    user = await User.create({ id: newId('usr'), name: 'Demo Kitchen', phone, passwordHash, role: 'vendor' });
  } else if (user.role !== 'vendor') {
    return null;
  }
  const docs = emptyVendorDocs('food').map((doc) => ({
    key: doc.key,
    label: doc.label,
    uri: `https://picsum.photos/seed/aur-${doc.key}/640/640`,
    verified: true,
    note: '',
  }));

  const existing = await Vendor.findOne({ phone });
  if (existing) {
    // Older seeds left the demo vendor stuck on `submitted`, so the vendor app
    // could only ever show the pending screen. Promote it so orders, menu,
    // business and staff are all reachable for the demo login.
    if (existing.status !== 'approved') {
      existing.status = 'approved';
      existing.documents = docs;
      existing.isOpen = true;
      existing.acceptingOrders = true;
      existing.reviewedAt = new Date();
      existing.reviewedBy = 'seeder';
      await existing.save();
    }
    return existing;
  }

  return Vendor.create({
    id: newId('vnd'),
    userId: user.id,
    phone,
    module: 'food',
    status: 'approved',
    ownerName: user.name,
    email: 'demo.kitchen@example.com',
    outletName: 'Aura Demo Kitchen',
    legalName: 'Aura Demo Foods Pvt Ltd',
    description: 'Demo restaurant created by the seeder.',
    address: 'Shop 4, Civil Lines',
    landmark: 'Near City Hospital',
    city: 'Raipur',
    pin: '492001',
    gstin: '22AABCD1234E1Z5',
    pan: 'ABCDE1234E',
    fssai: '12123456789012',
    cuisines: ['North Indian', 'Mughlai'],
    categoryIds: ['cat_biryani', 'cat_burgers'],
    priceForTwo: 500,
    minOrder: 150,
    deliveryFee: 25,
    deliveryMins: 30,
    isVeg: false,
    bank: {
      accountName: 'Demo Kitchen',
      accountNumber: '1234567890',
      ifsc: 'HDFC0000001',
      bankName: 'HDFC Bank',
      upi: 'demokitchen@upi',
    },
    hours: { open: '10:00', close: '23:00' },
    cover: { kind: 'uri', uri: 'https://picsum.photos/seed/aur-vendor/800/560' },
    documents: docs,
    submittedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy: 'seeder',
    isOpen: true,
    acceptingOrders: true,
    payoutBalance: 4820,
  });
}

/**
 * Gives the demo vendor a real storefront + menu so the Vendor app's Menu tab,
 * catalogue editing and item toggles all operate on live rows.
 */
async function seedDemoVendorOutlet(vendor) {
  if (!vendor) return null;
  let outletId = vendor.outletId;
  if (!outletId) {
    const existing = await Restaurant.findOne({ vendorId: vendor.id });
    outletId = existing ? existing.id : newId('rst');
  }
  await Restaurant.updateOne(
    { id: outletId },
    {
      $set: {
        id: outletId,
        name: vendor.outletName,
        cuisines: vendor.cuisines,
        deliveryTime: vendor.deliveryMins || 30,
        deliveryFee: vendor.deliveryFee || 25,
        minOrder: vendor.minOrder || 150,
        priceForTwo: vendor.priceForTwo || 500,
        isVeg: false,
        isClosed: false,
        isNewlyJoined: true,
        rating: 4.5,
        reviews: 212,
        line: vendor.address,
        city: vendor.city || 'Raipur',
        lat: 21.2514,
        lng: 81.6296,
        cover: vendor.cover,
        tags: vendor.cuisines,
        categoryIds: vendor.categoryIds,
        vendorId: vendor.id,
      },
    },
    { upsert: true },
  );
  if (vendor.outletId !== outletId) {
    vendor.outletId = outletId;
    await vendor.save();
  }

  const menu = [
    { id: 'vf1', name: 'Demo Kitchen Butter Chicken', description: 'Tomato cashew gravy, tandoor chicken, cream', price: 349, mrp: 420, prepTime: 24, isVeg: false, isBestseller: true, categoryIds: ['cat_biryani'] },
    { id: 'vf2', name: 'Demo Kitchen Chicken Biryani', description: 'Long grain dum biryani, boiled egg, raita', price: 279, mrp: 340, prepTime: 28, isVeg: false, isPopular: true, categoryIds: ['cat_biryani'] },
    { id: 'vf3', name: 'Demo Kitchen Paneer Tikka', description: 'Char-grilled paneer, capsicum, mint chutney', price: 249, mrp: 299, prepTime: 18, isVeg: true, isPopular: true, categoryIds: ['cat_biryani'] },
    { id: 'vf4', name: 'Demo Kitchen Veg Burger', description: 'Crisp patty, aged cheddar, house sauce', price: 159, mrp: 199, prepTime: 12, isVeg: true, categoryIds: ['cat_burgers'] },
    { id: 'vf5', name: 'Demo Kitchen Farmhouse Pizza', description: 'Wood-fired base, onion, capsicum, corn', price: 329, mrp: 399, prepTime: 22, isVeg: true, categoryIds: ['cat_pizza'] },
    { id: 'vf6', name: 'Demo Kitchen Garlic Naan', description: 'Tandoor naan, roasted garlic, butter', price: 69, mrp: 89, prepTime: 8, isVeg: true, categoryIds: ['cat_biryani'] },
    { id: 'vf7', name: 'Demo Kitchen Masala Chowmein', description: 'Wok tossed noodles, veggies, schezwan', price: 149, mrp: 189, prepTime: 14, isVeg: true, categoryIds: ['cat_chowmein'] },
    { id: 'vf8', name: 'Demo Kitchen Masala Dosa', description: 'Crisp dosa, potato masala, sambar, chutney', price: 129, mrp: 159, prepTime: 15, isVeg: true, categoryIds: ['cat_breakfast'] },
  ];
  for (const item of menu) {
    await FoodItem.updateOne(
      { id: item.id },
      {
        $set: {
          ...item,
          restaurantId: outletId,
          image: { kind: 'uri', uri: `https://picsum.photos/seed/${item.id}/640/480` },
          isAvailable: true,
          approvalStatus: 'approved',
          rating: 4.4,
          reviews: 80,
        },
      },
      { upsert: true },
    );
  }
  return { outletId, items: menu.length };
}

/**
 * Live order board for the demo vendor: one order sitting in every stage so
 * accept / reject / mark-ready / hand-over can all be exercised end to end.
 */
async function seedDemoVendorOrders(vendor, userId) {
  if (!vendor || !vendor.outletId) return 0;
  const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000);
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const line = (refId, name, unitPrice, qty, meta = '') => ({ id: newId('lin'), refId, kind: 'food', name, meta, unitPrice, qty, image: null });

  const board = [
    {
      code: 'AUR-VD-40001', status: 'placed', placedAt: minsAgo(3), etaMinutes: 0, payBy: 'cod',
      items: [line('vf1', 'Demo Kitchen Butter Chicken', 349, 1), line('vf6', 'Demo Kitchen Garlic Naan', 69, 3)],
      address: '402, Aurora Heights, Civil Lines, Raipur 492001',
      instructions: 'Less spicy please, ring the bell twice.',
    },
    {
      code: 'AUR-VD-40002', status: 'placed', placedAt: minsAgo(7), etaMinutes: 0, payBy: 'wallet',
      items: [line('vf5', 'Demo Kitchen Farmhouse Pizza', 329, 1), line('vf7', 'Demo Kitchen Masala Chowmein', 149, 1)],
      address: 'Flat 9B, Lake View Apartments, Telibandha, Raipur 492006',
      instructions: '',
    },
    {
      code: 'AUR-VD-40003', status: 'confirmed', placedAt: minsAgo(14), etaMinutes: 20, payBy: 'upi',
      items: [line('vf2', 'Demo Kitchen Chicken Biryani', 279, 2)],
      address: 'Tech Park, 5th Floor, GE Road, Raipur 492001',
      instructions: 'Add extra raita.',
    },
    {
      code: 'AUR-VD-40004', status: 'preparing', placedAt: minsAgo(22), etaMinutes: 12, payBy: 'cod',
      items: [line('vf3', 'Demo Kitchen Paneer Tikka', 249, 1), line('vf4', 'Demo Kitchen Veg Burger', 159, 2)],
      address: 'Shop 14, Shankar Nagar Main Road, Raipur 492007',
      instructions: '',
    },
    {
      code: 'AUR-VD-40005', status: 'out_for_delivery', placedAt: minsAgo(38), etaMinutes: 8, payBy: 'wallet',
      items: [line('vf8', 'Demo Kitchen Masala Dosa', 129, 2), line('vf7', 'Demo Kitchen Masala Chowmein', 149, 1)],
      address: 'House 21, Pandri, Raipur 492004',
      instructions: 'Call on arrival.',
    },
    {
      code: 'AUR-VD-40006', status: 'delivered', placedAt: daysAgo(1), etaMinutes: 0, payBy: 'upi',
      items: [line('vf1', 'Demo Kitchen Butter Chicken', 349, 2), line('vf6', 'Demo Kitchen Garlic Naan', 69, 2)],
      address: '77, Devendra Nagar, Raipur 492001',
      instructions: '',
      deliveredAt: daysAgo(1),
      payoutCredited: true,
    },
    {
      code: 'AUR-VD-40007', status: 'delivered', placedAt: daysAgo(2), etaMinutes: 0, payBy: 'cod',
      items: [line('vf5', 'Demo Kitchen Farmhouse Pizza', 329, 1)],
      address: '12, Amlidih, Raipur 492006',
      instructions: '',
      deliveredAt: daysAgo(2),
      payoutCredited: true,
    },
    {
      code: 'AUR-VD-40008', status: 'cancelled', placedAt: daysAgo(3), etaMinutes: 0, payBy: 'cod',
      items: [line('vf2', 'Demo Kitchen Chicken Biryani', 279, 1)],
      address: '5, Byron Bazar, Raipur 492001',
      instructions: '',
      cancelReason: 'Customer changed their mind',
    },
  ];

  let written = 0;
  for (const entry of board) {
    const existing = await Order.findOne({ code: entry.code });
    if (existing) continue;
    const itemTotal = entry.items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    const deliveryFee = entry.payBy === 'wallet' ? 0 : 25;
    await Order.create({
      id: newId('ord'),
      user: userId,
      module: 'food',
      vendorId: vendor.id,
      outletId: vendor.outletId,
      itemTotal,
      deliveryFee,
      discount: 0,
      total: itemTotal + deliveryFee,
      walletPaid: entry.payBy === 'wallet' ? itemTotal + deliveryFee : 0,
      loyaltyEarned: Math.round(itemTotal / 20),
      ...entry,
    });
    written += 1;
  }
  return written;
}

/** Demo delivery partner for the rider app (phone 9999999991 / rider@123). */
async function seedDemoRider() {
  const phone = process.env.SEED_RIDER_PHONE || '9999999991';
  const password = process.env.SEED_RIDER_PASSWORD || 'rider@123';
  let user = await User.findOne({ phone });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    user = await User.create({ id: newId('usr'), name: 'Demo Rider', phone, passwordHash, role: 'delivery' });
  } else if (user.role !== 'delivery') {
    return null;
  }
  const existing = await DeliveryPartner.findOne({ phone });
  if (existing) return existing;

  const docs = emptyRiderDocs().map((doc) => ({
    key: doc.key,
    label: doc.label,
    uri: `https://picsum.photos/seed/aur-rdr-${doc.key}/640/640`,
    verified: true,
    note: '',
  }));

  return DeliveryPartner.create({
    id: newId('rdr'),
    userId: user.id,
    phone,
    name: user.name,
    email: 'demo.rider@example.com',
    city: 'Raipur',
    pincode: '492001',
    address: 'B-12, Telibandha',
    vehicleType: 'bike',
    vehicleNumber: 'CG04AK1234',
    pan: 'ABCDE1235F',
    aadhaar: '123456789012',
    drivingLicense: 'DL-RAI-2024-004321',
    rcNumber: 'MP04RC2024001',
    trainingCompleted: true,
    quizCompleted: true,
    bank: {
      accountName: 'Demo Rider',
      accountNumber: '9876543210',
      ifsc: 'SBIN0000001',
      bankName: 'SBI',
      upi: 'demorider@upi',
    },
    documents: docs,
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: 'seeder',
    submittedAt: new Date(),
    dutyState: 'offline',
  });
}

/** One ready-to-deliver demo task so the Rider app has an offer immediately. */
async function seedDemoDelivery(userId) {
  const existing = await DeliveryTask.findOne({ code: 'DLV-AUR-FD-30000' });
  if (existing) {
    // Keep the seeded map demo useful when an older database already has the
    // task without coordinates.
    let changed = false;
    if (existing.pickup && existing.pickup.lat == null) {
      existing.pickup.lat = 21.2514;
      existing.pickup.lng = 81.6296;
      changed = true;
    }
    if (existing.drop && existing.drop.lat == null) {
      existing.drop.lat = 21.2379;
      existing.drop.lng = 81.6337;
      changed = true;
    }
    if (changed) await existing.save();
    return existing;
  }
  let order = await Order.findOne({ code: 'AUR-FD-30000' });
  if (!order) {
    order = await Order.create({
      id: newId('ord'),
      code: 'AUR-FD-30000',
      user: userId,
      module: 'food',
      status: 'out_for_delivery',
      items: [
        { id: newId('lin'), refId: 'f1', kind: 'food', name: 'Aurora Classic Burger', meta: '', unitPrice: 249, qty: 1, image: null },
        { id: newId('lin'), refId: 'f2', kind: 'food', name: 'Truffle Margherita', meta: '', unitPrice: 329, qty: 1, image: null },
      ],
      itemTotal: 578,
      deliveryFee: 25,
      discount: 0,
      total: 603,
      payBy: 'cod',
      walletPaid: 0,
      loyaltyEarned: 30,
      etaMinutes: 15,
      address: 'Tech Park, 5th Floor, GE Road, Raipur 492001',
      placedAt: new Date(),
    });
  }

  const task = await DeliveryTask.create({
    id: newId('task'),
    code: 'DLV-AUR-FD-30000',
    orderId: order._id,
    orderCode: order.code,
    module: 'food',
    vendorId: null,
    vendorName: 'Aura Demo Kitchen',
    vendorPhone: '7777777777',
    total: order.total,
    codAmount: order.total,
    deliveryFee: order.deliveryFee,
    riderPayout: Math.max(order.deliveryFee, 25),
    items: order.items.map((it) => ({ name: it.name, qty: it.qty, price: it.unitPrice })),
    pickup: {
      name: 'Aura Demo Kitchen',
      phone: '7777777777',
      address: 'Shop 4, Civil Lines, Raipur 492001',
      lat: 21.2514,
      lng: 81.6296,
      otp: '1234',
    },
    drop: {
      name: 'Aarav Sharma',
      phone: '9876543210',
      address: 'Tech Park, 5th Floor, GE Road, Raipur 492001',
      lat: 21.2379,
      lng: 81.6337,
      otp: '4321',
    },
    state: 'available',
  });

  order.deliveryTaskId = task.id;
  await order.save();
  return task;
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
      Promo.deleteMany({}),
      Brand.deleteMany({}),
      FlashSale.deleteMany({}),
      Content.deleteMany({}),
      AppSetting.deleteMany({}),
      Notification.deleteMany({}),
      DeliveryPartner.deleteMany({}),
      DeliveryTask.deleteMany({}),
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
  const promos = await upsert(Promo, seed.promos);
  const brands = await upsert(Brand, seed.brands);
  const flashSales = await upsert(FlashSale, seed.flashSales);
  const contents = await upsert(Content, seed.contents);
  const appSettings = await upsert(AppSetting, seed.appSettings);
  const notifications = await upsert(Notification, seed.notifications);

  const demoUser = await seedDemoUser();
  const adminUser = await seedAdminUser();
  const partnerApplicants = await seedPartnerApplicants();
  const demoVendor = await seedDemoVendor();
  const demoOutlet = await seedDemoVendorOutlet(demoVendor);
  const demoVendorOrders = await seedDemoVendorOrders(demoVendor, demoUser._id);
  const demoRider = await seedDemoRider();
  const demoDelivery = await seedDemoDelivery(demoUser._id);
  const seededOrders = await seedDemoOrders(demoUser._id);
  const normalizedDemoOrders = await normalizeDemoOrders(demoUser._id);
  const demoWorld = await seedDemoWorld({ demoUser, foodVendor: demoVendor, rider: demoRider });

  console.log('[seed] done ✓');
  console.log('  admin user      → phone ' + adminUser.phone + ' / role ' + adminUser.role);
  if (partnerApplicants.length) console.log('  partner apps    ', partnerApplicants);
  if (demoVendor) console.log('  demo vendor     → phone', demoVendor.phone, '/ password vendor@123 / food / status', demoVendor.status);
  if (demoOutlet) console.log('  demo outlet     →', demoOutlet.outletId, 'with', demoOutlet.items, 'menu items');
  if (demoVendorOrders) console.log('  vendor orders   ', demoVendorOrders, 'seeded on the vendor board');
  if (demoRider) console.log('  demo rider      → phone', demoRider.phone, '/ password rider@123 / approved');
  if (demoDelivery) console.log('  demo delivery   → ready task', demoDelivery.code, '/ pickup 1234 / drop 4321');
  if (seededOrders) console.log('  demo orders     ', seededOrders);
  if (normalizedDemoOrders) console.log('  demo orders     ', normalizedDemoOrders, 'normalised (wallet/loyalty back-fill)');
  console.log('  food categories ', foodCategories);
  console.log('  food vibes      ', foodVibes);
  console.log('  restaurants     ', restaurants);
  console.log('  food items      ', foodItems);
  console.log('  shop categories ', shopCategories);
  console.log('  shop stores     ', shopStores);
  console.log('  products        ', products);
  console.log('  banners         ', banners);
  console.log('  promo codes     ', promos);
  console.log('  brands          ', brands);
  console.log('  flash sales     ', flashSales);
  console.log('  contents        ', contents);
  console.log('  app settings    ', appSettings);
  console.log('  notifications   ', notifications);
  console.log(`  demo user       → phone ${demoUser.phone} / password ${process.env.SEED_USER_PASSWORD || 'aurasure123'}`);
  console.log('  ---- demo world ----');
  if (demoWorld.shopVendor) console.log('  shop vendor     → phone', demoWorld.shopVendor, '/ password vendor@123 / shop / approved');
  console.log('  extra customers ', demoWorld.customers, '(9812345001-3 / aurasure123)');
  console.log('  shop products   ', demoWorld.shopProducts, '(1 left pending for the approval queue)');
  console.log('  shop orders     ', demoWorld.shopOrders);
  console.log('  rider tasks     ', demoWorld.riderTasks, '(available / accepted / picked_up / delivered)');
  console.log('  support tickets ', demoWorld.tickets, '(open / in_progress / resolved)');
  console.log('  vendor issues   ', demoWorld.vendorIssues);
  console.log('  notifications   ', demoWorld.notifications);
  console.log('  payments        ', demoWorld.payments, '(paid + failed)');

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
