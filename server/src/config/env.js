'use strict';

/**
 * Centralised, validated environment configuration.
 * Loads `.env` once and exports a frozen config object so nothing can
 * accidentally mutate settings at runtime.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const asInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',

  port: asInt(process.env.PORT, 5000),

  mongodb: Object.freeze({
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aurasure',
    maxPoolSize: asInt(process.env.MONGODB_OPTIONS_MAX_POOL_SIZE, 10),
    serverSelectionTimeoutMS: asInt(process.env.MONGODB_OPTIONS_SERVER_SELECTION_TIMEOUT_MS, 5000),
  }),

  auth: Object.freeze({
    jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: asInt(process.env.BCRYPT_ROUNDS, 10),
  }),

  cors: Object.freeze({
    origin: process.env.CORS_ORIGIN || '*',
  }),

  rateLimit: Object.freeze({
    windowMs: asInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: asInt(process.env.RATE_LIMIT_MAX, 200),
  }),

  morganFormat: process.env.MORGAN_FORMAT || 'dev',
});

module.exports = config;
