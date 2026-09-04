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

/* ------------------------- vendors / riders / tasks ---------------------- */

const vendorDoc = (key, label, verified, note = '') => ({
  key,
  label,
  uri: `https://picsum.photos/seed/aur-v-${key}/640/640`,
  verified,
  note,
});

const vendorFoodDocs = [
  vendorDoc('aadhaar', 'Owner Aadhaar (front + back)', false),
  vendorDoc('pan', 'PAN card', false),
  vendorDoc('gst', 'GST certificate (or declaration)', false),
  vendorDoc('bank', 'Cancelled cheque / bank passbook', false),
  vendorDoc('outlet', 'Outlet / storefront photo', false),
  vendorDoc('interior', 'Kitchen or shop floor photo', false),
  vendorDoc('fssai', 'FSSAI license', false),
  vendorDoc('menu', 'Current menu photo', false),
];

const vendors = [
  {
    id: 'vnd_1',
    userId: 'usr_3',
    phone: '7000000001',
    module: 'food',
    status: 'submitted',
    ownerName: 'Rohan Verma',
    email: 'rohan@example.com',
    outletName: 'Rohan Kitchen',
    legalName: 'Rohan Foods Pvt Ltd',
    description: 'Demo vendor application (seed).',
    address: 'Shop 4, Civil Lines',
    landmark: 'Near City Hospital',
    city: 'Raipur',
    pin: '492001',
    gstin: '22AABCD1234E1Z5',
    pan: 'ABCDE1234E',
    fssai: '12123456789012',
    tradeLicense: '',
    cuisines: ['North Indian', 'Mughlai'],
    bank: { accountName: 'Rohan Verma', accountNumber: '1234567890', ifsc: 'HDFC0000001', bankName: 'HDFC Bank', upi: 'rohan@upi' },
    hours: { open: '10:00', close: '23:00' },
    documents: vendorFoodDocs.map((d) => ({ ...d })),
    reviewNote: '',
    reviewedAt: null,
    reviewedBy: '',
    submittedAt: daysAgo(1),
    isOpen: false,
    outletId: null,
    payoutBalance: 0,
  },
  {
    id: 'vnd_2',
    userId: 'usr_6',
    phone: '7000000004',
    module: 'shop',
    status: 'under_review',
    ownerName: 'Aditya Singh',
    email: 'aditya@example.com',
    outletName: 'Aditya Gadgets',
    legalName: 'Aditya Retail LLP',
    description: 'Electronics outlet under review.',
    address: '12, Marine Drive',
    landmark: 'Near Central Mall',
    city: 'Raipur',
    pin: '492001',
    gstin: '22AABCD5678E1Z2',
    pan: 'ABCDE5678F',
    fssai: '',
    tradeLicense: 'TL-RAI-2024-0091',
    cuisines: [],
    bank: { accountName: 'Aditya Singh', accountNumber: '5678901234', ifsc: 'ICIC0000011', bankName: 'ICICI Bank', upi: 'aditya@upi' },
    hours: { open: '09:00', close: '22:00' },
    documents: [
      vendorDoc('aadhaar', 'Owner Aadhaar (front + back)', true),
      vendorDoc('pan', 'PAN card', true),
      vendorDoc('gst', 'GST certificate (or declaration)', false),
      vendorDoc('bank', 'Cancelled cheque / bank passbook', true),
      vendorDoc('outlet', 'Outlet / storefront photo', true),
      vendorDoc('interior', 'Shop floor photo', false),
      vendorDoc('trade', 'Trade / shop license', true),
      vendorDoc('inventory', 'Inventory / aisle photo', false),
    ],
    reviewNote: 'Aadhaar and bank verified.',
    reviewedAt: daysAgo(0, 4),
    reviewedBy: 'Aurasure Admin',
    submittedAt: daysAgo(3),
    isOpen: false,
    outletId: null,
    payoutBalance: 0,
  },
  {
    id: 'vnd_3',
    userId: 'usr_7',
    phone: '7000000005',
    module: 'food',
    status: 'approved',
    ownerName: 'Meera Joshi',
    email: 'meera@example.com',
    outletName: 'Meera Thali House',
    legalName: 'Meera Foods',
    description: 'Live vendor (seed).',
    address: '8, MG Road',
    landmark: 'Near Clock Tower',
    city: 'Raipur',
    pin: '492001',
    gstin: '22AABCD9012E1Z8',
    pan: 'ABCDE9012G',
    fssai: '12123456789013',
    tradeLicense: '',
    cuisines: ['South Indian', 'Thali'],
    bank: { accountName: 'Meera Joshi', accountNumber: '9012345678', ifsc: 'SBIN0000001', bankName: 'SBI', upi: 'meera@upi' },
    hours: { open: '11:00', close: '22:30' },
    documents: vendorFoodDocs.map((d) => ({ ...d, verified: true })),
    reviewNote: 'All documents verified.',
    reviewedAt: daysAgo(6),
    reviewedBy: 'Aurasure Admin',
    submittedAt: daysAgo(8),
    isOpen: true,
    outletId: 'rst_1',
    payoutBalance: 1280,
  },
];

