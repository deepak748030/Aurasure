'use client';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ListMeta } from '@/lib/api';

export function Pagination({
  meta,
  onPage,
  className,
}: {
  meta?: ListMeta;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (!meta || meta.total === 0) return null;

  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i += 1) pages.push(i);

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3 sm:flex-row',
        className,
      )}
    >
      <p className="text-[12.5px] text-ink-500 tabular">
        Showing <span className="font-medium text-ink-700">{from}</span>–
        <span className="font-medium text-ink-700">{to}</span> of{' '}
        <span className="font-medium text-ink-700">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={clsx(
              'h-8 min-w-8 rounded-lg px-2 text-[13px] font-medium transition-colors tabular',
              p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100',
            )}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
