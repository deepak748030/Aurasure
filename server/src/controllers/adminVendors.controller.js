'use strict';

const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paginate, listMeta } = require('../utils/response');
const { allDocsVerified, requiredDocuments } = require('../utils/vendorDocs');
const { ensureOutlet } = require('./vendor.controller');

const listVendors = asyncHandler(async (req, res) => {
  const { status, module, q } = req.query;
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 30, maxLimit: 100 });
  const query = {};
  if (status) query.status = status;
  if (module === 'food' || module === 'shop') query.module = module;
  if (q) {
    query.$or = [
      { outletName: new RegExp(q, 'i') },
      { ownerName: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { city: new RegExp(q, 'i') },
    ];
  }
  const total = await Vendor.countDocuments(query);
  const vendors = await Vendor.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit);
  const pending = await Vendor.countDocuments({ status: { $in: ['submitted', 'under_review'] } });
  return ok(res, { vendors, pending }, listMeta(total, page, limit));
});

const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ id: req.params.id });
  if (!vendor) throw ApiError.notFound('Vendor not found', 'VENDOR_NOT_FOUND');
  const orders = await Order.find({ vendorId: vendor.id }).sort({ placedAt: -1 }).limit(20);
  const user = await User.findOne({ id: vendor.userId }).select('id name phone email role createdAt');
  return ok(res, { vendor, user, orders, requiredDocuments: requiredDocuments(vendor.module) });
});

const decide = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ id: req.params.id });
  if (!vendor) throw ApiError.notFound('Vendor not found', 'VENDOR_NOT_FOUND');
  const { status, note } = req.body;
  const allowed = ['under_review', 'needs_info', 'approved', 'rejected', 'suspended', 'onboarding'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Invalid decision', 'INVALID_DECISION');

  if (status === 'approved') {
    if (!allDocsVerified(vendor)) {
      throw ApiError.badRequest('Verify every document before approving this outlet', 'DOCS_NOT_VERIFIED');
    }
    vendor.status = 'approved';
    vendor.isOpen = true;
    vendor.acceptingOrders = true;
    vendor.reviewedAt = new Date();
    vendor.reviewedBy = req.user.name || req.user.id;
    if (note) vendor.reviewNote = String(note).slice(0, 400);
    await vendor.save();
    await ensureOutlet(vendor);
    return ok(res, { vendor });
  }

  vendor.status = status;
  vendor.reviewedAt = new Date();
  vendor.reviewedBy = req.user.name || req.user.id;
  if (note) vendor.reviewNote = String(note).slice(0, 400);
  if (status === 'suspended' || status === 'rejected') {
    vendor.isOpen = false;
    vendor.acceptingOrders = false;
    if (vendor.outletId) {
      if (vendor.module === 'food') await Restaurant.updateOne({ id: vendor.outletId }, { $set: { isClosed: true } });
      else await ShopStore.updateOne({ id: vendor.outletId }, { $set: { isClosed: true } });
    }
  }
  await vendor.save();
  return ok(res, { vendor });
});

const verifyDoc = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ id: req.params.id });
  if (!vendor) throw ApiError.notFound('Vendor not found', 'VENDOR_NOT_FOUND');
  const { key, verified, note } = req.body;
  const doc = (vendor.documents || []).find((d) => d.key === key);
  if (!doc) throw ApiError.notFound('Document slot not found', 'DOC_NOT_FOUND');
  doc.verified = Boolean(verified);
  if (note !== undefined) doc.note = String(note).slice(0, 200);
  if (vendor.status === 'submitted') vendor.status = 'under_review';
  await vendor.save();
  return ok(res, { vendor });
});

module.exports = { listVendors, getVendor, decide, verifyDoc };
