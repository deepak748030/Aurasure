/**
 * Renders docs/diagrams/system-architecture.{svg,png}.
 *
 * Hand-laid-out rather than Mermaid because this one map is the doc set's
 * cover image and needs exact spacing. The Mermaid version of the same graph
 * lives in docs/01-system-architecture.md and is the one to edit for detail
 * changes; keep the two in sync.
 *
 * Run (from a scratch dir with the deps installed):
 *   npm i @resvg/resvg-js sharp @expo-google-fonts/manrope
 *   BRAND_DEPS=$PWD node <repo>/docs/diagrams/render.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const roots = [
  import.meta.url,
  process.env.BRAND_DEPS && `file://${join(process.env.BRAND_DEPS, 'noop.js')}`,
  `file://${join(process.cwd(), 'noop.js')}`,
].filter(Boolean);

function loadDeps() {
  for (const root of roots) {
    try {
      const req = createRequire(root);
      return {
        Resvg: req('@resvg/resvg-js').Resvg,
        sharp: req('sharp'),
        fonts: [
          req.resolve('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
          req.resolve('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
          req.resolve('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
        ],
      };
    } catch {
      /* next */
    }
  }
  console.error('Run: npm i @resvg/resvg-js sharp @expo-google-fonts/manrope; then BRAND_DEPS=$PWD node docs/diagrams/render.mjs');
  return process.exit(1);
}
const { Resvg, sharp, fonts } = loadDeps();

/* ------------------------------------------------------------------ tokens */

const C = {
  bg: '#F6F7FB',
  ink: '#141033',
  sub: '#5B6478',
  faint: '#98A1B3',
  brand: '#5B46E5',
  brandBg: '#EEF1FF',
  brandLine: '#C9D0FF',
  newFg: '#C2410C',
  newBg: '#FFF4ED',
  newLine: '#FFC2AD',
  slate: '#E7E9F1',
  surface: '#FFFFFF',
};

const W = 1680;
const H = 1180;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
const push = (s) => out.push(s);

function text(x, y, s, { size = 15, weight = 500, fill = C.ink, anchor = 'start', spacing = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="Manrope" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

/**
 * @param {object} b
 * @param {'exists'|'new'|'plain'} b.kind
 * @param {string[]} b.lines  body lines under the title
 */
function box({ x, y, w, h, title, lines = [], kind = 'plain', badge, r = 14, titleSize = 17 }) {
  const fill = kind === 'new' ? C.newBg : kind === 'exists' ? C.brandBg : C.surface;
  const stroke = kind === 'new' ? C.newLine : kind === 'exists' ? C.brandLine : C.slate;
  const dash = kind === 'new' ? ' stroke-dasharray="7 5"' : '';
  const titleFill = kind === 'new' ? C.newFg : C.ink;
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash}/>`];
  let ty = y + 30;
  parts.push(text(x + 18, ty, title, { size: titleSize, weight: 800, fill: titleFill }));
  if (badge) {
    const bw = badge.length * 7.4 + 18;
    parts.push(`<rect x="${x + w - bw - 14}" y="${y + 13}" width="${bw}" height="22" rx="11" fill="${kind === 'new' ? C.newFg : C.brand}" opacity="0.12"/>`);
    parts.push(text(x + w - bw / 2 - 14, y + 28, badge, { size: 11, weight: 800, fill: kind === 'new' ? C.newFg : C.brand, anchor: 'middle', spacing: 0.6 }));
  }
  ty += 22;
  for (const line of lines) {
    parts.push(text(x + 18, ty, line, { size: 13.5, weight: 500, fill: C.sub }));
    ty += 20;
  }
  return parts.join('\n');
}

function arrow(x1, y1, x2, y2, { label, dashed = false, color = C.brand, labelSide = 'right' } = {}) {
  const dash = dashed ? ' stroke-dasharray="6 5"' : '';
  const parts = [
    `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none" marker-end="url(#ah-${color.slice(1)})"${dash}/>`,
  ];
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const tw = label.length * 6.6 + 14;
    const ox = labelSide === 'left' ? -tw - 6 : 8;
    parts.push(`<rect x="${mx + ox}" y="${my - 11}" width="${tw}" height="21" rx="6" fill="${C.bg}" opacity="0.95"/>`);
    parts.push(text(mx + ox + tw / 2, my + 4, label, { size: 11.5, weight: 700, fill: color, anchor: 'middle' }));
  }
  return parts.join('\n');
}

