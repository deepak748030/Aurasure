/**
 * Aurasure brand asset generator.
 *
 * Everything below is drawn as vector (SVG) and rasterised once, so the icon,
 * the adaptive icon, the splash lockup and the in-app logos all come from a
 * single geometry definition and stay pixel-consistent at every size.
 *
 * Mark  : the "aura arch" - an A built from a rounded arch + crossbar, wrapped
 *         in two concentric aura arcs. Flat colour only, no gradients: the
 *         brand indigo from src/theme/colors.ts, with the two lighter brand
 *         tints for the arcs. Flat survives 24px and 1-colour printing.
 * Type  : Manrope ExtraBold, slightly tightened tracking.
 *
* Run (from a scratch dir with the deps installed):
 *   npm i @resvg/resvg-js sharp @expo-google-fonts/manrope
 *   BRAND_DEPS=$PWD node <repo>/AurasureApp/scripts/generate-brand.mjs
 *
 * Outputs land in assets/images/ (see FILES at the bottom).
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, '..');
const OUT_DIR = join(APP_DIR, 'assets', 'images');

// Generator-only deps. They are deliberately NOT in package.json - shipping a
// native image toolchain to every app install just to redraw a logo isn't
// worth it. Resolve them from this repo, from BRAND_DEPS, or from the cwd.
const roots = [import.meta.url, process.env.BRAND_DEPS && `file://${join(process.env.BRAND_DEPS, 'noop.js')}`, `file://${join(process.cwd(), 'noop.js')}`].filter(Boolean);

function loadDeps() {
  for (const root of roots) {
    try {
      const req = createRequire(root);
      return {
        Resvg: req('@resvg/resvg-js').Resvg,
        sharp: req('sharp'),
        MANROPE: {
          extraBold: req.resolve('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
          medium: req.resolve('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'),
        },
      };
    } catch {
      /* try next root */
    }
  }
  console.error(
    'Missing generator deps. From any scratch directory run:\n' +
      '  npm i @resvg/resvg-js sharp @expo-google-fonts/manrope\n' +
      '  BRAND_DEPS=$PWD node <repo>/AurasureApp/scripts/generate-brand.mjs',
  );
  return process.exit(1);
}

const { Resvg, sharp, MANROPE } = loadDeps();

/* ------------------------------------------------------------------ tokens */

// Straight out of src/theme/colors.ts. Flat fills only - no gradients anywhere
// in the brand system.
const C = {
  brand: '#5B46E5', // brand.600 - the primary, same as colors.shopAccent
  brandTint: '#A8B2FF', // brand.300 - inner aura arc
  brandTintSoft: '#C9D0FF', // brand.200 - outer aura arc
  ink: '#141033',
  inkSoft: '#5B6478',
  white: '#FFFFFF',
};

/* ---------------------------------------------------------------- the mark */

// Drawn on a 512x512 grid. The glyph is optically centred rather than
// bounding-box centred: the aura arcs on top are light, so the solid arch is
// nudged down a touch to keep the mass balanced.
const M = {
  size: 512,
  cx: 256,
  arcCy: 258, // centre of the arch circle
  radius: 116, // arch centreline radius
  stroke: 48, // arch stroke width
  legBottom: 392, // where the legs stop
  barY: 332, // crossbar
  barStroke: 36,
  aura: [
    { gap: 30, w: 17, o: 0.5, sweep: 152 },
    { gap: 62, w: 13, o: 0.26, sweep: 118 },
  ],
};

