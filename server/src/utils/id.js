'use strict';

const crypto = require('crypto');

/**
 * Human friendly, collision-safe public ids used across the API.
 * Prefix keeps ids readable: `usr_`, `ord_`, `rst_` ...
 */
function newId(prefix) {
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

module.exports = { newId };
