'use strict';

/**
 * Aurasure API bootstrap:
 *  1. loads env + app
 *  2. starts listening immediately (health stays reachable without Mongo)
 *  3. attempts a MongoDB connection (retries handled by mongoose driver)
 *  4. graceful shutdown on SIGINT / SIGTERM
 */
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');

const app = createApp();

function start() {
  const server = app.listen(config.port, () => {
    console.log(`[server] Aurasure API listening on http://localhost:${config.port} (${config.env})`);
    console.log(`[server] health check → http://localhost:${config.port}/api/v1/health`);
  });

  // Connect but never crash the process if Mongo is down - the driver keeps
  // retrying and the API answers 503 (DB_DISCONNECTED) until it's up.
  connectDB()
    .then(() => console.log('[server] database ready - data routes now available'))
    .catch((err) => {
      console.warn(`[server] database not connected yet: ${err.message}`);
      console.warn('[server] starting MongoDB (e.g. docker compose up -d mongo) then the API auto-connects');
    });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received - shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[server] bye 👋');
      process.exit(0);
    });
    // Force exit after 8s if something hangs.
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[server] uncaughtException:', err);
    shutdown('uncaughtException');
  });
}

start();
