'use client';

import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

/** Horizontally scrollable filter tabs (status filters, module filters…). */
export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={clsx('scroll-thin -mx-1 overflow-x-auto px-1', className)}>
      <div className="flex w-max items-center gap-1.5">
        {items.map((item) => {
          const selected = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-pressed={selected}
              className={clsx(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                selected
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-ink-600 ring-1 ring-[var(--color-line-strong)] hover:bg-ink-50',
              )}
            >
              {item.label}
              {typeof item.count === 'number' ? (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-[11px] tabular',
                    selected ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