/** Orthogonal elbow: down, across, down. */
function elbow(x1, y1, x2, y2, { color = C.brand, dashed = false, midY } = {}) {
  const my = midY ?? (y1 + y2) / 2;
  const dash = dashed ? ' stroke-dasharray="6 5"' : '';
  return `<path d="M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none" marker-end="url(#ah-${color.slice(1)})"${dash}/>`;
}

/* ---------------------------------------------------------------- document */

push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
push(`<defs>
  ${[C.brand, C.newFg, C.faint].map((c) => `<marker id="ah-${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${c}"/></marker>`).join('\n  ')}
</defs>`);
push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);

// Header
push(text(56, 62, 'Aurasure · System Architecture', { size: 32, weight: 800 }));
push(text(56, 90, 'Four client surfaces, one Express API, one MongoDB. Solid = shipped today · dashed = to be built.', { size: 15, weight: 500, fill: C.sub }));

// Legend
push(`<rect x="1236" y="40" width="20" height="14" rx="4" fill="${C.brandBg}" stroke="${C.brandLine}" stroke-width="2"/>`);
push(text(1264, 52, 'exists', { size: 13, weight: 700, fill: C.sub }));
push(`<rect x="1336" y="40" width="20" height="14" rx="4" fill="${C.newBg}" stroke="${C.newLine}" stroke-width="2" stroke-dasharray="5 4"/>`);
push(text(1364, 52, 'to build', { size: 13, weight: 700, fill: C.sub }));
push(`<path d="M 1440 47 L 1476 47" stroke="${C.faint}" stroke-width="2" stroke-dasharray="6 5"/>`);
push(text(1484, 52, '3rd party', { size: 13, weight: 700, fill: C.sub }));

/* ---- row 1: clients */
const CW = 372;
const CH = 148;
const CY = 128;
const CX = [56, 464, 872, 1280];

push(box({
  x: CX[0], y: CY, w: CW, h: CH, kind: 'exists', badge: 'LIVE',
  title: 'Customer App',
  lines: ['AurasureApp/ · Expo RN 54', 'browse · cart · order · track', 'role: customer'],
}));
push(box({
  x: CX[1], y: CY, w: CW, h: CH, kind: 'new', badge: 'NEXT',
  title: 'Vendor App',
  lines: ['VendorApp/ · Expo RN', 'accept · prepare · ready · payouts', 'roles: vendor, vendor_staff'],
}));
push(box({
  x: CX[2], y: CY, w: CW, h: CH, kind: 'new',
  title: 'Delivery Partner App',
  lines: ['RiderApp/ · Expo RN + dev client', 'duty · offer · pickup · drop OTP', 'role: rider'],
}));
push(box({
  x: CX[3], y: CY, w: CW, h: CH, kind: 'new',
  title: 'Admin Panel',
  lines: [
    'admin-web/ · Next.js',
    'live ops · KYC · finance · audit',
    'roles: admin, support, finance',
    'in-app console today → read-only',
  ],
}));

/* ---- row 2: API */
const AY = 350;
const AH = 300;
push(`<rect x="56" y="${AY}" width="${W - 112}" height="${AH}" rx="18" fill="${C.surface}" stroke="${C.slate}" stroke-width="2"/>`);
push(text(80, AY + 34, 'Aurasure API', { size: 21, weight: 800 }));
push(text(232, AY + 34, 'server/  ·  Node + Express + Mongoose  ·  /api/v1', { size: 14, weight: 500, fill: C.sub }));
push(`<rect x="${W - 300}" y="${AY + 16}" width="220" height="26" rx="13" fill="${C.brandBg}"/>`);
push(text(W - 190, AY + 34, 'single deployable, role-scoped', { size: 12, weight: 700, fill: C.brand, anchor: 'middle' }));

