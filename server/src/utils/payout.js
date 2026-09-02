'use strict';

const Vendor = require('../models/Vendor');

/** 5% platform fee on item total (not delivery). Idempotent via payoutCredited. */
async function creditVendorPayout(order) {
  if (!order || order.payoutCredited || order.status === 'cancelled' || !order.vendorId) return order;
  const vendor = await Vendor.findOne({ id: order.vendorId });
  if (!vendor) return order;
  const gross = Number(order.itemTotal) || 0;
  const fee = Math.round(gross * 0.05 * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  vendor.payoutBalance = Math.round((Number(vendor.payoutBalance || 0) + net) * 100) / 100;
  await vendor.save();
  order.payoutCredited = true;
  return order;
}

module.exports = { creditVendorPayout };