const riderDoc = (key, label, verified, note = '') => ({
  key,
  label,
  uri: `https://picsum.photos/seed/aur-r-${key}/640/640`,
  verified,
  note,
});

const riderDocs = [
  riderDoc('aadhaar', 'Aadhaar Card', false),
  riderDoc('drivingLicense', 'Driving Licence', false),
  riderDoc('pan', 'PAN Card', false),
  riderDoc('vehicle', 'Vehicle Registration', false),
  riderDoc('photo', 'Profile Photo', false),
];

const riders = [
  {
    id: 'rdr_1',
    userId: 'usr_4',
    phone: '7000000002',
    status: 'submitted',
    name: 'Imran Khan',
    email: 'imran@example.com',
    city: 'Bhilai',
    pincode: '490001',
    address: 'B-12, Telibandha',
    vehicleType: 'bike',
    vehicleNumber: 'CG04AK1234',
    pan: 'ABCDE1235F',
    aadhaar: '123456789012',
    drivingLicense: 'DL-RAI-2024-004321',
    rcNumber: 'MP04RC2024001',
    trainingCompleted: false,
    quizCompleted: false,
    bank: { accountName: 'Imran Khan', accountNumber: '9876543210', ifsc: 'SBIN0000001', bankName: 'SBI', upi: 'imran@upi' },
    documents: riderDocs.map((d) => ({ ...d })),
    reviewNote: '',
    reviewedAt: null,
    reviewedBy: '',
    submittedAt: daysAgo(2),
    dutyState: 'offline',
    codInHand: 0,
    maxCodLimit: 2000,
    payoutBalance: 0,
    totalTrips: 0,
    totalEarnings: 0,
    currentDayTrips: 0,
    currentDayEarnings: 0,
    rating: 0,
    ratingCount: 0,
    offerCount: 0,
    acceptanceCount: 0,
  },
  {
    id: 'rdr_2',
    userId: 'usr_5',
    phone: '7000000003',
    status: 'approved',
    name: 'Sneha Rao',
    email: 'sneha@example.com',
    city: 'Raipur',
    pincode: '492001',
    address: 'C-5, Shankar Nagar',
    vehicleType: 'scooter',
    vehicleNumber: 'CG05SK2233',
    pan: 'ABCDE2233H',
    aadhaar: '123456789013',
    drivingLicense: 'DL-RAI-2024-004322',
    rcNumber: 'MP04RC2024002',
    trainingCompleted: true,
    quizCompleted: true,
    bank: { accountName: 'Sneha Rao', accountNumber: '2233445566', ifsc: 'HDFC0000011', bankName: 'HDFC Bank', upi: 'sneha@upi' },
    documents: riderDocs.map((d) => ({ ...d, verified: true })),
    reviewNote: 'Approved after all docs verified.',
    reviewedAt: daysAgo(7),
    reviewedBy: 'Aurasure Admin',
    submittedAt: daysAgo(9),
    dutyState: 'online',
    codInHand: 640,
    maxCodLimit: 3000,
    payoutBalance: 320,
    totalTrips: 41,
    totalEarnings: 2450,
    currentDayTrips: 4,
    currentDayEarnings: 260,
    rating: 4.7,
    ratingCount: 38,
    offerCount: 46,
    acceptanceCount: 41,
  },
  {
    id: 'rdr_3',
    userId: 'usr_6',
    phone: '7000000004',
    status: 'under_review',
    name: 'Aditya Singh',
    email: 'aditya@example.com',
    city: 'Raipur',
    pincode: '492001',
    address: '12, Marine Drive',
    vehicleType: 'ev',
    vehicleNumber: 'CG06EV4411',
    pan: 'ABCDE4411J',
    aadhaar: '123456789014',
    drivingLicense: 'DL-RAI-2024-004323',
    rcNumber: 'MP04RC2024003',
    trainingCompleted: true,
    quizCompleted: true,
    bank: { accountName: 'Aditya Singh', accountNumber: '4455667788', ifsc: 'ICIC0000011', bankName: 'ICICI Bank', upi: 'aditya@upi' },
    documents: riderDocs.map((d, i) => ({ ...d, verified: i < 3 })),
    reviewNote: 'Vehicle RC under review.',
    reviewedAt: daysAgo(0, 3),
    reviewedBy: 'Aurasure Admin',
    submittedAt: daysAgo(4),
    dutyState: 'offline',
    codInHand: 0,
    maxCodLimit: 2000,
    payoutBalance: 0,
    totalTrips: 0,
    totalEarnings: 0,
    currentDayTrips: 0,
    currentDayEarnings: 0,
    rating: 0,
    ratingCount: 0,
    offerCount: 0,
    acceptanceCount: 0,
  },
];

