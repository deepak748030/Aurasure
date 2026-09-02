'use client';

import { useEffect, useState } from 'react';
import { Trash2, Download, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { clearActivity, readActivity, subscribeActivity, type ActivityEntry } from '@/lib/activity';
import { downloadCsv, toCsv } from '@/lib/csv';
import { dateTime, timeAgo } from '@/lib/format';
import { useToast } from '@/lib/toast';

export default function ActivityPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setEntries(readActivity());
    return subscribeActivity(setEntries);
  }, []);

  const needle = search.trim().toLowerCase();
  const rows = entries.filter(
    (entry) =>
      !needle ||
      entry.action.toLowerCase().includes(needle) ||
      entry.target.toLowerCase().includes(needle) ||
      entry.actor.toLowerCase().includes(needle),
  );

  const exportCsv = () => {
    downloadCsv(
      `aurasure-admin-activity-${new Date().toISOString().slice(0, 10)}`,
      toCsv(rows as unknown as Record<string, unknown>[], [
        { key: 'at', label: 'When' },
        { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'target', label: 'Target' },
        { key: 'detail', label: 'Detail' },
      ]),
    );
    toast.info(`Exported ${rows.length} entries`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity log"
        subtitle="Every change made from this browser — order moves, catalogue edits, wallet adjustments."
        actions={
          <>
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
              Export
            </Button>
            <Button variant="secondary" icon={<Trash2 size={16} />} onClick={() => setConfirm(true)} disabled={!entries.length}>
              Clear
            </Button>
          </>
        }
      />

      <Card className="border-l-[3px] border-l-brand-600">
        <p className="text-[13px] leading-relaxed text-ink-600">
          The API does not persist an audit trail yet (see <span className="font-medium text-ink-800">docs/06-admin-panel.md §6.4</span>).
          Until a server-side <span className="font-mono text-[12.5px]">AuditLog</span> collection exists, this page keeps a
          local record of the actions performed from this browser so nothing you do here is invisible.
        </p>
      </Card>

      <Card padded={false}>
        <div className="p-4 sm:p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search action, target or actor…" />
        </div>

        <div className="border-t border-[var(--color-line)]">
          {rows.length === 0 ? (
            <EmptyState
              title="No activity recorded"
              message="Actions you take in the console will be listed here."
              icon={<History size={22} />}
            />
          ) : (
            <ol className="divide-y divide-[var(--color-line)]">
              {rows.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <span className="text-[13.5px] font-medium text-ink-900">{entry.action}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink-600">
                    {entry.target}
                    {entry.detail ? <span className="text-ink-400"> · {entry.detail}</span> : null}
                  </span>
                  <span className="text-[12px] text-ink-400">{entry.actor}</span>
                  <span className="w-28 shrink-0 text-right text-[12px] text-ink-400" title={dateTime(entry.at)}>
                    {timeAgo(entry.at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={confirm}
        title="Clear the local activity log?"
        message="This only removes the log stored in this browser. Nothing on the server changes."
        confirmLabel="Clear log"
        onConfirm={() => {
          clearActivity();
          setConfirm(false);
          toast.success('Activity log cleared');
        }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
