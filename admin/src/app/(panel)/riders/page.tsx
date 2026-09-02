'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatSkeleton } from '@/components/ui/Skeleton';
import { useRiders } from '@/lib/queries';
import { titleCase } from '@/lib/format';
import type { Rider } from '@/lib/types';

const STATUS_TABS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'In review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'all', label: 'All' },
];

export default function RidersPage() {
  const [tab, setTab] = useState('submitted');
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, isError, error, refetch } = useRiders({});

  const all = data?.riders ?? [];
  const counts = useMemo(
    () => ({
      submitted: all.filter((r) => r.status === 'submitted').length,
      under_review: all.filter((r) => r.status === 'under_review').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
      suspended: all.filter((r) => r.status === 'suspended').length,
      online: all.filter((r) => r.dutyState === 'online' || r.dutyState === 'on_task').length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all
      .filter((r) => (tab === 'all' ? true : r.status === tab))
      .filter(
        (r) =>
          !needle ||
          r.name.toLowerCase().includes(needle) ||
          r.phone.includes(needle) ||
          r.city.toLowerCase().includes(needle) ||
          r.vehicleNumber.toLowerCase().includes(needle),
      );
  }, [all, tab, search]);

  const columns: Column<Rider>[] = [
    {
      key: 'name',
      label: 'Partner',
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink-900">{r.name}</p>
          <p className="truncate text-[12px] text-ink-400">{r.phone} · {r.city || '—'}</p>
        </div>
      ),
      value: (r) => r.name,
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (r) => (
        <span className="text-[13px] text-ink-700">
          {r.vehicleType.toUpperCase()} · {r.vehicleNumber || '—'}
        </span>
      ),
      value: (r) => r.vehicleType,
    },
    {
      key: 'duty',
      label: 'Duty',
      render: (r) => (
        <Badge tone={r.dutyState === 'online' || r.dutyState === 'on_task' ? 'success' : 'neutral'}>
          {titleCase(r.dutyState.replace('_', ' '))}
        </Badge>
      ),
      value: (r) => r.dutyState,
    },
    {
      key: 'cod',
      label: 'COD in hand',
      hideOnMobile: true,
      render: (r) => <span className="text-[13px] text-ink-700">₹{Math.round(r.codInHand)}</span>,
      value: (r) => String(r.codInHand),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' || r.status === 'suspended' ? 'danger' : 'warning'} dot>
          {titleCase(r.status.replace('_', ' '))}
        </Badge>
      ),
      value: (r) => r.status,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Delivery partners"
        subtitle="Rider KYC, duty state and COD reconciliation from the Rider app."
        actions={
          <Badge tone="info" dot>
            {counts.online} online now
          </Badge>
        }
      />

      {isLoading ? (
        <StatSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Submitted" value={counts.submitted} tone="warning" />
          <StatCard label="In review" value={counts.under_review} tone="info" />
          <StatCard label="Approved" value={counts.approved} tone="success" />
          <StatCard label="Suspended" value={counts.suspended} tone="danger" />
        </div>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Tabs
            items={STATUS_TABS.map((t) => ({
              ...t,
              count: t.key === 'all' ? all.length : counts[t.key as keyof typeof counts],
            }))}
            active={tab}
            onChange={setTab}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, city or vehicle…" />
        </div>
        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No delivery partners here"
              emptyMessage="Rider applications from the Rider app land here for KYC."
              actions={(r) => (
                <Link
                  href={`/riders/${r.id}`}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Review
                </Link>
              )}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
