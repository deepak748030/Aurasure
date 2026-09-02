'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Store, UtensilsCrossed, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatSkeleton } from '@/components/ui/Skeleton';
import { useVendors } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { downloadCsv, toCsv } from '@/lib/csv';
import { dateOnly, timeAgo, titleCase } from '@/lib/format';
import type { Vendor } from '@/lib/types';

const TABS = [
  { key: '', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'In review' },
  { key: 'needs_info', label: 'Needs info' },
  { key: 'approved', label: 'Live' },
  { key: 'rejected', label: 'Rejected' },
];

export default function VendorsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('submitted');
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, isError, error, refetch } = useVendors({
    status: tab || undefined,
    q: search || undefined,
  });

  const rows = data?.vendors ?? [];

  const columns: Column<Vendor>[] = [
    {
      key: 'outlet',
      label: 'Outlet',
      primary: true,
      render: (v) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink-900">{v.outletName || 'Unnamed outlet'}</p>
          <p className="truncate text-[12px] text-ink-400">
            {v.ownerName} · {v.phone}
          </p>
        </div>
      ),
      value: (v) => v.outletName,
    },
    {
      key: 'module',
      label: 'Module',
      render: (v) => (
        <Badge tone={v.module === 'food' ? 'warning' : 'brand'}>{v.module === 'food' ? 'Food' : 'Shop'}</Badge>
      ),
      value: (v) => v.module,
    },
    {
      key: 'city',
      label: 'City',
      render: (v) => <span className="text-[13px] text-ink-700">{v.city || '—'}</span>,
      value: (v) => v.city,
    },
    {
      key: 'docs',
      label: 'Docs',
      hideOnMobile: true,
      render: (v) => {
        const n = v.documents?.length || 0;
        const ok = v.documents?.filter((d) => d.verified).length || 0;
        return (
          <span className="text-[12.5px] text-ink-500">
            {ok}/{n} verified
          </span>
        );
      },
      value: (v) => v.documents?.filter((d) => d.verified).length,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <Badge
          tone={v.status === 'approved' ? 'success' : v.status === 'rejected' || v.status === 'suspended' ? 'danger' : 'warning'}
          dot
        >
          {titleCase(v.status.replace('_', ' '))}
        </Badge>
      ),
      value: (v) => v.status,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      hideOnMobile: true,
      render: (v) =>
        v.submittedAt ? (
          <span className="text-[12.5px] text-ink-500">
            {dateOnly(v.submittedAt)} · {timeAgo(v.submittedAt)}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
      value: (v) => v.submittedAt ?? '',
    },
  ];

  const exportCsv = () => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }));
    const flat = rows.map((v) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) record[column.key] = column.value ? column.value(v) : '';
      return record;
    });
    downloadCsv(`aurasure-vendors-${tab || 'all'}`, toCsv(flat, cols));
    toast.info(`Exported ${flat.length} rows`);
  };

  const counts = useMemo(
    () => ({
      pending: data?.pending ?? 0,
      food: rows.filter((v) => v.module === 'food').length,
      shop: rows.filter((v) => v.module === 'shop').length,
    }),
    [data, rows],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendor KYC"
        subtitle="One phone, one module. Approve only after every document is verified."
        actions={
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <StatSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatCard label="Waiting on KYC" value={counts.pending} tone="warning" />
          <StatCard label="Food in this tab" value={counts.food} icon={UtensilsCrossed} tone="brand" />
          <StatCard label="Shop in this tab" value={counts.shop} icon={Store} tone="info" />
        </div>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Tabs items={TABS} active={tab} onChange={setTab} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search outlet, owner, phone or city…" />
        </div>
        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(v) => v.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No vendors here"
              emptyMessage="Applications from the vendor app land here for KYC."
              actions={(v) => (
                <Link
                  href={`/vendors/${v.id}`}
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
