'use strict';

/**
 * Wraps an async request handler so rejected promises are forwarded to the
 * central Express error handler instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
