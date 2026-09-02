'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, Wallet, Sparkles, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/Input';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/EmptyState';
import { useCustomers } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { downloadCsv, toCsv } from '@/lib/csv';
import { dateOnly, initials, maskPhone, money, num } from '@/lib/format';
import type { CustomerRow } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(
    () => ({ q: debounced || undefined, role: role || undefined, page, limit: 20 }),
    [debounced, role, page],
  );
  const { data, isLoading, isFetching, isError, error, refetch } = useCustomers(query);

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name',
      label: 'Customer',
      primary: true,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-semibold text-brand-700">
            {initials(row.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-ink-900">{row.name}</span>
            <span className="block truncate text-[12px] text-ink-400">{row.email || row.id}</span>
          </span>
        </div>
      ),
      value: (row) => row.name,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setReveal((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
          }}
          className="text-[13px] text-ink-700 underline decoration-dotted underline-offset-2 hover:text-brand-600 tabular"
          title="Click to reveal / hide"
        >
          {maskPhone(row.phone, Boolean(reveal[row.id]))}
        </button>
      ),
      value: (row) => row.phone,
    },
    {
      key: 'orders',
      label: 'Orders',
      align: 'right',
      render: (row) => <span className="tabular">{num(row.orders)}</span>,
      value: (row) => row.orders,
    },
    {
      key: 'spent',
      label: 'Lifetime value',
      align: 'right',
      render: (row) => <span className="font-semibold text-ink-900">{money(row.spent)}</span>,
      value: (row) => row.spent,
    },
    {
      key: 'wallet',
      label: 'Wallet',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-[13px] text-ink-700 tabular">
          <Wallet size={13} className="text-ink-400" />
          {money(row.wallet)}
        </span>
      ),
      value: (row) => row.wallet,
    },
    {
      key: 'loyaltyPoints',
      label: 'Points',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-[13px] text-ink-700 tabular">
          <Sparkles size={13} className="text-ink-400" />
          {num(row.loyaltyPoints)}
        </span>
      ),
      value: (row) => row.loyaltyPoints,
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge tone={row.role === 'admin' ? 'brand' : 'neutral'}>
          {row.role === 'admin' ? 'Admin' : 'Customer'}
        </Badge>
      ),
      value: (row) => row.role,
    },
    {
      key: 'joinedAt',
      label: 'Joined',
      hideOnMobile: true,
      render: (row) => <span className="text-[12.5px] text-ink-500">{dateOnly(row.joinedAt)}</span>,
      value: (row) => row.joinedAt,
    },
  ];

  const exportCsv = () => {
    const rows = data?.customers ?? [];
    const cols = columns.map((c) => ({ key: c.key, label: c.label }));
    const flat = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) record[column.key] = column.value ? column.value(row) : '';
      return record;
    });
    downloadCsv(`aurasure-customers-${new Date().toISOString().slice(0, 10)}`, toCsv(flat, cols));
    toast.info(`Exported ${flat.length} rows`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        subtitle="Every registered account with wallet, loyalty and order history."
        actions={
          <Button
            variant="secondary"
            icon={<Download size={16} />}
            onClick={exportCsv}
            disabled={!data?.customers.length}
          >
            Export CSV
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:p-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, phone, email or referral code…"
            className="flex-1"
          />
          <Select
            value={role}
            aria-label="Filter by role"
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="sm:w-44"
          >
            <option value="">All roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Admins</option>
          </Select>
        </div>

        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.customers ?? []}
              rowKey={(row) => row.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No customers found"
              emptyMessage="Nobody matches this search."
              onRowClick={(row) => router.push(`/customers/${row.id}`)}
              actions={(row) => (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Eye size={15} />}
                    onClick={() => router.push(`/customers/${row.id}`)}
                  >
                    Profile
                  </Button>
                  {row.partnerKind ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<ShieldCheck size={15} />}
                      onClick={() => router.push('/partners')}
                    >
                      {row.partnerKind}
                    </Button>
                  ) : null}
                </>
              )}
            />
          )}
        </div>

        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </div>
  );
}
