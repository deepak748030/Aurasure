'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * JWT bearer authentication. Reads `Authorization: Bearer <token>`,
 * verifies it, loads the user and attaches it to `req.user`.
 * Optionally pass `{ requireUser: false }` to allow anonymous access but
 * still populate `req.user` when a token is present.
 */
function authenticate({ requireUser = true } = {}) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

      if (!token) {
        if (requireUser) return next(ApiError.unauthorized('Authentication token missing', 'TOKEN_MISSING'));
        return next();
      }

      let payload;
      try {
        payload = jwt.verify(token, config.auth.jwtSecret);
      } catch {
        return next(ApiError.unauthorized('Invalid or expired token', 'TOKEN_INVALID'));
      }

      const user = await User.findById(payload.sub);
      if (!user) return next(ApiError.unauthorized('User no longer exists', 'USER_NOT_FOUND'));

      req.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Role guard - use after `authenticate()`: `router.use(authenticate(), requireRole('admin'))`.
 * Non-matching roles get a clean 403 instead of hitting the handler.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication token missing', 'TOKEN_MISSING'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this area', 'FORBIDDEN_ROLE'));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
