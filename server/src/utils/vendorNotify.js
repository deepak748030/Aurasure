'use strict';

/**
 * Vendor-facing alerts.
 *
 * A kitchen cannot rely on the app being foregrounded, so order events are
 * pushed to every device the vendor registered. Dead tokens reported by Expo
 * are pruned so the list does not grow stale.
 *
 * Every export is fire-and-forget safe: failures are logged, never thrown,
 * so a push outage can never fail or roll back an order write.
 */

const Vendor = require('../models/Vendor');
const { sendExpoPush } = require('./push');

function money(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
}

function itemSummary(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return '';
  const count = items.reduce((sum, line) => sum + (Number(line.qty) || 1), 0);
  const first = items[0].name || 'item';
  return items.length === 1 ? `${count}× ${first}` : `${count} items · ${first} +${items.length - 1} more`;
}

/** Removes tokens Expo rejected. Silent on failure. */
async function pruneTokens(vendorId, invalidTokens) {
  if (!vendorId || !invalidTokens.length) return;
  try {
    await Vendor.updateOne(
      { id: vendorId },
      { $pull: { pushTokens: { token: { $in: invalidTokens } } } },
    );
  } catch (err) {
    console.warn('[push] token prune failed:', err.message);
  }
}

/**
 * Pushes a payload to every device belonging to one vendor.
 * @returns {Promise<number>} how many devices accepted the message.
 */
async function notifyVendor(vendorId, payload) {
  if (!vendorId) return 0;
  try {
    const vendor = await Vendor.findOne({ id: vendorId }).select('id pushTokens').lean();
    const tokens = (vendor?.pushTokens || []).map((entry) => entry.token);
    if (!tokens.length) return 0;
    const { sent, invalidTokens } = await sendExpoPush(tokens, payload);
    await pruneTokens(vendorId, invalidTokens);
    return sent;
  } catch (err) {
    console.warn('[push] notifyVendor failed:', err.message);
    return 0;
  }
}

/**
 * "You have a new order" — the alert the order board depends on.
 * Uses the dedicated `orders` channel so the vendor app can give it a loud,
 * bypass-DND sound separate from marketing pushes.
 */
function notifyVendorNewOrder(order) {
  if (!order || !order.vendorId) return Promise.resolve(0);
  const summary = itemSummary(order);
  return notifyVendor(order.vendorId, {
    title: `New order ${order.code}`,
    body: [summary, money(order.total), String(order.payBy || 'cod').toUpperCase()]
      .filter(Boolean)
      .join(' · '),
    channelId: 'orders',
    sound: 'default',
    priority: 'high',
    interruptionLevel: 'time-sensitive',
    // Expo drops the message if the device is offline longer than this; a
    // stale "new order" ping is worse than none.
    ttl: 300,
    data: {
      type: 'order.new',
      orderId: order.id,
      orderCode: order.code,
      status: 'placed',
    },
  });
}

/** The customer cancelled an order the vendor may already be cooking. */
function notifyVendorOrderCancelled(order, reason = '') {
  if (!order || !order.vendorId) return Promise.resolve(0);
  return notifyVendor(order.vendorId, {
    title: `Order ${order.code} cancelled`,
    body: reason ? String(reason).slice(0, 120) : 'The customer cancelled this order.',
    channelId: 'orders',
    priority: 'high',
    ttl: 600,
    data: { type: 'order.cancelled', orderId: order.id, orderCode: order.code, status: 'cancelled' },
  });
}

/** A rider accepted the trip and is heading to the outlet. */
function notifyVendorRiderAssigned(order, riderName = '') {
  if (!order || !order.vendorId) return Promise.resolve(0);
  return notifyVendor(order.vendorId, {
    title: `Rider assigned · ${order.code}`,
    body: riderName ? `${riderName} is on the way for pickup.` : 'A delivery partner is on the way for pickup.',
    channelId: 'orders',
    ttl: 600,
    data: { type: 'order.rider_assigned', orderId: order.id, orderCode: order.code },
  });
}

module.exports = {
  notifyVendor,
  notifyVendorNewOrder,
  notifyVendorOrderCancelled,
  notifyVendorRiderAssigned,
};
