/**
 * Honest pins for the stylised map. Outlets and cities carry real lat/lng
 * from the API; this projects a set of coordinates onto the 0..1 canvas so
 * relative positions are truthful instead of grid slots. Points outside the
 * bounding box are clamped to the edge with a margin.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Projected {
  x: number;
  y: number;
}

const MARGIN = 0.12;

function boundsOf(points: GeoPoint[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  // A single point (or a vertical/horizontal line) still needs a window.
  if (maxLat - minLat < 0.01) {
    const mid = (minLat + maxLat) / 2;
    minLat = mid - 0.005;
    maxLat = mid + 0.005;
  }
  if (maxLng - minLng < 0.01) {
    const mid = (minLng + maxLng) / 2;
    minLng = mid - 0.005;
    maxLng = mid + 0.005;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function clamp01(value: number): number {
  return Math.min(1 - MARGIN, Math.max(MARGIN, value));
}

/**
 * Project `points` onto the canvas. Pass every point that will be drawn
 * (outlets + user) in one call so they share the same window.
 */
export function project(points: GeoPoint[]): Projected[] {
  if (points.length === 0) return [];
  const { minLat, maxLat, minLng, maxLng } = boundsOf(points);
  return points.map((point) => ({
    x: clamp01(MARGIN + ((point.lng - minLng) / (maxLng - minLng)) * (1 - MARGIN * 2)),
    y: clamp01(MARGIN + ((maxLat - point.lat) / (maxLat - minLat)) * (1 - MARGIN * 2)),
  }));
}

/** True when both coordinates are real numbers (not null/undefined/NaN). */
export function hasCoords<T extends { lat?: number | null; lng?: number | null }>(
  value: T | null | undefined,
): value is T & GeoPoint {
  return (
    value != null &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
  );
}
