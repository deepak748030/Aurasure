// Tiny color helpers. Only used to pick a readable status bar / navigation bar
// icon style for whatever surface is painted behind it, so no dependency on a
// full color parsing library is needed.

/** Parses `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` into 0-255 channels. */
function parseHex(color: string): [number, number, number] | null {
  const c = color.trim();
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hex.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const raw = m[1] ?? '';
  const parts = raw.split(/[,/\s]+/).filter(Boolean).map((v) => parseFloat(v));
  if (parts.length < 3 || parts.slice(0, 3).some((v) => Number.isNaN(v))) return null;
  const r = parts[0] as number;
  const g = parts[1] as number;
  const b = parts[2] as number;
  return [r, g, b];
}

/** WCAG relative luminance, 0 (black) → 1 (white). */
function luminance(color: string): number {
  const rgb = parseHex(color);
  if (!rgb) return 1;
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** True when a surface is dark enough to need white system-bar icons. */
export function isDark(color: string): boolean {
  return luminance(color) < 0.5;
}
