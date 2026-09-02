import type { OrderStatus } from './types';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('en-IN');

export function money(value: number | undefined | null): string {
  return INR.format(Math.round(Number(value ?? 0)));
}

/** Compact money for KPI tiles: ₹1.2L, ₹45.3k. */
export function moneyShort(value: number | undefined | null): string {
  const n = Math.round(Number(value ?? 0));
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export function num(value: number | undefined | null): string {
  return NUM.format(Number(value ?? 0));
}

export function dateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dateOnly(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function shortDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** "4 min ago", "2 h ago", "3 d ago". */
export function timeAgo(value?: string | null): string {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return dateOnly(value);
}

/** Minutes elapsed since a timestamp - used by the Live Ops age timers. */
export function minutesSince(value?: string | null): number {
  if (!value) return 0;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 60000));
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Pending',
  confirmed: 'Accepted',
  preparing: 'Processing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_FLOW: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

/** Next forward-only status the server will accept, if any. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_FLOW.indexOf(status);
  if (index < 0 || index === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[index + 1];
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function maskPhone(phone: string, revealed: boolean): string {
  if (!phone) return '—';
  if (revealed) return phone;
  return `${phone.slice(0, 2)}••••${phone.slice(-3)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function imageUrl(image: unknown): string | null {
  if (!image || typeof image !== 'object') return null;
  const ref = image as { kind?: string; uri?: string };
  return ref.kind === 'uri' && ref.uri ? ref.uri : null;
}
