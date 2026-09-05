import { CURRENCY } from '@/config';

/** ₹1,299 — always rounded, Indian grouping (matches the reference app). */
export function money(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  return `${CURRENCY}${rounded.toLocaleString('en-IN')}`;
}

export function moneyExact(value: number): string {
  const hasPaise = Math.abs((Number(value) || 0) - Math.round(Number(value) || 0)) > 0.004;
  const text = hasPaise ? (Number(value) || 0).toFixed(2) : String(Math.round(Number(value) || 0));
  const [whole, decimals] = text.split('.');
  const grouped = Number(whole ?? '0').toLocaleString('en-IN');
  return `${CURRENCY}${grouped}${decimals ? `.${decimals}` : ''}`;
}

export function rating(value: number): string {
  return (Number(value) || 0).toFixed(1);
}

export function compactCount(value: number): string {
  const n = Number(value) || 0;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function minutes(value: number): string {
  const n = Math.round(Number(value) || 0);
  if (n <= 0) return '—';
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function distance(km: number): string {
  const n = Number(km) || 0;
  if (n <= 0) return 'Nearby';
  if (n > 100) return '100+ km';
  return `${n.toFixed(1)} km`;
}

export function discountPercent(mrp: number | undefined, price: number): number {
  const m = Number(mrp) || 0;
  const p = Number(price) || 0;
  if (m <= p) return 0;
  return Math.round(((m - p) / m) * 100);
}

export function timeOfDay(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function dayLabel(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return `Today · ${timeOfDay(date)}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeOfDay(date)}`;
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${timeOfDay(date)}`;
}

export function joinedOn(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relative(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "3 items · ₹746" style summary used on cart / order rows. */
export function summarize(count: number, total: number): string {
  return `${count} item${count === 1 ? '' : 's'} · ${money(total)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const text = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return text || 'A';
}

export function countdown(target: Date | null): string | null {
  if (!target) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 'Any moment now';
  const totalSeconds = Math.floor(ms / 1000);
  const minutesLeft = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutesLeft > 60) return `${Math.floor(minutesLeft / 60)} h ${minutesLeft % 60} min`;
  return `${minutesLeft}:${String(seconds).padStart(2, '0')} min`;
}

/** 100 points = ₹10 (server rule in `utils/ledger.js`). */
export function pointsToRupees(points: number): number {
  return Math.floor((Number(points) || 0) / 100) * 10;
}

export function tierFor(points: number): { name: string; color: string; progress: number } {
  if (points >= 5000) return { name: 'Platinum', color: '#64748B', progress: 1 };
  if (points >= 2500) return { name: 'Gold', color: '#E5A710', progress: (points - 2500) / 2500 };
  if (points >= 1000) return { name: 'Silver', color: '#94A3B8', progress: (points - 1000) / 1500 };
  return { name: 'Bronze', color: '#C2703D', progress: points / 1000 };
}

/** Pilot cities the seeded outlets live in (Raipur first, like the reference app). */
export const CITIES = ['Raipur', 'Bhilai', 'Durg', 'Bastar', 'Rajnanagaon', 'Delhi', 'Mumbai', 'Bengaluru'] as const;

/** "3 items · ₹740" style summary used on account rows. */
export function orderSummary(orders: { items: unknown[]; total: number }[]): string {
  if (orders.length === 0) return 'No orders yet';
  const items = orders.reduce((sum, order) => sum + order.items.length, 0);
  const spent = orders.reduce((sum, order) => sum + order.total, 0);
  return `${orders.length} order${orders.length === 1 ? '' : 's'} · ${items} item${items === 1 ? '' : 's'} · ${money(spent)} spent`;
}
