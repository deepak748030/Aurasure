'use strict';

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error');
const { ok } = require('./utils/response');

function resolveCorsOrigin() {
  const raw = config.cors.origin.trim();
  if (raw === '*') return true; // reflect any origin (dev / preview hosts)
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function createApp() {
  const app = express();

  // Behind proxies (Heroku, Render, nginx...) so rate-limit uses the real IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security, body parsing, gzip
  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // CORS - allows the Expo dev server / preview host to call the API.
  app.use(cors({ origin: resolveCorsOrigin(), credentials: true }));

  // Request logging (silent in tests)
  if (config.morganFormat !== 'silent') app.use(morgan(config.morganFormat));

  // Basic global rate limiting
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } },
    }),
  );

  // Liveness probe
  app.get('/', (req, res) =>
    ok(res, {
      service: 'aurasure-api',
      docs: '/api/v1/health',
      version: '1.0.0',
    }),
  );

  // Uploaded images - written by multer (see middlewares/upload.js) and served
  // straight from this server's disk. `crossOriginResourcePolicy` is relaxed
  // for this path only so the Expo app and the admin panel can render them.
  fs.mkdirSync(config.uploads.dir, { recursive: true });
  app.use(
    config.uploads.publicPath,
    helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
    express.static(config.uploads.dir, {
      maxAge: '30d',
      immutable: true,
      index: false,
      fallthrough: false,
    }),
  );

  // API v1
  app.use('/api/v1', apiRoutes);

  // 404 + central error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
