'use strict';

const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const DeliveryTask = require('../models/DeliveryTask');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { allDocsVerified, requiredDocuments } = require('../utils/riderDocs');
const { writeAudit } = require('../utils/audit');

const listRiders = asyncHandler(async (req, res) => {
  const { status, dutyState, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 100 });
  const query = {};
  if (status) query.status = status;
  if (['online', 'offline', 'on_task', 'break'].includes(dutyState)) query.dutyState = dutyState;
  if (q) {
    query.$or = [
      { name: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { city: new RegExp(q, 'i') },
      { vehicleNumber: new RegExp(q, 'i') },
    ];
  }
  const total = await DeliveryPartner.countDocuments(query);
  const riders = await DeliveryPartner.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit);
  const pending = await DeliveryPartner.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
  return ok(res, { riders, pending }, listMeta(total, page, limit));
});

const getRider = asyncHandler(async (req, res) => {
  const rider = await DeliveryPartner.findOne({ id: req.params.id });
  if (!rider) throw ApiError.notFound('Delivery partner not found', 'RIDER_NOT_FOUND');
  const user = await User.findOne({ id: rider.userId }).select('id name phone email role createdAt');
  const tasks = await DeliveryTask.find({ riderId: rider.id }).sort({ createdAt: -1 }).limit(30);
  return ok(res, { rider, user, tasks, requiredDocuments: requiredDocuments() });
});

const decide = asyncHandler(async (req, res) => {
  const rider = await DeliveryPartner.findOne({ id: req.params.id });
  if (!rider) throw ApiError.notFound('Delivery partner not found', 'RIDER_NOT_FOUND');
  const { status, note } = req.body;
  const allowed = ['under_review', 'needs_info', 'approved', 'rejected', 'suspended', 'onboarding'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid decision', 'INVALID_DECISION');

  if (status === 'approved') {
    if (!allDocsVerified(rider)) {
      throw ApiError.badRequest('Verify every document before approving this partner', 'DOCS_NOT_VERIFIED');
    }
    if (!rider.trainingCompleted || !rider.quizCompleted) {
      throw ApiError.badRequest('Training and the safety quiz must be completed before approval', 'TRAINING_INCOMPLETE');
    }
    rider.status = 'approved';
    rider.reviewedAt = new Date();
    rider.reviewedBy = req.user.name || req.user.id;
    if (note) rider.reviewNote = String(note).slice(0, 400);
    await rider.save();
    await writeAudit({
      actor: req.user,
      action: 'rider.approve',
      targetType: 'rider',
      targetId: rider.id,
      targetCode: rider.name || rider.phone,
      detail: String(note || ''),
      req,
    });
    return ok(res, { rider });
  }

  rider.status = status;
  rider.reviewedAt = new Date();
  rider.reviewedBy = req.user.name || req.user.id;
  if (note) rider.reviewNote = String(note).slice(0, 400);
  if (status === 'suspended' || status === 'rejected') rider.dutyState = 'offline';
  await rider.save();
  await writeAudit({
    actor: req.user,
    action: `rider.${status}`,
    targetType: 'rider',
    targetId: rider.id,
    targetCode: rider.name || rider.phone,
    detail: String(note || ''),
    req,
  });
  return ok(res, { rider });
});

const verifyDoc = asyncHandler(async (req, res) => {
  const rider = await DeliveryPartner.findOne({ id: req.params.id });
  if (!rider) throw ApiError.notFound('Delivery partner not found', 'RIDER_NOT_FOUND');
  const { key, verified, note } = req.body;
  const doc = (rider.documents || []).find((d) => d.key === key);
  if (!doc) throw ApiError.notFound('Document slot not found', 'DOC_NOT_FOUND');
  doc.verified = Boolean(verified);
  if (note !== undefined) doc.note = String(note).slice(0, 200);
  if (rider.status === 'submitted') rider.status = 'under_review';
  await rider.save();
  await writeAudit({
    actor: req.user,
    action: 'rider.doc',
    targetType: 'rider_document',
    targetId: rider.id,
    targetCode: `${rider.name || rider.phone} · ${doc.label || key}`,
    detail: `${key} → ${verified ? 'verified' : 'unverified'}`,
    req,
  });
  return ok(res, { rider });
});

const confirmCodDeposit = asyncHandler(async (req, res) => {
  const rider = await DeliveryPartner.findOne({ id: req.params.id });
  if (!rider) throw ApiError.notFound('Delivery partner not found', 'RIDER_NOT_FOUND');
  const { depositId, status, note } = req.body;
  if (!['confirmed', 'failed'].includes(status)) {
    throw ApiError.badRequest('Status must be confirmed or failed', 'INVALID_STATUS');
  }
  const deposit = (rider.codDeposits || []).find((d) => d.id === depositId);
  if (!deposit) throw ApiError.notFound('Deposit not found', 'DEPOSIT_NOT_FOUND');
  deposit.status = status;
  if (note !== undefined) deposit.note = String(note).slice(0, 200);
  if (status === 'confirmed' && rider.codInHand < 0) rider.codInHand = 0;
  await rider.save();
  await writeAudit({
    actor: req.user,
    action: 'rider.cod_deposit',
    targetType: 'rider_cod_deposit',
    targetId: rider.id,
    targetCode: rider.name || rider.phone,
    detail: `Deposit ${depositId} → ${status} · ₹${Math.round(deposit.amount || 0)}`,
    req,
  });
  return ok(res, { rider });
});

module.exports = { listRiders, getRider, decide, verifyDoc, confirmCodDeposit };
