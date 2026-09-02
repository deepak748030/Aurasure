'use strict';

const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/**
 * Guard for data routes: answers 503 while MongoDB is unavailable so the
 * client can retry instead of receiving a half-working response.
 */
function requireDb(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(
      ApiError.serviceUnavailable('Database is not connected yet - please retry in a moment', 'DB_DISCONNECTED'),
    );
  }
  return next();
}

module.exports = requireDb;