const deliveryTasks = [
  {
    id: 'task_1',
    code: 'DLV-AUR-1003',
    orderCode: 'AUR-1003',
    orderId: 'ord_4',
    module: 'food',
    state: 'available',
    vendorName: 'Meera Thali House',
    vendorPhone: '7000000005',
    total: 520,
    codAmount: 520,
    deliveryFee: 29,
    riderPayout: 35,
    items: [{ name: 'Aurora Classic Burger', qty: 2, price: 249 }],
    pickup: { name: 'Meera Thali House', phone: '7000000005', address: '8, MG Road, Raipur 492001', otp: '1234' },
    drop: { name: 'Nisha Patel', phone: '9876543210', address: '101, Sector 2, Raipur 492001', otp: '4321' },
    riderId: '',
    riderName: '',
    riderPhone: '',
    createdAt: daysAgo(0, 1),
    acceptedAt: null,
    deliveredAt: null,
    note: '',
  },
  {
    id: 'task_2',
    code: 'DLV-AUR-1012',
    orderCode: 'AUR-1012',
    orderId: 'ord_13',
    module: 'shop',
    state: 'accepted',
    vendorName: 'Aditya Gadgets',
    vendorPhone: '7000000004',
    total: 2999,
    codAmount: 0,
    deliveryFee: 0,
    riderPayout: 25,
    items: [{ name: 'Aura ANC Headphones', qty: 1, price: 4999 }],
    pickup: { name: 'Aditya Gadgets', phone: '7000000004', address: '12, Marine Drive, Raipur 492001', otp: '2233' },
    drop: { name: 'Rohan Verma', phone: '7000000001', address: 'Shop 4, Civil Lines, Raipur 492001', otp: '3322' },
    riderId: 'rdr_2',
    riderName: 'Sneha Rao',
    riderPhone: '7000000003',
    createdAt: daysAgo(0, 2),
    acceptedAt: daysAgo(0, 2),
    deliveredAt: null,
    note: '',
  },
  {
    id: 'task_3',
    code: 'DLV-AUR-1009',
    orderCode: 'AUR-1009',
    orderId: 'ord_10',
    module: 'food',
    state: 'delivered',
    vendorName: 'Rohan Kitchen',
    vendorPhone: '7000000001',
    total: 340,
    codAmount: 340,
    deliveryFee: 29,
    riderPayout: 35,
    items: [{ name: 'Truffle Margherita', qty: 1, price: 329 }],
    pickup: { name: 'Rohan Kitchen', phone: '7000000001', address: 'Shop 4, Civil Lines, Raipur 492001', otp: '4455' },
    drop: { name: 'Sneha Rao', phone: '7000000003', address: 'C-5, Shankar Nagar, Raipur 492001', otp: '5544' },
    riderId: 'rdr_2',
    riderName: 'Sneha Rao',
    riderPhone: '7000000003',
    createdAt: daysAgo(1, 5),
    acceptedAt: daysAgo(1, 5),
    deliveredAt: daysAgo(1, 4),
    note: '',
  },
];