const polar = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** Arc centred on the top of the circle, `sweep` degrees wide. */
function topArc(cx, cy, r, sweep) {
  const [x0, y0] = polar(cx, cy, r, -sweep / 2);
  const [x1, y1] = polar(cx, cy, r, sweep / 2);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** The A: two vertical legs joined by a semicircular arch. */
const archPath = () => {
  const { cx, arcCy, radius, legBottom } = M;
  return (
    `M ${cx - radius} ${legBottom} L ${cx - radius} ${arcCy} ` +
    `A ${radius} ${radius} 0 0 1 ${cx + radius} ${arcCy} ` +
    `L ${cx + radius} ${legBottom}`
  );
};

const barPath = () => `M ${M.cx - M.radius + 4} ${M.barY} L ${M.cx + M.radius - 4} ${M.barY}`;

/**
 * @param {object} o
 * @param {string} o.stroke arch + crossbar colour
 * @param {string[]} o.aura one flat colour per aura arc, inner first
 */
function markGroup({ stroke, aura }) {
  const arcs = M.aura
    .map(
      (a, i) =>
        `<path d="${topArc(M.cx, M.arcCy, M.radius + M.stroke / 2 + a.gap, a.sweep)}" ` +
        `fill="none" stroke="${aura[i]}" stroke-width="${a.w}" stroke-linecap="round"/>`,
    )
    .join('\n    ');

  return `
    ${arcs}
    <path d="${archPath()}" fill="none" stroke="${stroke}" stroke-width="${M.stroke}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${barPath()}" fill="none" stroke="${stroke}" stroke-width="${M.barStroke}" stroke-linecap="round"/>`;
}

// Tight ink box of the mark, used to place it inside lockups.
const MARK_BOX = {
  x: M.cx - (M.radius + M.stroke / 2 + M.aura[1].gap),
  y: M.arcCy - (M.radius + M.stroke / 2 + M.aura[1].gap),
  w: 2 * (M.radius + M.stroke / 2 + M.aura[1].gap),
  h: M.legBottom + M.stroke / 2 - (M.arcCy - (M.radius + M.stroke / 2 + M.aura[1].gap)),
};

// The two palettes the mark ever ships in.
const ON_LIGHT = { stroke: C.brand, aura: [C.brandTint, C.brandTintSoft] };
// On the solid brand tile the arcs are flat white knocked back with a plain
// alpha - two flat tones, no gradient.
const onBrand = () => ({
  stroke: C.white,
  aura: [0.55, 0.32].map((a) => `rgba(255,255,255,${a})`),
});

/* --------------------------------------------------------------- documents */

/** Square app icon: flat brand tile, white mark. No transparency (iOS). */
function iconSvg({ rounded = 0, glyphScale = 0.62 } = {}) {
  const S = 1024;
  const k = (S * glyphScale) / MARK_BOX.w;
  const tx = S / 2 - (MARK_BOX.x + MARK_BOX.w / 2) * k;
  const ty = S / 2 - (MARK_BOX.y + MARK_BOX.h / 2) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" rx="${rounded}" fill="${C.brand}"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${markGroup(onBrand())}
  </g>
</svg>`;
}

/**
 * Android adaptive foreground: transparent, glyph kept inside the inner 66%
 * safe zone so no launcher mask can clip it. The background layer is a flat
 * colour, so app.json sets adaptiveIcon.backgroundColor and ships no bitmap.
 */
function adaptiveForegroundSvg({ mono = false } = {}) {
  const S = 1024;
  const glyph = 0.46; // of the full 1024 canvas -> ~70% of the 66% safe circle
  const k = (S * glyph) / MARK_BOX.w;
  const tx = S / 2 - (MARK_BOX.x + MARK_BOX.w / 2) * k;
  const ty = S / 2 - (MARK_BOX.y + MARK_BOX.h / 2) * k;
  // Monochrome is a mask: the launcher recolours it, so every stroke has to be
  // fully opaque black or the arcs come back half-transparent.
  const paint = mono ? { stroke: '#000000', aura: ['#000000', '#000000'] } : onBrand();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${markGroup(paint)}
  </g>
</svg>`;
}

/** Standalone square mark on transparent - the in-app 44pt avatar. */
function markSvg({ light = false } = {}) {
  const S = 512;
  const pad = 0.9;
  const k = (S * pad) / Math.max(MARK_BOX.w, MARK_BOX.h);
  const tx = S / 2 - (MARK_BOX.x + MARK_BOX.w / 2) * k;
  const ty = S / 2 - (MARK_BOX.y + MARK_BOX.h / 2) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${markGroup(light ? onBrand() : ON_LIGHT)}
  </g>
</svg>`;
}

/** Horizontal lockup: mark + "Aurasure". Canvas is oversized, then trimmed. */
function wordmarkSvg({ light = false, tagline = false } = {}) {
  const H = 460;
  const markH = 250;
  const k = markH / MARK_BOX.h;
  const markW = MARK_BOX.w * k;
  const gap = 46;
  const textX = markW + gap;
  const fontSize = 172;
  const W = Math.round(textX + 1400); // generous; trimmed back to the ink box
  const baseline = tagline ? 250 : 276;
  const ty = (H - MARK_BOX.h * k) / 2 - MARK_BOX.y * k;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g transform="translate(0 ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${markGroup(light ? onBrand() : ON_LIGHT)}
  </g>
  <text x="${textX}" y="${baseline}" font-family="Manrope" font-weight="800" font-size="${fontSize}"
        letter-spacing="-5" fill="${light ? C.white : C.ink}">Aurasure</text>
  ${
    tagline
      ? `<text x="${textX + 4}" y="${baseline + 74}" font-family="Manrope" font-weight="500" font-size="52"
        letter-spacing="6" fill="${light ? 'rgba(255,255,255,0.82)' : C.inkSoft}">FOOD &amp; SHOPPING</text>`
      : ''
  }
</svg>`;
}

/** Vertical lockup used by the splash screen. */
function splashSvg() {
  const S = 1200;
  const markH = 430;
  const k = markH / MARK_BOX.h;
  const tx = S / 2 - (MARK_BOX.x + MARK_BOX.w / 2) * k;
  const ty = 300 - MARK_BOX.y * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">
    ${markGroup(ON_LIGHT)}
  </g>
  <text x="${S / 2}" y="880" text-anchor="middle" font-family="Manrope" font-weight="800"
        font-size="146" letter-spacing="-4" fill="${C.ink}">Aurasure</text>
  <text x="${S / 2}" y="950" text-anchor="middle" font-family="Manrope" font-weight="500"
        font-size="44" letter-spacing="7" fill="${C.inkSoft}">FOOD &amp; SHOPPING</text>
</svg>`;
}

/* ----------------------------------------------------------------- raster */

async function render(svg, { width, opaque = null, trimPad = null } = {}) {
  const r = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
    font: { fontFiles: [MANROPE.extraBold, MANROPE.medium], loadSystemFonts: false, defaultFontFamily: 'Manrope' },
    shapeRendering: 2,
    textRendering: 1,
    imageRendering: 0,
  });
  let pipe = sharp(r.render().asPng());

  // Lockups are drawn on an oversized canvas (text metrics aren't known up
  // front), so crop to the ink box and re-pad by a fixed share of the height.
  // That gives every logo file the same optical margin.
  if (trimPad != null) {
    pipe = sharp(await pipe.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 }).toBuffer());
    const meta = await pipe.metadata();
    const pad = Math.round(meta.height * trimPad);
    pipe = sharp(
      await pipe
        .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer(),
    );
  }

  if (opaque) pipe = pipe.flatten({ background: opaque });
  return pipe.png({ compressionLevel: 9, palette: false }).toBuffer();
}

const FILES = [
  // App icon (iOS + Android legacy + store listings). Flat tile, no alpha.
  { name: 'icon.png', svg: () => iconSvg(), width: 1024, opaque: C.brand },
  // Android adaptive icon: foreground inside the 66% safe zone, plus a
  // monochrome layer for Android 13 themed icons. The background is a flat
  // colour set in app.json, so there is no background bitmap.
  { name: 'adaptive-icon.png', svg: () => adaptiveForegroundSvg(), width: 1024 },
  { name: 'adaptive-icon-monochrome.png', svg: () => adaptiveForegroundSvg({ mono: true }), width: 1024 },
  // Splash + web.
  { name: 'splash-icon.png', svg: () => splashSvg(), width: 1200 },
  { name: 'favicon.png', svg: () => iconSvg({ rounded: 180 }), width: 96 },
  // In-app artwork.
  { name: 'logo_mark.png', svg: () => markSvg(), width: 512 },
  { name: 'logo_mark_light.png', svg: () => markSvg({ light: true }), width: 512 },
  { name: 'logo_aurasure.png', svg: () => wordmarkSvg(), width: 1600, trimPad: 0.06 },
  { name: 'logo_aurasure_light.png', svg: () => wordmarkSvg({ light: true }), width: 1600, trimPad: 0.06 },
  { name: 'logo_aurasure_stacked.png', svg: () => splashSvg(), width: 900 },
];

mkdirSync(OUT_DIR, { recursive: true });
const target = process.argv[2] ? resolve(process.argv[2]) : OUT_DIR;
mkdirSync(target, { recursive: true });

for (const f of FILES) {
  const buf = await render(f.svg(), { width: f.width, opaque: f.opaque });
  const out = join(target, f.name);
  writeFileSync(out, buf);
  const { width, height } = await sharp(out).metadata();
  console.log(`${f.name.padEnd(34)} ${width}x${height}  ${(buf.length / 1024).toFixed(1)} kB`);
}
console.log(`\nWrote ${FILES.length} files to ${target}`);
