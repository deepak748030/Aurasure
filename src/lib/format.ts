export const formatINR = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`;

export const formatRating = (value: number): string => value.toFixed(1);

export const formatMinutes = (minutes: number): string => `${minutes} min`;

export const formatDistance = (km: number): string => `${km.toFixed(1)} km`;

export const formatCount = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

export const discountPercent = (mrp: number, price: number): number =>
  mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const pluralize = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;
