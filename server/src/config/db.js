'use strict';

/**
 * Mongoose connection manager.
 *
 * - Connects lazily (server can boot without MongoDB so the health endpoint
 *   stays reachable; API routes guard themselves via the `requireDb`
 *   middleware and answer 503 until the database is up).
 * - Listens to connection events and logs them clearly.
 * - Exposes `disconnectDB()` for graceful shutdown.
 */
const mongoose = require('mongoose');
const config = require('./env');

const READY_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

let connectionPromise = null;

function readyStateLabel() {
  return READY_STATES[mongoose.connection.readyState] || 'unknown';
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  // Reuse the in-flight connection attempt so concurrent calls share one.
  if (connectionPromise) return connectionPromise;

  mongoose.set('strictQuery', true);

  connectionPromise = mongoose
    .connect(config.mongodb.uri, {
      maxPoolSize: config.mongodb.maxPoolSize,
      serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeoutMS,
      // Fail fast instead of hanging the boot when Mongo is down.
      bufferCommands: false,
    })
    .then((conn) => {
      console.log(`[db] connected → ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
      return conn;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

function registerConnectionEvents() {
  mongoose.connection.on('connected', () => console.log('[db] event: connected'));
  mongoose.connection.on('disconnected', () => console.warn('[db] event: disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] event: reconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
}

async function disconnectDB() {
  if (connectionPromise) {
    try {
      await connectionPromise;
    } catch {
      /* connection never completed - nothing to close */
    }
    connectionPromise = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[db] disconnected gracefully');
  }
}

module.exports = { connectDB, disconnectDB, readyStateLabel };
