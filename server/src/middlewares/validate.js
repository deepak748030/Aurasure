'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after express-validator rules and forwards 422 with field details if
 * validation failed.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path || e.param, message: e.msg }));
  return next(ApiError.unprocessable('Validation failed', 'VALIDATION_FAILED', details));
}

module.exports = validate;