const auditEntries = [
  {
    id: 'aud_1',
    actorId: 'usr_1',
    actorName: 'Aurasure Admin',
    action: 'vendor.approve',
    targetType: 'vendor',
    targetId: 'vnd_3',
    targetCode: 'Meera Thali House',
    detail: 'All documents verified',
    ip: '127.0.0.1',
    createdAt: daysAgo(6),
  },
  {
    id: 'aud_2',
    actorId: 'usr_1',
    actorName: 'Aurasure Admin',
    action: 'rider.approve',
    targetType: 'rider',
    targetId: 'rdr_2',
    targetCode: 'Sneha Rao · 7000000003',
    detail: 'Docs verified',
    ip: '127.0.0.1',
    createdAt: daysAgo(7),
  },
  {
    id: 'aud_3',
    actorId: 'usr_1',
    actorName: 'Aurasure Admin',
    action: 'partner.approve',
    targetType: 'partner_application',
    targetId: 'usr_5',
    targetCode: 'Sneha Rao · 7000000003',
    detail: 'Docs verified',
    ip: '127.0.0.1',
    createdAt: daysAgo(9),
  },
  {
    id: 'aud_4',
    actorId: 'usr_1',
    actorName: 'Aurasure Admin',
    action: 'order.status',
    targetType: 'order',
    targetId: 'ord_13',
    targetCode: 'AUR-1012',
    detail: 'preparing → out_for_delivery',
    ip: '127.0.0.1',
    createdAt: daysAgo(0, -3),
  },
  {
    id: 'aud_5',
    actorId: 'usr_1',
    actorName: 'Aurasure Admin',
    action: 'delivery.assign',
    targetType: 'delivery_task',
    targetId: 'task_2',
    targetCode: 'AUR-1012',
    detail: 'Assigned to Sneha Rao (7000000003)',
    ip: '127.0.0.1',
    createdAt: daysAgo(0, -2),
  },
];

/** Append a server-audit entry, mirroring the real API's writeAudit(). */
const pushAudit = (req, action, targetType, targetId, targetCode, detail = '') => {
  auditEntries.unshift({
    id: id('aud'),
    actorId: req.user?._id ?? '',
    actorName: req.user?.name ?? req.user?.phone ?? 'admin',
    action,
    targetType,
    targetId,
    targetCode,
    detail,
    ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  });
};

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
    pendingVendors: vendors.filter((v) => ['submitted', 'under_review'].includes(v.status)).length,
    pendingRiders: riders.filter((r) => ['submitted', 'under_review'].includes(r.status)).length,
    deliveryPartners: riders.length,
    ridersOnline: riders.filter((r) => ['online', 'on_task'].includes(r.dutyState)).length,
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
    const prev = order.status;
    order.status = 'cancelled';
    pushAudit(req, 'order.cancel', 'order', order.id, order.code, `${prev} → cancelled`);
    return ok(res, { order: withUser(order) });
  }
  if (!(status in RANK) || RANK[status] <= RANK[order.status]) {
    return fail(res, 400, 'STATUS_REGRESSION', `Orders can only move forward - it is already ${order.status}`);
  }
  const prev = order.status;
  order.status = status;
  order.etaMinutes = status === 'out_for_delivery' ? 15 : 0;
  pushAudit(req, 'order.status', 'order', order.id, order.code, `${prev} → ${status}`);
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
  pushAudit(
    req,
    req.body.status === 'approved' ? 'partner.approve' : 'partner.reject',
    'partner_application',
    user.id,
    `${user.name} · ${user.phone}`,
    String(req.body.note || ''),
  );
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

/* ------------------------------- vendors --------------------------------- */