const IY = AY + 58;
const IH = 106;
push(box({
  x: 80, y: IY, w: 340, h: IH, kind: 'exists', r: 12, titleSize: 15,
  title: 'Edge + Auth',
  lines: ['helmet · cors · rate-limit', 'authenticate() → req.user', 'requireRole(...roles)'],
}));
push(box({
  x: 444, y: IY, w: 340, h: IH, kind: 'new', r: 12, titleSize: 15,
  title: 'Scope guard',
  lines: ['requireVendorScope()', 'requireRiderScope()', 'never trust body.vendorId'],
}));
push(box({
  x: 808, y: IY, w: 400, h: IH, kind: 'new', r: 12, titleSize: 15,
  title: 'Domain services',
  lines: ['Order · Fulfilment · Dispatch', 'Ledger (commission, payouts)', 'Notify (push · SMS · socket)'],
}));
push(box({
  x: 1232, y: IY, w: 372, h: IH, kind: 'new', r: 12, titleSize: 15,
  title: 'Realtime gateway',
  lines: ['Socket.IO + Redis adapter', 'rooms: order · vendor · rider · admin', 'REST poll always as fallback'],
}));

const RY = IY + IH + 16;
push(`<rect x="80" y="${RY}" width="1524" height="90" rx="12" fill="${C.bg}" stroke="${C.slate}" stroke-width="2"/>`);
push(text(100, RY + 26, 'Route namespaces', { size: 14, weight: 800, fill: C.sub }));
const ns = [
  { t: '/auth  /users  /food  /shop  /banners  /search  /orders', k: 'exists' },
  { t: '/admin/*', k: 'exists' },
  { t: '/vendor/*', k: 'new' },
  { t: '/rider/*', k: 'new' },
];
let nx = 100;
for (const n of ns) {
  const w = n.t.length * 7.6 + 30;
  const isNew = n.k === 'new';
  push(`<rect x="${nx}" y="${RY + 40}" width="${w}" height="34" rx="17" fill="${isNew ? C.newBg : C.brandBg}" stroke="${isNew ? C.newLine : C.brandLine}" stroke-width="2"${isNew ? ' stroke-dasharray="6 4"' : ''}/>`);
  push(text(nx + w / 2, RY + 62, n.t, { size: 13, weight: 700, fill: isNew ? C.newFg : C.brand, anchor: 'middle' }));
  nx += w + 16;
}

/* ---- client → API arrows */
const labels = ['JWT customer', 'JWT vendor', 'JWT rider', 'JWT admin'];
CX.forEach((x, i) => {
  const cx = x + CW / 2;
  push(arrow(cx, CY + CH + 6, cx, AY - 8, { label: labels[i], color: i === 0 ? C.brand : C.newFg, dashed: i !== 0 }));
});

/* ---- row 3: data (left) + third-party integrations (right) */
const DY = 700;
const DH = 190;
push(box({
  x: 56, y: DY, w: 336, h: DH, kind: 'exists',
  title: 'MongoDB  ·  today',
  lines: ['User · Order · Restaurant', 'FoodItem · ShopStore · Product', 'Category · Vibe · Banner'],
}));
push(box({
  x: 412, y: DY, w: 400, h: DH, kind: 'new',
  title: 'MongoDB  ·  new collections',
  lines: ['Vendor · Outlet · Rider', 'DeliveryTask · TaskOffer · Zone', 'Payout · LedgerEntry · OrderEvent'],
}));
push(box({
  x: 832, y: DY, w: 300, h: DH, kind: 'new',
  title: 'Redis',
  lines: ['dispatch offer locks', 'rider geo index · socket adapter', 'job queue (BullMQ)'],
}));

