'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const DeliveryPartner = require('../models/DeliveryPartner');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { newId } = require('../utils/id');
const { emptyDocs } = require('../utils/vendorDocs');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), phone: user.phone, role: user.role }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

async function assertPhoneFreeForVendor(phone) {
  const existing = await User.findOne({ phone });
  if (!existing) return;
  if (existing.role === 'vendor') {
    throw ApiError.conflict('This number already has a vendor account. Sign in instead.', 'VENDOR_EXISTS');
  }
  if (existing.role === 'delivery') {
    throw ApiError.conflict(
      'This number is registered as a delivery partner. Use another number for a vendor outlet.',
      'PHONE_IS_DELIVERY',
    );
  }
  if (existing.role === 'admin') {
    throw ApiError.conflict('This number cannot be used for a vendor account.', 'PHONE_RESERVED');
  }
  throw ApiError.conflict(
    'This number is already on Aurasure as a customer. Use a different number for the vendor app (one phone = one vendor, one module).',
    'PHONE_IS_CUSTOMER',
  );
}

/** POST /api/v1/vendor/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, module, email } = req.body;
  if (!['food', 'shop'].includes(module)) {
    throw ApiError.badRequest('Pick food or shop — one module per vendor', 'MODULE_REQUIRED');
  }

  await assertPhoneFreeForVendor(phone);
  const rider = await DeliveryPartner.findOne({ phone });
  if (rider) {
    throw ApiError.conflict(
      'This number is already used on the delivery partner app.',
      'PHONE_IS_DELIVERY',
    );
  }

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const user = await User.create({
    id: newId('usr'),
    name,
    phone,
    email: email || undefined,
    passwordHash,
    role: 'vendor',
  });

  const vendor = await Vendor.create({
    id: newId('vnd'),
    userId: user.id,
    phone,
    module,
    ownerName: name,
    email: email || '',
    documents: emptyDocs(module),
    status: 'onboarding',
  });

  const token = signToken(user);
  return created(res, { user: user.toJSON(), vendor, token }, { message: 'Vendor account created' });
});

/** POST /api/v1/vendor/auth/login */
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user || user.role !== 'vendor') {
    throw ApiError.unauthorized('No vendor account for this number', 'INVALID_CREDENTIALS');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Incorrect password', 'INVALID_CREDENTIALS');

  const vendor = await Vendor.findOne({ userId: user.id });
  if (!vendor) throw ApiError.unauthorized('Vendor profile missing', 'VENDOR_MISSING');

  return ok(res, { user: user.toJSON(), vendor, token: signToken(user) });
});

/** GET /api/v1/vendor/auth/me */
const me = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ userId: req.user.id });
  if (!vendor) throw ApiError.notFound('Vendor profile missing', 'VENDOR_MISSING');
  return ok(res, { user: req.user.toJSON(), vendor });
});

module.exports = { register, login, me };
