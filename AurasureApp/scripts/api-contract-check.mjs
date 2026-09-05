/**
 * Contract check for the Aurasure user app.
 *
 * There is no MongoDB in this sandbox, so the app's routes answer 503 through
 * the server's own `requireDb` guard. That is still enough to prove the wiring:
 * every path the app calls must exist (never 404) and every reply must use the
 * `{ success, data|error }` envelope the client unwraps.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function fromEnvFile() {
  try {
    const line = readFileSync(join(process.cwd(), '.env'), 'utf8').match(/^EXPO_PUBLIC_API_URL=(.+)$/m)?.[1];
    return (line || '').trim();
  } catch {
    return '';
  }
}
// Prefer the shell env, then `.env`, then the port the app's `npm run api` uses.
const BASE = (process.env.EXPO_PUBLIC_API_URL || fromEnvFile() || 'http://localhost:5000').replace(/\/+$/, '') + '/api/v1';

const apiDir = join(process.cwd(), 'src', 'api');
const paths = new Set();
for (const file of readdirSync(apiDir)) {
  if (!file.endsWith('.ts')) continue;
  const src = readFileSync(join(apiDir, file), 'utf8');
  for (const m of src.matchAll(/api(Get|Post|Patch|Put|Delete|GetFull)(?:<[^>]*>)?\(\s*[`']([^`']*)/g)) {
    let p = m[2];
    // `?${query({ ... })}` helpers are query strings, not path segments.
    p = p.replace(/\$\{\s*query\([^)]*\)\s*\}/g, '');
    p = p.replace(/\$\{[^}]*\}/g, ':id');
    p = p.split('?')[0];
    paths.add(m[1] + ' ' + p.replace(/\?.*$/, ''));
  }

}

const rows = [...paths].sort();
let checked = 0;
let ok = 0;
const bad = [];
for (const row of rows) {
  const [method, path] = row.split(' ');
  const upper = method === 'GetFull' ? 'GET' : method.toUpperCase();
  const url = BASE + path.replace(/:id/g, '000000000000000000000000');
  let res, body;
  try {
    res = await fetch(url, { method: upper, headers: { 'content-type': 'application/json' }, body: upper === 'GET' ? undefined : '{}' });
    body = await res.text();
  } catch (error) {
    bad.push(`${upper} ${path} → request failed: ${error.message}`);
    continue;
  }
  checked += 1;
  const isJson = (() => { try { JSON.parse(body); return true; } catch { return false; } })();
  const envelope = isJson && (JSON.parse(body).success !== undefined);
  if (res.status === 404) bad.push(`${upper} ${path} → 404 (route missing)`);
  else if (!envelope) bad.push(`${upper} ${path} → ${res.status} non-envelope body: ${body.slice(0, 60)}`);
  else ok += 1;
}

console.log(`routes checked: ${checked} · ok: ${ok}`);
if (bad.length) {
  console.log('PROBLEMS:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('every app route exists on the server and returns the API envelope');
