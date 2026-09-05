'use strict';

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const DeliveryTask = require('../models/DeliveryTask');
const DeliveryPartner = require('../models/DeliveryPartner');
const { newId } = require('./id');
const { creditVendorPayout } = require('./payout');

const makeOtp = () => String(Math.floor(1000 + Math.random() * 9000));

/** Minimum guaranteed payout per trip when an order has no delivery fee. */
const MIN_RIDER_PAYOUT = 25;

/**
 * Idempotently create the rider task for an order that is moving to
 * `out_for_delivery`. If a task already exists it is returned as-is.
 * Saves `order.deliveryTaskId` on the order.
 */
async function createDeliveryTaskForOrder(order) {
  if (!order || !order.id) throw new Error('createDeliveryTaskForOrder requires an order');

  const existing = await DeliveryTask.findOne({ orderId: order._id.toString() });
  if (existing) return existing;

  const [user, vendor] = await Promise.all([
    User.findById(order.user).select('id name phone').lean(),
    order.vendorId ? Vendor.findOne({ id: order.vendorId }).lean() : null,
  ]);

  const codAmount = order.payBy === 'cod' ? Number(order.total) || 0 : 0;
  const riderPayout = Math.max(Number(order.deliveryFee) || 0, MIN_RIDER_PAYOUT);
  const dropName = user ? user.name : 'Customer';
  const dropPhone = user ? user.phone : '';
  const vendorName = vendor?.outletName || vendor?.name || 'Outlet';
  const vendorPhone = vendor?.phone || '';
  const vendorAddress = vendor
    ? [vendor.address, vendor.city, vendor.pin].filter(Boolean).join(', ')
    : 'Pickup point';

  const task = await DeliveryTask.create({
    id: newId('task'),
    code: `DLV-${order.code.replace(/^AUR-/, '')}`,
    orderId: order._id.toString(),
    orderCode: order.code,
    module: order.module,
    vendorId: order.vendorId || null,
    vendorName,
    vendorPhone,
    total: Number(order.total) || 0,
    codAmount,
    deliveryFee: Number(order.deliveryFee) || 0,
    riderPayout,
    distanceKm: 0,
    items: (order.items || []).map((it) => ({ name: it.name, qty: it.qty || 1, price: it.unitPrice || 0 })),
    pickup: {
      name: vendorName,
      phone: vendorPhone,
      address: vendorAddress,
      otp: makeOtp(),
      lat: vendor?.geo?.lat ?? null,
      lng: vendor?.geo?.lng ?? null,
    },
    drop: {
      name: dropName,
      phone: dropPhone,
      address: String(order.address || '').trim(),
      otp: makeOtp(),
      lat: null,
      lng: null,
    },
    state: 'available',
  });

  order.deliveryTaskId = task.id;
  await order.save();
  return task;
}

/**
 * Finishes a task as `delivered`: marks the order delivered, credits the
 * vendor payout, and updates the rider's earnings / COD-in-hand.
 * Must be called only after the rider's drop OTP has been verified.
 */
async function completeDeliveryTask(task, { rider, podUrl = '', note = '' } = {}) {
  const order = task.orderId ? await Order.findById(task.orderId) : null;
  if (!order) throw new Error('Order missing for task');

  const wasDelivered = order.status === 'delivered';
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.payoutCredited = Boolean(order.payoutCredited);
  order.deliveryTaskId = task.id;
  order.deliveryPartnerId = rider?.id || task.riderId;
  order.deliveryPartnerName = rider?.name || task.riderName || '';
  order.deliveryPartnerPhone = rider?.phone || task.riderPhone || '';
  if (!wasDelivered) {
    await creditVendorPayout(order);
  }
  await order.save();

  task.state = 'delivered';
  task.deliveredAt = new Date();
  task.podUrl = podUrl || task.podUrl;
  task.note = note || task.note;
  await task.save();

  if (rider) {
    const payout = Number(task.riderPayout) || 0;
    const codAmount = Number(task.codAmount) || 0;
    const today = new Date().toISOString().slice(0, 10);
    if (rider.currentDayDate !== today) {
      rider.currentDayDate = today;
      rider.currentDayTrips = 0;
      rider.currentDayEarnings = 0;
    }
    rider.totalTrips = Number(rider.totalTrips || 0) + 1;
    rider.totalEarnings = Math.round((Number(rider.totalEarnings || 0) + payout) * 100) / 100;
    rider.currentDayTrips = Number(rider.currentDayTrips || 0) + 1;
    rider.currentDayEarnings = Math.round((Number(rider.currentDayEarnings || 0) + payout) * 100) / 100;
    rider.payoutBalance = Math.round((Number(rider.payoutBalance || 0) + payout) * 100) / 100;
    rider.codInHand = Math.max(0, Math.round((Number(rider.codInHand || 0) + codAmount) * 100) / 100);
    rider.dutyState = 'online';
    await rider.save();
  }

  return { order, task };
}

module.exports = { createDeliveryTaskForOrder, completeDeliveryTask, MIN_RIDER_PAYOUT };
