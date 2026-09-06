'use strict';

/**
 * Delivery-partner alerts.
 *
 * When a vendor marks an order ready a `DeliveryTask` is published with a
 * 30 second offer window, so a rider who is not looking at the app would miss
 * it entirely. This broadcasts the offer to every online, approved rider that
 * has not already rejected it and is not on another trip.
 *
 * Fire-and-forget: failures are logged, never thrown into the request path.
 */

const DeliveryPartner = require('../models/DeliveryPartner');
const { sendExpoPush } = require('./push');

function money(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
}

async function pruneTokens(tokens) {
  if (!tokens.length) return;
  try {
    await DeliveryPartner.updateMany({ pushToken: { $in: tokens } }, { $set: { pushToken: '' } });
  } catch (err) {
    console.warn('[push] rider token prune failed:', err.message);
  }
}

/** Pushes a payload to one rider. */
async function notifyRider(riderId, payload) {
  if (!riderId) return 0;
  try {
    const rider = await DeliveryPartner.findOne({ id: riderId }).select('id pushToken').lean();
    if (!rider?.pushToken) return 0;
    const { sent, invalidTokens } = await sendExpoPush([rider.pushToken], payload);
    await pruneTokens(invalidTokens);
    return sent;
  } catch (err) {
    console.warn('[push] notifyRider failed:', err.message);
    return 0;
  }
}

/**
 * Broadcasts a fresh delivery offer to available riders.
 * Mirrors the eligibility rules the task feed uses so a rider is never pinged
 * about a trip they cannot take.
 */
async function notifyRidersNewTask(task) {
  if (!task || !task.id) return 0;
  try {
    const riders = await DeliveryPartner.find({
      status: 'approved',
      dutyState: 'online',
      pushToken: { $nin: ['', null] },
      id: { $nin: task.rejectedBy || [] },
    })
      .select('id pushToken')
      .limit(200)
      .lean();

    const tokens = riders.map((rider) => rider.pushToken).filter(Boolean);
    if (!tokens.length) return 0;

    const { sent, invalidTokens } = await sendExpoPush(tokens, {
      title: 'New delivery available',
      body: [
        task.vendorName || 'Pickup ready',
        `Earn ${money(task.riderPayout)}`,
        Number(task.codAmount) > 0 ? `COD ${money(task.codAmount)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      channelId: 'offers',
      sound: 'default',
      priority: 'high',
      interruptionLevel: 'time-sensitive',
      // The offer window is 30s; a late ping is only noise.
      ttl: 60,
      data: { type: 'task.new', taskId: task.id, orderCode: task.orderCode || '' },
    });
    await pruneTokens(invalidTokens);
    return sent;
  } catch (err) {
    console.warn('[push] notifyRidersNewTask failed:', err.message);
    return 0;
  }
}

module.exports = { notifyRider, notifyRidersNewTask };
