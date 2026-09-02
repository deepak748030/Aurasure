'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { newId } = require('../utils/id');
const { emptyDocs } = require('../utils/riderDocs');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), phone: user.phone, role: user.role }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/** A phone may be a delivery partner only if it is not already another role. */
async function assertPhoneFreeForRider(phone) {
  const existing = await User.findOne({ phone });
  if (!existing) return;
  if (existing.role === 'delivery') {
    throw ApiError.conflict('This number already has a delivery partner account. Sign in instead.', 'RIDER_EXISTS');
  }
  if (existing.role === 'vendor') {
    throw ApiError.conflict(
      'This number is registered as a vendor. Use a different number for the delivery partner app.',
      'PHONE_IS_VENDOR',
    );
  }
  if (existing.role === 'admin') {
    throw ApiError.conflict('This number cannot be used for a delivery partner account.', 'PHONE_RESERVED');
  }
  throw ApiError.conflict(
    'This number is already on Aurasure as a customer. Use a different number for the delivery partner app.',
    'PHONE_IS_CUSTOMER',
  );
}

/** POST /api/v1/rider/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, phone, password, vehicleType } = req.body;

  await assertPhoneFreeForRider(phone);

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const user = await User.create({
    id: newId('usr'),
    name,
    phone,
    passwordHash,
    role: 'delivery',
  });

  const rider = await DeliveryPartner.create({
    id: newId('rdr'),
    userId: user.id,
    phone,
    name,
    vehicleType: vehicleType || '',
    documents: emptyDocs(),
    status: 'onboarding',
  });

  const token = signToken(user);
  return created(res, { user: user.toJSON(), rider, token }, { message: 'Delivery partner account created' });
});

/** POST /api/v1/rider/auth/login */
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user || user.role !== 'delivery') {
    throw ApiError.unauthorized('No delivery partner account for this number', 'INVALID_CREDENTIALS');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Incorrect password', 'INVALID_CREDENTIALS');

  const rider = await DeliveryPartner.findOne({ userId: user.id });
  if (!rider) throw ApiError.unauthorized('Delivery partner profile missing', 'RIDER_MISSING');

  return ok(res, { user: user.toJSON(), rider, token: signToken(user) });
});

/** GET /api/v1/rider/auth/me */
const me = asyncHandler(async (req, res) => {
  const rider = await DeliveryPartner.findOne({ userId: req.user.id });
  if (!rider) throw ApiError.notFound('Delivery partner profile missing', 'RIDER_MISSING');
  return ok(res, { user: req.user.toJSON(), rider });
});

module.exports = { register, login, me };
