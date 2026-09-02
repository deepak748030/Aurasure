'use strict';

const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/** 404 for every unmatched route - keeps the JSON envelope consistent. */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

/**
 * Central error handler. Converts known error types into a single JSON shape:
 *   { success:false, error: { code, message, details? } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof ApiError) {
    // already operational
  } else if (err.name === 'ValidationError') {
    // Mongoose schema validation
    const details = Object.entries(err.errors).map(([field, e]) => ({ field, message: e.message }));
    error = ApiError.unprocessable('Validation failed', 'VALIDATION_FAILED', details);
  } else if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for ${err.path}`, 'INVALID_ID');
  } else if (err.code === 11000) {
    // Mongo duplicate key
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`A record with this ${field} already exists`, 'DUPLICATE_KEY');
  } else if (err.name === 'MongooseError' && /before initial connection|buffering/.test(err.message)) {
    // A query slipped through while Mongo was still connecting.
    error = ApiError.serviceUnavailable('Database is still connecting - please retry in a moment', 'DB_DISCONNECTED');
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Invalid JSON body', 'INVALID_JSON');
  }

  const status = error.statusCode || 500;
  const body = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 && !config.isProduction ? error.message : status >= 500 ? 'Internal server error' : error.message,
    },
  };
  if (error.details && (status < 500 || !config.isProduction)) body.error.details = error.details;

  if (status >= 500) console.error('[error]', error);
  return res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
