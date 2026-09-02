'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-[22px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13.5px] text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const ICON_TONE = {
  brand: 'bg-brand-50 text-brand-600',
  food: 'bg-food-100 text-food-700',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  info: 'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  neutral: 'bg-ink-100 text-ink-600',
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof ICON_TONE;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={clsx(
        'flex items-start gap-3 rounded-[var(--radius-card)] bg-white p-4 text-left shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)] transition-colors',
        onClick && 'hover:bg-ink-50',
      )}
    >
      {Icon ? (
        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', ICON_TONE[tone])}>
          <Icon size={18} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-ink-500">{label}</span>
        <span className="mt-1 block truncate text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink-900 tabular">
          {value}
        </span>
        {hint ? <span className="mt-1 block truncate text-[12px] text-ink-400">{hint}</span> : null}
      </span>
    </Wrapper>
  );
}
