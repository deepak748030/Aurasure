'use strict';

const Notification = require('../models/Notification');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { writeAudit } = require('../utils/audit');

function money(value) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
}

function statusLabel(status) {
  const map = {
    placed: 'Order placed',
    confirmed: 'Confirmed',
    preparing: 'Being prepared',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

/**
 * The inbox feed, composed server-side from the user's real records:
 * stored notifications (direct + broadcasts) + recent order events + recent
 * wallet / loyalty ledger movements. Newest first, capped at 50.
 *
 * GET /api/v1/users/me/notifications?module=food|shop
 */
const listMine = asyncHandler(async (req, res) => {
  const user = req.user;
  const module = req.query.module === 'food' || req.query.module === 'shop' ? req.query.module : null;
  const { limit } = paginate(req.query, { defaultLimit: 50, maxLimit: 50 });
  const readAt = user.notificationsReadAt ? new Date(user.notificationsReadAt).getTime() : 0;

  const broadcastQuery = { broadcast: true };
  if (module) broadcastQuery.module = { $in: ['all', module] };

  const [stored, orders] = await Promise.all([
    Notification.find({
      $or: [{ userId: user.id }, broadcastQuery],
    })
      .sort({ createdAt: -1 })
      .limit(30),
    Order.find({ user: user._id }).sort({ placedAt: -1 }).limit(15),
  ]);

  const rows = [];

  for (const note of stored) {
    const when = new Date(note.createdAt);
    const read = (note.readBy || []).includes(user.id) || when.getTime() <= readAt;
    rows.push({
      id: note.id,
      title: note.title,
      body: note.body,
      when: when.toISOString(),
      icon: note.icon || 'bell',
      tone: note.tone || 'primary',
      kind: note.kind || 'promo',
      orderId: note.orderId || null,
      link: note.link || null,
      unread: !read,
    });
  }

  for (const order of orders) {
    const when = order.status === 'delivered' && order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.placedAt);
    const body =
      order.status === 'cancelled'
        ? order.cancelReason || 'Cancelled as requested'
        : order.status === 'delivered'
          ? `${money(order.total)} · thanks for ordering`
          : order.status === 'placed'
            ? `Awaiting ${order.module === 'food' ? 'kitchen' : 'store'} confirmation`
            : `ETA ${order.etaMinutes} min · ${order.items.length} item${order.items.length === 1 ? '' : 's'}`;
    rows.push({
      id: `order-${order.id}-${order.status}`,
      title: `${order.code} · ${statusLabel(order.status)}`,
      body,
      when: when.toISOString(),
      icon: order.status === 'delivered' ? 'circleCheck' : order.status === 'cancelled' ? 'circleX' : 'truck',
      tone: order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'primary',
      kind: 'orders',
      orderId: order.id,
      link: null,
      unread: when.getTime() > readAt,
    });
  }

  for (const tx of (user.walletTxs || []).slice(-10)) {
    const when = new Date(tx.createdAt);
    rows.push({
      id: `wallet-${tx.id}`,
      title: `${tx.type === 'credit' ? 'Money in' : 'Money out'} · ${money(tx.amount)}`,
      body: `${tx.note || tx.title} · balance ${money(tx.balanceAfter)}`,
      when: when.toISOString(),
      icon: tx.type === 'credit' ? 'arrowDown' : 'arrowUpRight',
      tone: tx.type === 'credit' ? 'success' : 'muted',
      kind: 'money',
      orderId: null,
      link: null,
      unread: when.getTime() > readAt,
    });
  }

  for (const row of (user.loyaltyTxs || []).slice(-10)) {
    const when = new Date(row.createdAt);
    const what = row.type === 'earned' ? 'Points earned' : row.type === 'redeemed' ? 'Points redeemed' : 'Points reversed';
    rows.push({
      id: `loyalty-${row.id}`,
      title: `${what} · ${Math.abs(row.points)}`,
      body: `${row.note || row.title} · balance ${row.balanceAfter}`,
      when: when.toISOString(),
      icon: row.type === 'earned' ? 'loyalty' : 'gift',
      tone: row.type === 'reversed' ? 'warning' : 'primary',
      kind: 'money',
      orderId: null,
      link: null,
      unread: when.getTime() > readAt,
    });
  }

  rows.sort((a, b) => new Date(b.when) - new Date(a.when));
  const sliced = rows.slice(0, limit);
  return ok(res, { notifications: sliced, unread: sliced.filter((row) => row.unread).length });
});

/**
 * POST /api/v1/users/me/notifications/read { ids?: string[] }
 * No ids → mark everything read (watermark + stored receipts).
 */
const markRead = asyncHandler(async (req, res) => {
  const user = req.user;
  const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((id) => typeof id === 'string') : null;
  if (ids && ids.length) {
    await Notification.updateMany({ id: { $in: ids } }, { $addToSet: { readBy: user.id } });
  } else {
    user.notificationsReadAt = new Date();
    await user.save();
    await Notification.updateMany(
      { $or: [{ userId: user.id }, { broadcast: true }] },
      { $addToSet: { readBy: user.id } },
    );
  }
  return ok(res, { unread: 0, readAt: user.notificationsReadAt || new Date() });
});

/** POST /api/v1/admin/notifications/broadcast — one message to every customer. */
const broadcast = asyncHandler(async (req, res) => {
  const { title, body, icon = 'megaphone', tone = 'primary', module = 'all' } = req.body || {};
  if (!title || !String(title).trim()) throw ApiError.badRequest('Title is required', 'TITLE_REQUIRED');
  if (!body || !String(body).trim()) throw ApiError.badRequest('Message is required', 'BODY_REQUIRED');
  if (!['all', 'food', 'shop'].includes(module)) throw ApiError.badRequest('Invalid module', 'INVALID_MODULE');
  const note = await Notification.create({
    id: newId('ntf'),
    broadcast: true,
    module,
    title: String(title).trim().slice(0, 120),
    body: String(body).trim().slice(0, 400),
    icon: String(icon || 'megaphone').trim().slice(0, 40),
    tone: ['primary', 'success', 'warning', 'danger', 'muted'].includes(tone) ? tone : 'primary',
    kind: 'promo',
  });
  await writeAudit({ actor: req.user, action: 'notification.broadcast', targetType: 'notification', targetId: note.id, detail: note.title, req });
  return created(res, { notification: note.toJSON() });
});

/** GET /api/v1/admin/notifications — stored notifications (broadcasts + direct). */
const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = {};
  if (req.query.q) query.title = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.kind) query.kind = req.query.kind;
  if (req.query.broadcast === 'true') query.broadcast = true;
  if (req.query.broadcast === 'false') query.broadcast = false;
  const [total, docs] = await Promise.all([
    Notification.countDocuments(query),
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return ok(res, { notifications: docs.map((d) => d.toJSON()) }, listMeta(total, page, limit));
});

/** DELETE /api/v1/admin/notifications/:id */
const removeOne = asyncHandler(async (req, res) => {
  const note = await Notification.findOneAndDelete({ id: req.params.id });
  if (!note) throw ApiError.notFound('Notification not found', 'NOT_FOUND');
  await writeAudit({ actor: req.user, action: 'notification.delete', targetType: 'notification', targetId: note.id, detail: note.title, req });
  return ok(res, { deleted: note.id });
});

module.exports = { listMine, markRead, broadcast, listAll, removeOne };