app.get('/api/v1/admin/vendors', (req, res) => {
  let rows = [...vendors].sort((a, b) => new Date(b.updatedAt ?? b.submittedAt ?? 0) - new Date(a.updatedAt ?? a.submittedAt ?? 0));
  if (req.query.status) rows = rows.filter((v) => v.status === req.query.status);
  if (req.query.module) rows = rows.filter((v) => v.module === req.query.module);
  rows = search(rows, req.query.q, ['outletName', 'ownerName', 'phone', 'city']);
  const { slice, meta } = paginate(req.query, rows, 30);
  return ok(res, { vendors: slice, pending: vendors.filter((v) => ['submitted', 'under_review'].includes(v.status)).length }, meta);
});

app.get('/api/v1/admin/vendors/:id', (req, res) => {
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) return fail(res, 404, 'VENDOR_NOT_FOUND', 'Vendor not found');
  const user = users.find((u) => u.id === vendor.userId) ?? null;
  const mine = orders.filter((o) => o.vendorId === vendor.id).slice(0, 20).map(withUser);
  const requiredDocuments =
    vendor.module === 'food'
      ? vendorFoodDocs.map(({ key, label }) => ({ key, label }))
      : [
          { key: 'aadhaar', label: 'Owner Aadhaar (front + back)' },
          { key: 'pan', label: 'PAN card' },
          { key: 'gst', label: 'GST certificate (or declaration)' },
          { key: 'bank', label: 'Cancelled cheque / bank passbook' },
          { key: 'outlet', label: 'Outlet / storefront photo' },
          { key: 'interior', label: 'Shop floor photo' },
          { key: 'trade', label: 'Trade / shop license' },
          { key: 'inventory', label: 'Inventory / aisle photo' },
        ];
  return ok(res, { vendor, user, orders: mine, requiredDocuments });
});

app.patch('/api/v1/admin/vendors/:id', (req, res) => {
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) return fail(res, 404, 'VENDOR_NOT_FOUND', 'Vendor not found');
  const { status, note } = req.body ?? {};
  const allowed = ['under_review', 'needs_info', 'approved', 'rejected', 'suspended', 'onboarding'];
  if (!allowed.includes(status)) return fail(res, 400, 'INVALID_DECISION', 'Invalid decision');
  if (status === 'approved') {
    if (!vendor.documents.every((d) => d.verified)) {
      return fail(res, 400, 'DOCS_NOT_VERIFIED', 'Verify every document before approving this outlet');
    }
    vendor.isOpen = true;
  }
  vendor.status = status;
  vendor.reviewedAt = new Date().toISOString();
  vendor.reviewedBy = req.user.name || req.user.id;
  if (note) vendor.reviewNote = String(note).slice(0, 400);
  if (status === 'suspended' || status === 'rejected') vendor.isOpen = false;
  pushAudit(req, status === 'approved' ? 'vendor.approve' : `vendor.${status}`, 'vendor', vendor.id, vendor.outletName || vendor.phone, String(note || ''));
  return ok(res, { vendor });
});

app.patch('/api/v1/admin/vendors/:id/documents', (req, res) => {
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) return fail(res, 404, 'VENDOR_NOT_FOUND', 'Vendor not found');
  const { key, verified, note } = req.body ?? {};
  const doc = (vendor.documents || []).find((d) => d.key === key);
  if (!doc) return fail(res, 404, 'DOC_NOT_FOUND', 'Document slot not found');
  doc.verified = Boolean(verified);
  if (note !== undefined) doc.note = String(note).slice(0, 200);
  if (vendor.status === 'submitted') vendor.status = 'under_review';
  return ok(res, { vendor });
});

/* -------------------------------- riders --------------------------------- */

app.get('/api/v1/admin/riders', (req, res) => {
  let rows = [...riders].sort((a, b) => new Date(b.updatedAt ?? b.submittedAt ?? 0) - new Date(a.updatedAt ?? a.submittedAt ?? 0));
  if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
  if (req.query.dutyState) rows = rows.filter((r) => r.dutyState === req.query.dutyState);
  rows = search(rows, req.query.q, ['name', 'phone', 'city', 'vehicleNumber']);
  const { slice, meta } = paginate(req.query, rows, 30);
  return ok(res, { riders: slice, pending: riders.filter((r) => ['submitted', 'under_review'].includes(r.status)).length }, meta);
});

