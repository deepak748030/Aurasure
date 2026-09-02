'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { newId } = require('../utils/id');
const { applyWelcomePerks } = require('./rewards.controller');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), phone: user.phone }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

function publicUser(user) {
  return user.toJSON();
}

/** POST /api/v1/auth/register */
const register = asyncHandler(async (req, res) => {
  const { name, phone, email, password } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw ApiError.conflict('An account with this phone number already exists', 'PHONE_TAKEN');

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
  const user = await User.create({
    id: newId('usr'),
    name,
    phone,
    email: email || undefined,
    passwordHash,
  });

  // Starter perks: referral code, welcome points, coupons (kept idempotent).
  await applyWelcomePerks(user);
  await user.save();

  const token = signToken(user);
  return created(res, { user: publicUser(user), token }, { message: 'Account created' });
});

/** POST /api/v1/auth/login */
const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('No account found for this phone number', 'INVALID_CREDENTIALS');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Incorrect password', 'INVALID_CREDENTIALS');

  const token = signToken(user);
  return ok(res, { user: publicUser(user), token });
});

/** GET /api/v1/auth/me */
const me = asyncHandler(async (req, res) => ok(res, { user: publicUser(req.user) }));

module.exports = { register, login, me };
