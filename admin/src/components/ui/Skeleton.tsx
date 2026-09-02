'use client';

import clsx from 'clsx';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={clsx('skeleton', className)} style={style} />;
}

/** Table placeholder used while a list query is loading. */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      <div className="hidden gap-3 border-b border-[var(--color-line)] px-4 py-3 md:flex">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--color-line)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex flex-col gap-2 px-4 py-3.5 md:flex-row md:items-center md:gap-3">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={clsx('h-3.5', c === 0 ? 'w-2/5 md:flex-[1.4]' : 'w-1/3 md:flex-1')}
                
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)]"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[var(--color-line)]',
        className,
      )}
    >
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${25 + ((i * 37) % 70)}%` }} />
      ))}
    </div>
  );
}
