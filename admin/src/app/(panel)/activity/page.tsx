'use client';

import { useMemo, useState } from 'react';
import { Download, History, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuditLog } from '@/lib/queries';
import { downloadCsv, toCsv } from '@/lib/csv';
import { dateTime, timeAgo } from '@/lib/format';
import { useToast } from '@/lib/toast';

export default function ActivityPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isFetching } = useAuditLog({ q: search, page, limit: 100 }, 30000);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const total = data?.meta?.total ?? entries.length;

  const exportCsv = () => {
    if (!entries.length) return;
    downloadCsv(
      `aurasure-admin-audit-${new Date().toISOString().slice(0, 10)}`,
      toCsv(entries as unknown as Record<string, unknown>[], [
        { key: 'createdAt', label: 'When' },
        { key: 'actorName', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'targetCode', label: 'Target' },
        { key: 'detail', label: 'Detail' },
        { key: 'ip', label: 'IP' },
      ]),
    );
    toast.info(`Exported ${entries.length} server-audit entries`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity log"
        subtitle={`Server-backed audit trail — order moves, KYC decisions, catalogue edits and wallet adjustments. ${total ? `${total} entries.` : ''}`}
        actions={
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      <Card
        className="border-l-[3px] border-l-brand-600"
        padded={false}
      >
        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[13px] leading-relaxed text-ink-600">
            Every mutating admin action is written to the server-side{' '}
            <span className="font-medium text-ink-800">AdminAudit</span> log on the Node API, so the trail survives
            browser changes. Old browser-local records are kept only as a fallback.
          </p>
          <SearchInput value={search} onChange={(next) => { setSearch(next); setPage(1); }} placeholder="Search action, target or actor…" />
        </div>
        <div className="border-t border-[var(--color-line)]">
          {isLoading ? (
            <p className="px-5 py-10 text-center text-[13px] text-ink-500">Loading audit log…</p>
          ) : entries.length === 0 ? (
            <EmptyState
              title="No audit entries"
              message="Mutations you make in the console will be recorded here."
              icon={<History size={22} />}
            />
          ) : (
            <ol className="divide-y divide-[var(--color-line)]">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <span className="text-[13.5px] font-medium text-ink-900">{entry.action}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink-600">
                    {entry.targetCode || entry.targetId}
                    {entry.detail ? <span className="text-ink-400"> · {entry.detail}</span> : null}
                  </span>
                  <span className="text-[12px] text-ink-400">{entry.actorName}</span>
                  <span className="w-28 shrink-0 text-right text-[12px] text-ink-400" title={dateTime(entry.createdAt)}>
                    {timeAgo(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        {total > entries.length ? (
          <div className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-3">
            <span className="text-[12px] text-ink-500">
              Showing {entries.length} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-8 px-3 text-[12px]" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button variant="secondary" className="h-8 px-3 text-[12px]" onClick={() => setPage((p) => p + 1)} disabled={entries.length < 100}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-end">
        <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!entries.length}>
          Export
        </Button>
      </div>
    </div>
  );
}
