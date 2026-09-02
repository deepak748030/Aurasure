'use strict';

const mongoose = require('mongoose');
const { ok } = require('../utils/response');
const { readyStateLabel } = require('../config/db');

/**
 * GET /api/v1/health - always reachable, reports DB state.
 */
function health(req, res) {
  const dbReady = mongoose.connection.readyState === 1;
  return ok(res, {
    status: dbReady ? 'ok' : 'degraded',
    service: 'aurasure-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db: {
      status: readyStateLabel(),
      name: mongoose.connection.name || null,
    },
  });
}

module.exports = { health };
