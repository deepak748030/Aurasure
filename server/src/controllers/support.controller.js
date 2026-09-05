'use strict';

const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, paginate, listMeta } = require('../utils/response');
const { newId } = require('../utils/id');
const { writeAudit } = require('../utils/audit');

/** POST /api/v1/users/me/support-tickets { message, orderCode? } */
const createTicket = asyncHandler(async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (message.length < 12) throw ApiError.badRequest('Tell us a little more (min 12 characters)', 'MESSAGE_TOO_SHORT');
  if (message.length > 1000) throw ApiError.badRequest('Message is too long (max 1000 characters)', 'MESSAGE_TOO_LONG');
  const ticket = await SupportTicket.create({
    id: newId('tkt'),
    userId: req.user._id,
    userPublicId: req.user.id,
    name: req.user.name || '',
    phone: req.user.phone || '',
    message,
    orderCode: typeof req.body.orderCode === 'string' && req.body.orderCode.trim() ? req.body.orderCode.trim().slice(0, 40) : null,
  });
  return created(res, { ticket: ticket.toJSON() });
});

/** GET /api/v1/users/me/support-tickets */
const listMyTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  return ok(res, { tickets: tickets.map((t) => t.toJSON()) });
});

/** GET /api/v1/admin/support-tickets?status=&q= */
const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = {};
  if (['open', 'in_progress', 'resolved'].includes(req.query.status)) query.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ message: rx }, { phone: rx }, { name: rx }, { orderCode: rx }, { id: rx }];
  }
  const [total, docs] = await Promise.all([
    SupportTicket.countDocuments(query),
    SupportTicket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return ok(res, { tickets: docs.map((d) => d.toJSON()) }, listMeta(total, page, limit));
});

/** GET /api/v1/admin/support-tickets/:id */
const getOne = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ id: req.params.id });
  if (!ticket) throw ApiError.notFound('Ticket not found', 'NOT_FOUND');
  return ok(res, { ticket: ticket.toJSON() });
});

/**
 * PATCH /api/v1/admin/support-tickets/:id { status?, response? }
 * Setting a `response` notifies the customer in-app.
 */
const updateOne = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ id: req.params.id });
  if (!ticket) throw ApiError.notFound('Ticket not found', 'NOT_FOUND');
  const { status, response } = req.body || {};
  if (status !== undefined) {
    if (!['open', 'in_progress', 'resolved'].includes(status)) throw ApiError.badRequest('Invalid status', 'INVALID_STATUS');
    ticket.status = status;
    ticket.resolvedAt = status === 'resolved' ? new Date() : null;
  }
  let replied = false;
  if (response !== undefined && String(response).trim() && String(response).trim() !== ticket.response) {
    ticket.response = String(response).trim().slice(0, 1000);
    replied = true;
  }
  await ticket.save();
  if (replied && ticket.userPublicId) {
    await Notification.create({
      id: newId('ntf'),
      userId: ticket.userPublicId,
      title: 'Support replied to your message',
      body: ticket.response.slice(0, 200),
      icon: 'chat',
      tone: 'primary',
      kind: 'support',
    });
  }
  await writeAudit({ actor: req.user, action: 'support-ticket.update', targetType: 'support-ticket', targetId: ticket.id, detail: ticket.status, req });
  return ok(res, { ticket: ticket.toJSON() });
});

module.exports = { createTicket, listMyTickets, listAll, getOne, updateOne };
