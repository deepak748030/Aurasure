'use strict';

/**
 * Cross-checks every API path the mobile app calls (src/api/*.ts) against the
 * server's mounted routes — catches typos/missing endpoints before wiring.
 *
 * Run: node scripts/verify-routes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP_API = path.join(ROOT, 'AurasureApp', 'src', 'api');
const ROUTES = path.join(ROOT, 'server', 'src', 'routes');

// 1) App-side paths
const appPaths = new Set();
for (const f of fs.readdirSync(APP_API)) {
  const src = fs.readFileSync(path.join(APP_API, f), 'utf8');
  for (const m of src.matchAll(/api(?:Get|Post|Put|Patch|Delete)<[^>]*>\(\s*'([^']+)'/g)) appPaths.add(m[1]);
  for (const m of src.matchAll(/api(?:Get|Post|Put|Patch|Delete)\(\s*'([^']+)'/g)) appPaths.add(m[1]);
}

// 2) Server-side: mount prefixes from index.js + per-file routes
const indexSrc = fs.readFileSync(path.join(ROUTES, 'index.js'), 'utf8');
const mounts = {};
for (const m of indexSrc.matchAll(/router\.use\('([^']+)'(?:,\s*requireDb)?,\s*(\w+Routes)\)/g)) {
  mounts[m[2]] = m[1];
}

const serverPaths = new Set();
for (const f of fs.readdirSync(ROUTES)) {
  if (f === 'index.js') continue;
  const base = mounts[`${f.replace('.routes.js', '')}Routes`] ?? '';
  const src = fs.readFileSync(path.join(ROUTES, f), 'utf8');
  for (const m of src.matchAll(/router\.(?:get|post|put|patch|delete)\(\s*'([^']+)'/g)) {
    const r = m[1];
    serverPaths.add(r === '/' ? base : `${base}${r.replace(/\/$/, '')}`);
  }
}

// 3) Compare (app templates like `${id}` ↔ server `:id`)
const norm = (p) => p.replace(/\$\{[^}]+\}|encodeURIComponent\([^)]*\)/g, ':x').replace(/\?.*$/, '');
const app = [...appPaths].map(norm);
const srv = [...serverPaths].map(norm);

let failed = 0;
for (const p of app) {
  const ok =
    srv.includes(p) ||
    srv.some((r) =>
      new RegExp(
        `^${p
          .split('/')
          .map((seg) => (seg === ':x' ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
          .join('/')}$`,
      ).test(r),
    );
  if (!ok) {
    failed += 1;
    console.error(`  ✘ MISSING SERVER ROUTE: ${p}`);
  }
}

console.log(`[routes] ${app.length} app call sites → ${srv.length} server routes, ${failed} unmatched`);
if (failed) process.exit(1);
console.log('[routes] ALL APP PATHS RESOLVE ✅');
