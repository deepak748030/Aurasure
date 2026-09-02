'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABEL } from '@/lib/format';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'food';

const TONE: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] ring-[#c8ead4]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] ring-[#f6dfb8]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] ring-[#f6cccc]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-info)] ring-[#bae1f7]',
  food: 'bg-food-100 text-food-700 ring-[#ffcdb8]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap ring-1 ring-inset',
        TONE[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<OrderStatus, Tone> = {
  placed: 'warning',
  confirmed: 'info',
  preparing: 'brand',
  out_for_delivery: 'food',
  delivered: 'success',
  cancelled: 'danger',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>
      {ORDER_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function ModuleBadge({ module }: { module: string }) {
  return (
    <Badge tone={module === 'food' ? 'food' : 'brand'}>{module === 'food' ? 'Food' : 'Shop'}</Badge>
  );
}
