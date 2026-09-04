'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X, Bike, Store as StoreIcon, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { SearchInput, Textarea, Field } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatSkeleton } from '@/components/ui/Skeleton';
import { usePartners, usePartnerDecision } from '@/lib/queries';
import { prefetchCustomer } from '@/lib/prefetch';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { downloadCsv, toCsv } from '@/lib/csv';
import { dateOnly, timeAgo, titleCase } from '@/lib/format';
import type { PartnerApplication } from '@/lib/types';

const TABS = [
  { key: 'submitted', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export default function PartnersPage() {
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError, error, refetch } = usePartners();
  const decision = usePartnerDecision();

  const [tab, setTab] = useState('submitted');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<{ app: PartnerApplication; status: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  const all = data?.applications ?? [];

  const counts = useMemo(
    () => ({
      submitted: all.filter((a) => a.status === 'submitted').length,
      approved: all.filter((a) => a.status === 'approved').length,
      rejected: all.filter((a) => a.status === 'rejected').length,
      delivery: all.filter((a) => a.kind === 'delivery').length,
      vendor: all.filter((a) => a.kind === 'vendor').length,
    }),
    [all],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all
      .filter((app) => (tab === 'all' ? true : app.status === tab))
      .filter(
        (app) =>
          !needle ||
          app.name.toLowerCase().includes(needle) ||
          app.phone.includes(needle) ||
          app.city.toLowerCase().includes(needle),
      );
  }, [all, tab, search]);

  const submit = async () => {
    if (!reviewing) return;
    setReviewError('');
    try {
      await decision.mutateAsync({ userId: reviewing.app.userId, status: reviewing.status, note });
      logActivity({
        actor: user?.name ?? 'admin',
        action: `Partner ${reviewing.status}`,
        target: `${reviewing.app.name} (${reviewing.app.kind})`,
        detail: note,
      });
      toast.success(`${reviewing.app.name} ${reviewing.status}`);
      setReviewing(null);
      setNote('');
    } catch (err) {
      const message = (err as Error).message;
      setReviewError(message);
      toast.error(message);
    }
  };

  const columns: Column<PartnerApplication>[] = [
    {
      key: 'name',
      label: 'Applicant',
      primary: true,
      render: (app) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink-900">{app.name}</p>
          <p className="truncate text-[12px] text-ink-400">{app.phone}</p>
        </div>
      ),
      value: (app) => app.name,
    },
    {
      key: 'kind',
      label: 'Applying as',
      render: (app) => (
        <Badge tone={app.kind === 'delivery' ? 'info' : 'brand'}>
          {app.kind === 'delivery' ? 'Delivery partner' : 'Vendor'}
        </Badge>
      ),
      value: (app) => app.kind,
    },
    {
      key: 'city',
      label: 'City',
      render: (app) => <span className="text-[13px] text-ink-700">{app.city || '—'}</span>,
      value: (app) => app.city,
    },
    {
      key: 'appliedAt',
      label: 'Applied',
      hideOnMobile: true,
      render: (app) => (
        <span className="text-[12.5px] text-ink-500">
          {dateOnly(app.appliedAt)} <span className="text-ink-400">· {timeAgo(app.appliedAt)}</span>
        </span>
      ),
      value: (app) => app.appliedAt ?? '',
    },
    {
      key: 'status',
      label: 'Status',
      render: (app) => (
        <Badge tone={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'} dot>
          {titleCase(app.status)}
        </Badge>
      ),
      value: (app) => app.status,
    },
    {
      key: 'note',
      label: 'Reviewer note',
      hideOnMobile: true,
      render: (app) => <span className="text-[12.5px] text-ink-500">{app.note || '—'}</span>,
      value: (app) => app.note,
    },
  ];

  const exportCsv = () => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }));
    const flat = rows.map((app) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) record[column.key] = column.value ? column.value(app) : '';
      return record;
    });
    downloadCsv(`aurasure-partner-applications-${tab}`, toCsv(flat, cols));
    toast.info(`Exported ${flat.length} rows`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Partner applications"
        subtitle="Vendor and delivery-partner requests submitted from the mobile app."
        actions={
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <StatSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Pending review" value={counts.submitted} tone="warning" />
          <StatCard label="Approved" value={counts.approved} tone="success" />
          <StatCard label="Vendors" value={counts.vendor} icon={StoreIcon} tone="brand" />
          <StatCard label="Delivery partners" value={counts.delivery} icon={Bike} tone="info" />
        </div>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Tabs
            items={TABS.map((t) => ({
              ...t,
              count: t.key === 'all' ? all.length : counts[t.key as keyof typeof counts],
            }))}
            active={tab}
            onChange={setTab}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search applicant, phone or city…" />
        </div>

        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(app) => app.userId}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No applications here"
              emptyMessage="Nothing waiting in this tab right now."
              actions={(app) => (
                <>
                  <Link
                    href={`/customers/${app.userId}`}
                    onMouseEnter={() => prefetchCustomer(queryClient, app.userId)}
                    onFocus={() => prefetchCustomer(queryClient, app.userId)}
                    className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100"
                  >
                    Profile
                  </Link>
                  {app.status !== 'approved' ? (
                    <Button
                      size="sm"
                      variant="success"
                      icon={<Check size={15} />}
                      onClick={() => {
                        setNote(app.note ?? '');
                        setReviewError('');
                        setReviewing({ app, status: 'approved' });
                      }}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {app.status !== 'rejected' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<X size={15} />}
                      onClick={() => {
                        setNote(app.note ?? '');
                        setReviewError('');
                        setReviewing({ app, status: 'rejected' });
                      }}
                    >
                      Reject
                    </Button>
                  ) : null}
                </>
              )}
            />
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={reviewing?.status === 'approved' ? 'Approve application' : 'Reject application'}
        subtitle={reviewing ? `${reviewing.app.name} · ${titleCase(reviewing.app.kind)}` : undefined}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewing?.status === 'approved' ? 'success' : 'danger'}
              loading={decision.isPending}
              onClick={submit}
            >
              {reviewing?.status === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        {reviewError ? (
          <p className="mb-4 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
            {reviewError}
          </p>
        ) : null}
        <Field
          label="Reviewer note"
          hint="Saved on the application and visible to the applicant in the app (max 300 characters)."
        >
          <Textarea
            value={note}
            maxLength={300}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              reviewing?.status === 'approved'
                ? 'Documents verified. Onboarding call scheduled.'
                : 'Documents unclear — please re-apply with a valid ID.'
            }
          />
        </Field>
      </Modal>
    </div>
  );
}