app.get('/api/v1/admin/riders/:id', (req, res) => {
  const rider = riders.find((r) => r.id === req.params.id);
  if (!rider) return fail(res, 404, 'RIDER_NOT_FOUND', 'Delivery partner not found');
  const user = users.find((u) => u.id === rider.userId) ?? null;
  const tasks = deliveryTasks.filter((t) => t.riderId === rider.id);
  const requiredDocuments = riderDocs.map(({ key, label }) => ({ key, label }));
  return ok(res, { rider, user, tasks, requiredDocuments });
});

app.patch('/api/v1/admin/riders/:id', (req, res) => {
  const rider = riders.find((r) => r.id === req.params.id);
  if (!rider) return fail(res, 404, 'RIDER_NOT_FOUND', 'Delivery partner not found');
  const { status, note } = req.body ?? {};
  const allowed = ['under_review', 'needs_info', 'approved', 'rejected', 'suspended', 'onboarding'];
  if (!allowed.includes(status)) return fail(res, 400, 'INVALID_DECISION', 'Invalid decision');
  if (status === 'approved') {
    if (!rider.documents.every((d) => d.verified)) {
      return fail(res, 400, 'DOCS_NOT_VERIFIED', 'Verify every document before approving this partner');
    }
  }
  rider.status = status;
  rider.reviewedAt = new Date().toISOString();
  rider.reviewedBy = req.user.name || req.user.id;
  if (note) rider.reviewNote = String(note).slice(0, 400);
  if (status === 'suspended' || status === 'rejected') rider.dutyState = 'offline';
  pushAudit(req, status === 'approved' ? 'rider.approve' : `rider.${status}`, 'rider', rider.id, rider.name || rider.phone, String(note || ''));
  return ok(res, { rider });
});

app.patch('/api/v1/admin/riders/:id/documents', (req, res) => {
  const rider = riders.find((r) => r.id === req.params.id);
  if (!rider) return fail(res, 404, 'RIDER_NOT_FOUND', 'Delivery partner not found');
  const { key, verified, note } = req.body ?? {};
  const doc = (rider.documents || []).find((d) => d.key === key);
  if (!doc) return fail(res, 404, 'DOC_NOT_FOUND', 'Document slot not found');
  doc.verified = Boolean(verified);
  if (note !== undefined) doc.note = String(note).slice(0, 200);
  if (rider.status === 'submitted') rider.status = 'under_review';
  return ok(res, { rider });
});

app.patch('/api/v1/admin/riders/:id/cod-deposits/:depositId', (req, res) => {
  const rider = riders.find((r) => r.id === req.params.id);
  if (!rider) return fail(res, 404, 'RIDER_NOT_FOUND', 'Delivery partner not found');
  const deposit = (rider.codDeposits || []).find((d) => d.id === req.params.depositId);
  if (!deposit) return fail(res, 404, 'DEPOSIT_NOT_FOUND', 'Deposit not found');
  const { status, note } = req.body ?? {};
  if (!['confirmed', 'failed'].includes(status)) return fail(res, 400, 'INVALID_STATUS', 'Status must be confirmed or failed');
  deposit.status = status;
  if (note !== undefined) deposit.note = String(note).slice(0, 200);
  return ok(res, { rider });
});

/* ---------------------------- delivery tasks ----------------------------- */

app.get('/api/v1/admin/delivery/tasks', (req, res) => {
  let rows = [...deliveryTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (req.query.state) rows = rows.filter((t) => t.state === req.query.state);
  const { slice, meta } = paginate(req.query, rows, 30);
  return ok(res, { tasks: slice }, meta);
});

app.get('/api/v1/admin/delivery/tasks/:id', (req, res) => {
  const task = deliveryTasks.find((t) => t.id === req.params.id);
  if (!task) return fail(res, 404, 'TASK_NOT_FOUND', 'Delivery task not found');
  return ok(res, { task });
});

app.get('/api/v1/admin/delivery/riders', (req, res) => {
  const activeByRider = new Map(
    deliveryTasks
      .filter((t) => ['accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(t.state))
      .map((t) => [t.riderId, t]),
  );
  return ok(res, {
    riders: riders
      .filter((r) => r.status === 'approved' && r.dutyState !== 'offline')
      .map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        vehicleType: r.vehicleType,
        vehicleNumber: r.vehicleNumber,
        dutyState: r.dutyState,
        codInHand: r.codInHand,
        maxCodLimit: r.maxCodLimit,
        currentDayTrips: r.currentDayTrips,
        activeTask: activeByRider.get(r.id) || null,
      })),
  });
});