// API -> data
push(elbow(224, AY + AH, 224, DY - 8, { color: C.brand, midY: DY - 34 }));
push(elbow(612, AY + AH, 612, DY - 8, { color: C.newFg, dashed: true, midY: DY - 34 }));
push(elbow(982, AY + AH, 982, DY - 8, { color: C.newFg, dashed: true, midY: DY - 34 }));

// third parties, stacked in one panel so no connector crosses the data row
const TX = 1176;
const TPW = 448;
push(`<rect x="${TX}" y="${DY}" width="${TPW}" height="300" rx="16" fill="${C.surface}" stroke="${C.slate}" stroke-width="2" stroke-dasharray="8 6"/>`);
push(text(TX + 20, DY + 32, 'Third-party integrations', { size: 17, weight: 800 }));
const tp = [
  ['Payment gateway', 'Razorpay / PhonePe · capture · webhook', 'refunds · vendor + rider payouts'],
  ['SMS / OTP', 'vendor + rider login, critical alerts', ''],
  ['Push · Expo → FCM / APNs', 'loud new-order alert · rider offer', 'customer status updates'],
  ['Maps + object storage', 'directions · geocoding · live pin', 'S3 + CDN for KYC docs and photos'],
];
let ty2 = DY + 50;
for (const [t, l1, l2] of tp) {
  push(text(TX + 20, ty2 + 16, t, { size: 14, weight: 800, fill: C.sub }));
  push(text(TX + 20, ty2 + 34, l1, { size: 12.5, weight: 500, fill: C.faint }));
  if (l2) push(text(TX + 20, ty2 + 50, l2, { size: 12.5, weight: 500, fill: C.faint }));
  ty2 += l2 ? 58 : 46;
}
push(arrow(TX + TPW / 2, AY + AH + 6, TX + TPW / 2, DY - 8, { color: C.faint, dashed: true }));

/* ---- bottom strip: order flow */
const FY = 1024;
push(`<rect x="56" y="${FY}" width="${W - 112}" height="118" rx="16" fill="${C.surface}" stroke="${C.slate}" stroke-width="2"/>`);
push(text(80, FY + 32, 'Order flow across the four surfaces', { size: 16, weight: 800 }));
push(text(80, FY + 54, 'full state machines in docs/03-order-lifecycle.md', { size: 12.5, weight: 500, fill: C.faint }));

const steps = [
  ['Customer', 'places order'],
  ['Vendor', 'accepts + preps'],
  ['Vendor', 'marks ready'],
  ['Dispatch', 'offers to riders'],
  ['Rider', 'pickup OTP'],
  ['Rider', 'drop OTP'],
  ['Ledger', 'vendor + rider payout'],
];
let sx = 470;
steps.forEach((s, i) => {
  const w = 148;
  const isLast = i === steps.length - 1;
  push(`<rect x="${sx}" y="${FY + 34}" width="${w}" height="52" rx="12" fill="${isLast ? C.newBg : C.brandBg}" stroke="${isLast ? C.newLine : C.brandLine}" stroke-width="2"/>`);
  push(text(sx + w / 2, FY + 56, s[0], { size: 13, weight: 800, fill: isLast ? C.newFg : C.brand, anchor: 'middle' }));
  push(text(sx + w / 2, FY + 74, s[1], { size: 11.5, weight: 500, fill: C.sub, anchor: 'middle' }));
  if (i < steps.length - 1) push(arrow(sx + w + 3, FY + 60, sx + w + 15, FY + 60, { color: C.faint }));
  sx += w + 18;
});

push('</svg>');

/* ------------------------------------------------------------------ write */

const svg = out.join('\n');
mkdirSync(__dirname, { recursive: true });
writeFileSync(join(__dirname, 'system-architecture.svg'), svg);

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: W * 1.5 },
  font: { fontFiles: fonts, loadSystemFonts: true, defaultFontFamily: 'Manrope' },
  shapeRendering: 2,
  textRendering: 1,
});
const png = await sharp(r.render().asPng()).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(__dirname, 'system-architecture.png'), png);
const meta = await sharp(png).metadata();
console.log(`system-architecture.svg + .png  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(0)} kB`);
