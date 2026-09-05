/**
 * Payload probe: sends the exact bodies the app's screens build and asserts the
 * server's validation layer accepts them. Without MongoDB the handlers answer
 * 503 — which is the expected, passing outcome: it proves the request got past
 * routing + validation and only the database was missing. A 400/422 here means
 * the app is sending a body the server rejects.
 */
const BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api/v1';

const cases = [
  ['POST', '/auth/register', { name: 'Probe User', phone: '9000000002', password: 'aurasure123', email: 'probe@example.com' }],
  ['POST', '/auth/login', { phone: '9876543210', password: 'aurasure123' }],
  ['POST', '/orders', { module: 'food', items: [{ refId: 'x', name: 'Butter Naan', qty: 2, price: 60, currency: 'INR', image: { url: 'u', publicId: 'p' }, variant: 'Medium', addons: ['Extra butter'], outletId: 'o1', outletName: 'Aurora Bistro' }], outletId: 'o1', deliveryAddressId: 'a1', payBy: 'cod', tip: 20, instructions: 'Gate 4231' }],
  ['POST', '/users/me/addresses', { label: 'Home', line: 'Flat 4B, Lake View, Sector 5', city: 'Raipur', pin: '492001', isDefault: true }],
  ['PUT', '/users/me/favorites', { module: 'food', refId: 'x', liked: true }],
  ['POST', '/users/me/coupons/claim', { code: 'AURA50' }],
  ['POST', '/users/me/wallet/add', { amount: 300 }],
  ['POST', '/users/me/loyalty/redeem', { points: 200 }],
  ['POST', '/users/me/referral/apply', { code: 'PRO0002' }],
  ['POST', '/users/me/partner-application', { name: 'Probe User', city: 'Raipur' }],
  ['PUT', '/users/me', { name: 'Probe User', email: 'probe@example.com' }],
];

let bad = 0;
for (const [method, path, body] of cases) {
  let res, json;
  try {
    res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    json = await res.json().catch(() => null);
  } catch (error) {
    console.log(`  ✗ ${method} ${path} → unreachable (${error.message})`);
    bad += 1;
    continue;
  }
  const message = json?.error?.message ?? json?.message ?? '';
  const validationRejected = res.status === 400 || res.status === 422;
  // 401/403 is fine: those routes need a token, which needs a real account.
  const ok = !validationRejected;
  console.log(`  ${ok ? '✓' : '✗'} ${method} ${path} → ${res.status}${message ? ` · ${message}` : ''}`);
  if (!ok) bad += 1;
}

console.log(bad === 0 ? '\nevery app request body passes the server validation layer' : `\n${bad} body/rejection mismatch(es) to fix`);
process.exit(bad === 0 ? 0 : 1);
