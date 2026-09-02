'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  /** Rich cell renderer. Falls back to `String(row[key])`. */
  render?: (row: T) => ReactNode;
  /** Plain value used by CSV export. */
  value?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hidden in the mobile card layout (kept in the table + CSV). */
  hideOnMobile?: boolean;
  /** Used as the card heading on small screens. */
  primary?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Keeps the previous rows visible while a background refetch runs. */
  refreshing?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}

function cellContent<T>(column: Column<T>, row: T): ReactNode {
  if (column.render) return column.render(row);
  const raw = (row as Record<string, unknown>)[column.key];
  if (raw === null || raw === undefined || raw === '') return <span className="text-ink-300">—</span>;
  return String(raw);
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  refreshing = false,
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'No records match the current filters.',
  emptyAction,
  actions,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton rows={7} cols={Math.min(columns.length, 6)} />;

  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  return (
    <div className={clsx('transition-opacity', refreshing && 'opacity-60')}>
      {/* Desktop / tablet: real table */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={clsx(
                    'px-4 py-2.5 text-[11.5px] font-semibold tracking-wide text-ink-500 uppercase',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                  )}
                >
                  {column.label}
                </th>
              ))}
              {actions ? <th className="px-4 py-2.5 text-right text-[11.5px] font-semibold tracking-wide text-ink-500 uppercase">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx('transition-colors hover:bg-ink-50', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-4 py-3 align-middle text-ink-700',
                      column.align === 'right' && 'text-right tabular',
                      column.align === 'center' && 'text-center',
                      column.className,
                    )}
                  >
                    {cellContent(column, row)}
                  </td>
                ))}
                {actions ? (
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, same data */}
      <ul className="divide-y divide-[var(--color-line)] md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-4 py-3.5">
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('w-full text-left', !onRowClick && 'cursor-default')}
            >
              <div className="text-sm font-semibold text-ink-900">{cellContent(primary, row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {rest.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[10.5px] font-medium tracking-wide text-ink-400 uppercase">{column.label}</dt>
                    <dd className="truncate text-[13px] text-ink-700">{cellContent(column, row)}</dd>
                  </div>
                ))}
              </dl>
            </button>
            {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