const mockAssign = (task, rider) => {
  task.state = 'accepted';
  task.riderId = rider.id;
  task.riderName = rider.name;
  task.riderPhone = rider.phone;
  task.acceptedAt = new Date().toISOString();
  rider.dutyState = 'on_task';
  rider.offerCount = Number(rider.offerCount || 0) + 1;
  rider.acceptanceCount = Number(rider.acceptanceCount || 0) + 1;
  return task;
};

app.post('/api/v1/admin/delivery/tasks/:id/assign', (req, res) => {
  const task = deliveryTasks.find((t) => t.id === req.params.id);
  if (!task) return fail(res, 404, 'TASK_NOT_FOUND', 'Delivery task not found');
  if (task.state !== 'available') return fail(res, 400, 'TASK_TAKEN', `Task is already ${task.state}`);
  const rider = riders.find((r) => r.id === req.body?.riderId);
  if (!rider || rider.status !== 'approved') return fail(res, 400, 'RIDER_NOT_APPROVED', 'Pick an approved delivery partner');
  const codAmount = Number(task.codAmount) || 0;
  if (codAmount > 0 && rider.codInHand + codAmount > rider.maxCodLimit) {
    return fail(res, 400, 'COD_LIMIT_EXCEEDED', `Rider has ₹${Math.round(rider.codInHand)} COD in hand; assigning ${rider.name} would cross their limit`);
  }
  const assigned = mockAssign(task, rider);
  pushAudit(req, 'delivery.assign', 'delivery_task', task.id, task.orderCode, `Assigned to ${rider.name} (${rider.phone})`);
  return ok(res, { task: assigned });
});

app.post('/api/v1/admin/orders/:id/assign-rider', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.status !== 'out_for_delivery') return fail(res, 400, 'NOT_READY', 'Move the order to out_for_delivery before assigning a rider');
  const rider = riders.find((r) => r.id === req.body?.riderId);
  if (!rider || rider.status !== 'approved') return fail(res, 400, 'RIDER_NOT_APPROVED', 'Pick an approved delivery partner');
  let task = deliveryTasks.find((t) => t.orderId === order.id);
  if (!task) {
    task = {
      id: id('task'),
      code: `DLV-${order.code}`,
      orderCode: order.code,
      orderId: order.id,
      module: order.module,
      state: 'available',
      vendorName: 'Vendor',
      vendorPhone: '',
      total: order.total,
      codAmount: order.payBy === 'cod' ? order.total : 0,
      deliveryFee: order.deliveryFee,
      riderPayout: Math.max(order.deliveryFee, 25),
      items: order.items.map((it) => ({ name: it.name, qty: it.qty, price: it.unitPrice })),
      pickup: { name: 'Vendor', phone: '', address: order.address, otp: '1234' },
      drop: { name: order.user?.name ?? 'Customer', phone: order.user?.phone ?? '', address: order.address, otp: '4321' },
      riderId: '',
      riderName: '',
      riderPhone: '',
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      deliveredAt: null,
      note: '',
    };
    deliveryTasks.unshift(task);
  }
  if (task.state !== 'available') return fail(res, 400, 'TASK_TAKEN', `Task is already ${task.state}`);
  const assigned = mockAssign(task, rider);
  pushAudit(req, 'delivery.assign', 'delivery_task', task.id, order.code, `Assigned to ${rider.name} (${rider.phone})`);
  return ok(res, { task: assigned, orderId: order.id });
});

/* --------------------------------- audit --------------------------------- */

app.get('/api/v1/admin/audit', (req, res) => {
  let rows = [...auditEntries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  rows = search(rows, req.query.q, ['actorName', 'action', 'targetCode', 'targetType']);
  const { slice, meta } = paginate(req.query, rows, 50);
  return ok(res, { entries: slice }, meta);
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
