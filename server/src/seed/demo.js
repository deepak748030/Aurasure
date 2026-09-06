'use strict';

/**
 * Rich demo dataset — everything an operator needs to click through the whole
 * platform and confirm it works end to end.
 *
 * `src/seed.js` seeds the catalogue and the three demo logins. This module
 * layers the *operational* story on top of them:
 *
 *   - a second (shop) vendor so the non-food vendor flow is testable
 *   - extra customers so orders are not all from one person
 *   - vendor orders in every status, on both vendors
 *   - delivery tasks in every rider state
 *   - support tickets (customer + vendor), notifications and payments
 *
 * Everything is upserted on a stable `id` / `code`, so re-running is safe.
 */

const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { newId } = require('../utils/id');

const User = require('../models/User');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const ShopStore = require('../models/ShopStore');
const Product = require('../models/Product');
const DeliveryTask = require('../models/DeliveryTask');
const DeliveryPartner = require('../models/DeliveryPartner');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const { emptyDocs: emptyVendorDocs } = require('../utils/vendorDocs');

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const pic = (seed) => ({ kind: 'uri', uri: `https://picsum.photos/seed/${seed}/640/480` });

/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */

/** Three more customers so order lists, ratings and tickets look real. */
async function seedExtraCustomers() {
  const people = [
    { name: 'Priya Nair', phone: '9812345001', city: 'Raipur', wallet: 450, points: 620 },
    { name: 'Imran Sheikh', phone: '9812345002', city: 'Bhilai', wallet: 0, points: 90 },
    { name: 'Meera Joshi', phone: '9812345003', city: 'Raipur', wallet: 1200, points: 2310 },
  ];
  const out = [];
  for (const person of people) {
    let user = await User.findOne({ phone: person.phone });
    if (!user) {
      const passwordHash = await bcrypt.hash('aurasure123', config.auth.bcryptRounds);
      user = await User.create({
        id: newId('usr'),
        name: person.name,
        phone: person.phone,
        email: `${person.name.split(' ')[0].toLowerCase()}@example.com`,
        passwordHash,
        wallet: person.wallet,
        walletTxs: person.wallet
          ? [{ id: newId('wtx'), type: 'credit', title: 'Welcome bonus', note: 'Seeded demo balance', amount: person.wallet, balanceAfter: person.wallet, createdAt: daysAgo(9) }]
          : [],
        loyaltyPoints: person.points,
        loyaltyTxs: person.points
          ? [{ id: newId('ltx'), type: 'earned', title: 'Order reward', note: 'Seeded demo points', points: person.points, balanceAfter: person.points, createdAt: daysAgo(6) }]
          : [],
        addresses: [{ id: newId('adr'), label: 'Home', line: `${person.city} · seeded demo address`, city: person.city, pin: '492001', isDefault: true }],
      });
    }
    out.push(user);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Second vendor: a shop, so the non-food vendor journey is testable
 * ------------------------------------------------------------------ */

/** Shop vendor login: 7777777788 / vendor@123 — approved, with a live store. */
async function seedShopVendor() {
  const phone = process.env.SEED_SHOP_VENDOR_PHONE || '7777777788';
  const password = process.env.SEED_SHOP_VENDOR_PASSWORD || 'vendor@123';

  let user = await User.findOne({ phone });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    user = await User.create({ id: newId('usr'), name: 'Demo Electronics', phone, passwordHash, role: 'vendor' });
  } else if (user.role !== 'vendor') {
    return null;
  }

  const docs = emptyVendorDocs('shop').map((doc) => ({
    key: doc.key,
    label: doc.label,
    uri: `https://picsum.photos/seed/aur-shop-${doc.key}/640/640`,
    verified: true,
    note: '',
  }));

  let vendor = await Vendor.findOne({ phone });
  if (!vendor) {
    vendor = await Vendor.create({
      id: newId('vnd'),
      userId: user.id,
      phone,
      module: 'shop',
      status: 'approved',
      ownerName: user.name,
      email: 'demo.electronics@example.com',
      outletName: 'Aura Demo Electronics',
      legalName: 'Aura Demo Retail LLP',
      description: 'Demo electronics store created by the seeder.',
      address: 'Shop 21, Pandri Main Road',
      landmark: 'Opposite bus stand',
      city: 'Raipur',
      pin: '492001',
      gstin: '22AABCD9999E1Z5',
      pan: 'ABCDE9999E',
      tradeLicense: 'TL-RAI-2024-9911',
      categoryIds: ['sc_audio', 'sc_phones'],
      minOrder: 199,
      deliveryFee: 29,
      deliveryMins: 42,
      bank: { accountName: 'Demo Electronics', accountNumber: '5566778899', ifsc: 'ICIC0000001', bankName: 'ICICI Bank', upi: 'demoelectronics@upi' },
      hours: { open: '09:30', close: '21:30' },
      geo: { lat: 21.2365, lng: 81.638 },
      cover: pic('aur-shop-vendor'),
      documents: docs,
      submittedAt: daysAgo(20),
      reviewedAt: daysAgo(18),
      reviewedBy: 'seeder',
      isOpen: true,
      acceptingOrders: true,
      payoutBalance: 12750,
    });
  } else if (vendor.status !== 'approved') {
    vendor.status = 'approved';
    vendor.documents = docs;
    vendor.isOpen = true;
    vendor.acceptingOrders = true;
    await vendor.save();
  }

  // Storefront + catalogue.
  const storeId = vendor.outletId || `s_demo_${vendor.id.slice(-6)}`;
  await ShopStore.updateOne(
    { id: storeId },
    {
      $set: {
        id: storeId,
        name: vendor.outletName,
        brand: 'Aura Demo',
        road: 'Pandri Main Road',
        house: 'Shop 21',
        city: 'Raipur',
        pin: '492001',
        lat: 21.2365,
        lng: 81.638,
        rating: 4.4,
        reviews: 318,
        deliveryMins: 42,
        deliveryFee: 29,
        minOrder: 199,
        promo: 'Flat ₹200 OFF above ₹1,999',
        isPopular: true,
        tags: ['Audio', 'Phones'],
        categoryIds: ['sc_audio', 'sc_phones'],
        cover: pic('aur-shop-vendor'),
        vendorId: vendor.id,
        isClosed: false,
      },
    },
    { upsert: true },
  );
  if (vendor.outletId !== storeId) {
    vendor.outletId = storeId;
    await vendor.save();
  }

  const products = [
    { id: 'vp1', name: 'Aura Demo ANC Headphones', brand: 'Aura', price: 4999, mrp: 6999, categoryId: 'sc_audio', isBestseller: true, stockQty: 24 },
    { id: 'vp2', name: 'Aura Demo Wireless Earbuds', brand: 'Aura', price: 1999, mrp: 2999, categoryId: 'sc_audio', isTrending: true, stockQty: 60 },
    { id: 'vp3', name: 'Aura Demo Bluetooth Speaker', brand: 'Aura', price: 2499, mrp: 3499, categoryId: 'sc_audio', stockQty: 18 },
    { id: 'vp4', name: 'Aura Demo Smartphone 5G', brand: 'Aura', price: 15999, mrp: 18999, categoryId: 'sc_phones', isBestseller: true, stockQty: 9 },
    { id: 'vp5', name: 'Aura Demo Fast Charger 65W', brand: 'Aura', price: 1299, mrp: 1799, categoryId: 'sc_phones', stockQty: 120 },
    { id: 'vp6', name: 'Aura Demo Power Bank 20000mAh', brand: 'Aura', price: 1799, mrp: 2499, categoryId: 'sc_phones', inStock: false, stockQty: 0 },
    // Deliberately left pending so the admin catalogue-approval queue has work.
    { id: 'vp7', name: 'Aura Demo Smartwatch Pro', brand: 'Aura', price: 3499, mrp: 4999, categoryId: 'sc_audio', approvalStatus: 'pending', stockQty: 30 },
  ];
  for (const product of products) {
    await Product.updateOne(
      { id: product.id },
      {
        $set: {
          inStock: true,
          approvalStatus: 'approved',
          rating: 4.3,
          reviews: 96,
          deliveryMins: 42,
          tags: ['Demo'],
          ...product,
          storeId,
          image: pic(product.id),
        },
      },
      { upsert: true },
    );
  }

  return { vendor, storeId, products: products.length };
}

/* ------------------------------------------------------------------ *
 * Orders for the shop vendor
 * ------------------------------------------------------------------ */

async function seedShopVendorOrders(vendor, customers) {
  if (!vendor || !vendor.outletId || !customers.length) return 0;
  const line = (refId, name, unitPrice, qty, meta = '') => ({ id: newId('lin'), refId, kind: 'shop', name, meta, unitPrice, qty, image: null });

  const board = [
    { code: 'AUR-VS-50001', status: 'placed', placedAt: minsAgo(5), payBy: 'upi', items: [line('vp2', 'Aura Demo Wireless Earbuds', 1999, 1)], address: '14, Shankar Nagar, Raipur 492007', instructions: 'Call before delivery.' },
    { code: 'AUR-VS-50002', status: 'confirmed', placedAt: minsAgo(40), payBy: 'cod', items: [line('vp1', 'Aura Demo ANC Headphones', 4999, 1), line('vp5', 'Aura Demo Fast Charger 65W', 1299, 1)], address: '9B, Lake View, Telibandha, Raipur 492006' },
    { code: 'AUR-VS-50003', status: 'out_for_delivery', placedAt: minsAgo(95), payBy: 'wallet', items: [line('vp3', 'Aura Demo Bluetooth Speaker', 2499, 1)], address: 'Tech Park, GE Road, Raipur 492001' },
    { code: 'AUR-VS-50004', status: 'delivered', placedAt: daysAgo(2), payBy: 'upi', items: [line('vp4', 'Aura Demo Smartphone 5G', 15999, 1)], address: '402, Aurora Heights, Civil Lines, Raipur 492001', deliveredAt: daysAgo(2), payoutCredited: true },
    { code: 'AUR-VS-50005', status: 'delivered', placedAt: daysAgo(5), payBy: 'cod', items: [line('vp5', 'Aura Demo Fast Charger 65W', 1299, 2)], address: '21, Pandri, Raipur 492004', deliveredAt: daysAgo(5), payoutCredited: true },
    { code: 'AUR-VS-50006', status: 'cancelled', placedAt: daysAgo(6), payBy: 'cod', items: [line('vp6', 'Aura Demo Power Bank 20000mAh', 1799, 1)], address: '3, Byron Bazar, Raipur 492001', cancelReason: 'Item out of stock at the store' },
  ];

  let written = 0;
  for (let index = 0; index < board.length; index += 1) {
    const entry = board[index];
    if (await Order.findOne({ code: entry.code })) continue;
    const itemTotal = entry.items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    const deliveryFee = itemTotal >= 1999 ? 0 : 29;
    await Order.create({
      id: newId('ord'),
      user: customers[index % customers.length]._id,
      module: 'shop',
      vendorId: vendor.id,
      outletId: vendor.outletId,
      itemTotal,
      deliveryFee,
      discount: 0,
      total: itemTotal + deliveryFee,
      walletPaid: entry.payBy === 'wallet' ? itemTotal + deliveryFee : 0,
      loyaltyEarned: Math.round(itemTotal / 40),
      instructions: '',
      ...entry,
    });
    written += 1;
  }
  return written;
}

/* ------------------------------------------------------------------ *
 * Delivery tasks in every rider state
 * ------------------------------------------------------------------ */

/**
 * One task per rider state so the Rider app can be walked through the whole
 * trip without waiting for a real customer order.
 */
async function seedRiderTasks(foodVendor, rider) {
  if (!foodVendor) return 0;
  const pickup = {
    name: foodVendor.outletName,
    phone: foodVendor.phone,
    address: `${foodVendor.address}, ${foodVendor.city} ${foodVendor.pin}`,
    lat: foodVendor.geo?.lat ?? 21.2514,
    lng: foodVendor.geo?.lng ?? 81.6296,
    otp: '1234',
  };
  const drops = [
    { name: 'Priya Nair', phone: '9812345001', address: '14, Shankar Nagar, Raipur 492007', lat: 21.2455, lng: 81.6482, otp: '4321' },
    { name: 'Imran Sheikh', phone: '9812345002', address: '9B, Lake View, Telibandha, Raipur 492006', lat: 21.2298, lng: 81.6531, otp: '5678' },
    { name: 'Meera Joshi', phone: '9812345003', address: 'Tech Park, GE Road, Raipur 492001', lat: 21.2379, lng: 81.6337, otp: '9012' },
  ];

  const plans = [
    { code: 'DLV-AUR-FD-31001', state: 'available', drop: 0, total: 556, note: 'Fresh offer waiting to be accepted' },
    { code: 'DLV-AUR-FD-31002', state: 'available', drop: 1, total: 478, note: 'Second offer so the list is not empty' },
    { code: 'DLV-AUR-FD-31003', state: 'accepted', drop: 2, total: 698, note: 'Accepted — rider is heading to pickup', assign: true },
    { code: 'DLV-AUR-FD-31004', state: 'picked_up', drop: 0, total: 407, note: 'Picked up — on the way to the customer', assign: true },
    { code: 'DLV-AUR-FD-31005', state: 'delivered', drop: 1, total: 892, note: 'Completed trip for the earnings screen', assign: true, done: true },
  ];

  let written = 0;
  for (const plan of plans) {
    if (await DeliveryTask.findOne({ code: plan.code })) continue;
    const drop = drops[plan.drop];
    const deliveryFee = 25;
    await DeliveryTask.create({
      id: newId('task'),
      code: plan.code,
      orderId: newId('ord'),
      orderCode: plan.code.replace('DLV-', ''),
      module: 'food',
      vendorId: foodVendor.id,
      vendorName: foodVendor.outletName,
      vendorPhone: foodVendor.phone,
      total: plan.total,
      codAmount: plan.total,
      deliveryFee,
      riderPayout: Math.max(deliveryFee, 25),
      items: [
        { name: 'Demo Kitchen Butter Chicken', qty: 1, price: 349 },
        { name: 'Demo Kitchen Garlic Naan', qty: 2, price: 69 },
      ],
      pickup,
      drop,
      state: plan.state,
      note: plan.note,
      distanceKm: 3.4,
      ...(plan.assign && rider
        ? { riderId: rider.id, riderName: rider.name, riderPhone: rider.phone, acceptedAt: minsAgo(45) }
        : {}),
      ...(plan.state === 'picked_up' ? { arrivedPickupAt: minsAgo(30), pickedUpAt: minsAgo(25) } : {}),
      ...(plan.done ? { arrivedPickupAt: daysAgo(1), pickedUpAt: daysAgo(1), arrivedDropAt: daysAgo(1), deliveredAt: daysAgo(1) } : {}),
    });
    written += 1;
  }
  return written;
}

/* ------------------------------------------------------------------ *
 * Support, notifications, payments
 * ------------------------------------------------------------------ */

/** Customer tickets in every status for the admin support queue. */
async function seedSupportTickets(customers) {
  if (!customers.length) return 0;
  const rows = [
    { id: 'tkt_demo_1', at: 0, message: 'My order AUR-FD-20517 shows delivered but nothing arrived.', orderCode: 'AUR-FD-20517', status: 'open', response: '' },
    { id: 'tkt_demo_2', at: 1, message: 'Wallet was charged twice for the same order. Please refund one.', orderCode: 'AUR-VS-50004', status: 'in_progress', response: 'We are checking with the payments team, back to you within 24 hours.' },
    { id: 'tkt_demo_3', at: 2, message: 'Coupon AURA50 did not apply at checkout.', orderCode: null, status: 'resolved', response: 'The coupon needed a ₹499 minimum. We have added a fresh one to your account.' },
  ];
  let written = 0;
  for (const row of rows) {
    if (await SupportTicket.findOne({ id: row.id })) continue;
    const user = customers[row.at % customers.length];
    await SupportTicket.create({
      id: row.id,
      userId: user._id,
      userPublicId: user.id,
      name: user.name,
      phone: user.phone,
      message: row.message,
      orderCode: row.orderCode,
      status: row.status,
      response: row.response,
      resolvedAt: row.status === 'resolved' ? daysAgo(1) : null,
      createdAt: daysAgo(row.at + 1),
    });
    written += 1;
  }
  return written;
}

/** Vendor-side issues so the Vendor app's tickets screen has history. */
async function seedVendorIssues(vendor) {
  if (!vendor) return 0;
  if (vendor.issues && vendor.issues.length) return 0;
  vendor.issues = [
    { id: newId('iss'), title: 'Payout: settlement for AUR-VD-40006 not received', body: 'Order was delivered two days ago but the settlement has not shown up in the wallet.', status: 'open', createdAt: daysAgo(1) },
    { id: newId('iss'), title: 'Rider: repeated late pickups in the evening', body: 'Riders are arriving 15-20 minutes after we mark food ready between 8 and 9 PM.', status: 'in_progress', createdAt: daysAgo(4) },
    { id: newId('iss'), title: 'Menu: item stuck in pending approval', body: 'Added a new thali last week, still not visible to customers.', status: 'resolved', createdAt: daysAgo(9) },
  ];
  await vendor.save();
  return vendor.issues.length;
}

/** Broadcast + personal notifications so the bell icon is not empty. */
async function seedNotifications(customers) {
  const rows = [
    { id: 'ntf_demo_1', broadcast: true, module: 'all', title: 'Welcome to Aurasure', body: 'Food and shopping, delivered across Raipur. Use AURA50 on your first order.', icon: 'sparkles', tone: 'primary', kind: 'promo' },
    { id: 'ntf_demo_2', broadcast: true, module: 'food', title: 'Late-night kitchens are live', body: 'Selected kitchens now take orders until 1 AM.', icon: 'flame', tone: 'warning', kind: 'promo' },
    { id: 'ntf_demo_3', broadcast: true, module: 'shop', title: 'Audio week is on', body: 'Up to 40% off headphones and earbuds until Sunday.', icon: 'headphones', tone: 'success', kind: 'promo' },
  ];
  let written = 0;
  for (const row of rows) {
    if (await Notification.findOne({ id: row.id })) continue;
    await Notification.create({ ...row, createdAt: daysAgo(written + 1) });
    written += 1;
  }
  if (customers.length) {
    const personal = { id: 'ntf_demo_4', userId: customers[0].id, title: 'Support replied to your ticket', body: 'We have shared an update on your wallet refund request.', icon: 'message', tone: 'muted', kind: 'support' };
    if (!(await Notification.findOne({ id: personal.id }))) {
      await Notification.create({ ...personal, createdAt: daysAgo(1) });
      written += 1;
    }
  }
  return written;
}

/** Paid / failed payment rows so the admin payments view has data. */
async function seedPayments(customers) {
  if (!customers.length) return 0;
  const rows = [
    { id: 'pay_demo_1', purpose: 'wallet', method: 'upi', amount: 500, status: 'paid', at: 3 },
    { id: 'pay_demo_2', purpose: 'order', method: 'card', amount: 2999, status: 'paid', at: 2 },
    { id: 'pay_demo_3', purpose: 'order', method: 'netbanking', amount: 1799, status: 'failed', at: 1 },
  ];
  let written = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (await Payment.findOne({ id: row.id })) continue;
    await Payment.create({
      id: row.id,
      user: customers[index % customers.length]._id,
      purpose: row.purpose,
      method: row.method,
      amount: row.amount,
      amountPaise: row.amount * 100,
      status: row.status,
      consumed: row.status === 'paid',
      razorpayOrderId: `order_demo_${row.id}`,
      razorpayPaymentId: row.status === 'paid' ? `pay_demo_${index}` : null,
      createdAt: daysAgo(row.at),
    });
    written += 1;
  }
  return written;
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Layers the operational demo data on top of the base seed.
 * @param {object} base `{ demoUser, foodVendor, rider }` from `seed.js`.
 */
async function seedDemoWorld({ demoUser, foodVendor, rider }) {
  const extraCustomers = await seedExtraCustomers();
  const customers = [demoUser, ...extraCustomers].filter(Boolean);

  const shop = await seedShopVendor();
  const shopOrders = await seedShopVendorOrders(shop?.vendor, customers);
  const riderTasks = await seedRiderTasks(foodVendor, rider);
  const tickets = await seedSupportTickets(customers);
  const vendorIssues = await seedVendorIssues(foodVendor);
  const notifications = await seedNotifications(customers);
  const payments = await seedPayments(customers);

  return {
    customers: extraCustomers.length,
    shopVendor: shop ? shop.vendor.phone : null,
    shopProducts: shop ? shop.products : 0,
    shopOrders,
    riderTasks,
    tickets,
    vendorIssues,
    notifications,
    payments,
  };
}

module.exports = { seedDemoWorld };
