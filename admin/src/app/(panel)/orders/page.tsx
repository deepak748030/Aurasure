'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Eye, ChevronRight, Ban } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Select, SearchInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatusBadge, ModuleBadge, Badge } from '@/components/ui/Badge';
import { useOrders, useOrderStatusMutation } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { logActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { downloadCsv, toCsv } from '@/lib/csv';
import { money, dateTime, timeAgo, nextStatus, ORDER_STATUS_LABEL, titleCase } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'placed', label: 'Pending' },
  { key: 'confirmed', label: 'Accepted' },
  { key: 'preparing', label: 'Processing' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function OrdersPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();

  const [status, setStatus] = useState('all');
  const [module, setModule] = useState(params.get('module') ?? '');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState<Order | null>(null);

  // Sidebar links like /orders?module=food change the query without remounting.
  const moduleParam = params.get('module') ?? '';
  useEffect(() => {
    setModule(moduleParam);
    setPage(1);
  }, [moduleParam]);

  const query = useMemo(
    () => ({ page, limit: 20, status: status === 'all' ? undefined : status, module: module || undefined }),
    [page, status, module],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useOrders(query, { refetchInterval: 45000 });
  const statusMutation = useOrderStatusMutation();

  const rows = useMemo(() => {
    const list = data?.orders ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (order) =>
        order.code.toLowerCase().includes(needle) ||
        order.id.toLowerCase().includes(needle) ||
        (order.user?.name ?? '').toLowerCase().includes(needle) ||
        (order.user?.phone ?? '').includes(needle) ||
        order.address.toLowerCase().includes(needle),
    );
  }, [data, search]);

  const advance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    try {
      await statusMutation.mutateAsync({ id: order.id, status: next });
      logActivity({
        actor: user?.name ?? 'admin',
        action: `Order → ${ORDER_STATUS_LABEL[next]}`,
        target: order.code,
      });
      toast.success(`${order.code} moved to ${ORDER_STATUS_LABEL[next]}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const cancel = async () => {
    if (!cancelling) return;
    try {
      await statusMutation.mutateAsync({ id: cancelling.id, status: 'cancelled' });
      logActivity({
        actor: user?.name ?? 'admin',
        action: 'Order cancelled + refunded',
        target: cancelling.code,
      });
      toast.success(`${cancelling.code} cancelled — wallet, points and coupon reversed`);
      setCancelling(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'code',
      label: 'Order',
      primary: true,
      render: (order) => (
        <div className="min-w-0">
          <p className="font-mono text-[12.5px] font-semibold text-ink-900">{order.code}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-400">{timeAgo(order.placedAt)}</p>
        </div>
      ),
      value: (order) => order.code,
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (order) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-800">{order.user?.name ?? 'Deleted user'}</p>
          <p className="truncate text-[12px] text-ink-400">{order.user?.phone ?? '—'}</p>
        </div>
      ),
      value: (order) => `${order.user?.name ?? ''} ${order.user?.phone ?? ''}`.trim(),
    },
    {
      key: 'module',
      label: 'Module',
      render: (order) => <ModuleBadge module={order.module} />,
      value: (order) => order.module,
    },
    {
      key: 'items',
      label: 'Items',
      align: 'right',
      hideOnMobile: true,
      render: (order) => <span className="tabular">{order.items.reduce((sum, i) => sum + i.qty, 0)}</span>,
      value: (order) => order.items.reduce((sum, i) => sum + i.qty, 0),
    },
    {
      key: 'payBy',
      label: 'Payment',
      hideOnMobile: true,
      render: (order) => <Badge tone={order.payBy === 'wallet' ? 'brand' : 'neutral'}>{titleCase(order.payBy)}</Badge>,
      value: (order) => order.payBy,
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (order) => <span className="font-semibold text-ink-900">{money(order.total)}</span>,
      value: (order) => order.total,
    },
    {
      key: 'status',
      label: 'Status',
      render: (order) => <StatusBadge status={order.status} />,
      value: (order) => ORDER_STATUS_LABEL[order.status],
    },
    {
      key: 'placedAt',
      label: 'Placed',
      hideOnMobile: true,
      render: (order) => <span className="text-[12.5px] text-ink-500">{dateTime(order.placedAt)}</span>,
      value: (order) => order.placedAt,
    },
  ];

  const exportCsv = () => {
    const cols = columns.map((c) => ({ key: c.key, label: c.label }));
    const flat = rows.map((order) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) record[column.key] = column.value ? column.value(order) : '';
      return record;
    });
    downloadCsv(`aurasure-orders-${status}-${new Date().toISOString().slice(0, 10)}`, toCsv(flat, cols));
    logActivity({ actor: user?.name ?? 'admin', action: 'Exported orders CSV', target: `${flat.length} rows` });
    toast.info(`Exported ${flat.length} rows`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Order management"
        subtitle="Search, filter and move orders through the fulfilment flow."
        actions={
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Tabs
            items={STATUS_TABS}
            active={status}
            onChange={(key) => {
              setStatus(key);
              setPage(1);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search code, customer, phone or address…"
              className="flex-1"
            />
            <Select
              value={module}
              onChange={(event) => {
                setModule(event.target.value);
                setPage(1);
              }}
              className="sm:w-44"
              aria-label="Filter by module"
            >
              <option value="">All modules</option>
              <option value="food">Food</option>
              <option value="shop">Shop</option>
            </Select>
          </div>
        </div>

        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(order) => order.id}
              loading={isLoading}
              refreshing={isFetching && !isLoading}
              emptyTitle="No orders found"
              emptyMessage="Try a different status, module or search term."
              onRowClick={(order) => router.push(`/orders/${order.id}`)}
              actions={(order) => {
                const next = nextStatus(order.status);
                const isLive = !['delivered', 'cancelled'].includes(order.status);
                return (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye size={15} />}
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      View
                    </Button>
                    {next ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ChevronRight size={15} />}
                        loading={statusMutation.isPending && statusMutation.variables?.id === order.id}
                        onClick={() => advance(order)}
                      >
                        {ORDER_STATUS_LABEL[next as OrderStatus]}
                      </Button>
                    ) : null}
                    {isLive && ['placed', 'confirmed'].includes(order.status) ? (
                      <Button size="sm" variant="ghost" icon={<Ban size={15} />} onClick={() => setCancelling(order)}>
                        Cancel
                      </Button>
                    ) : null}
                  </>
                );
              }}
            />
          )}
        </div>

        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={`Cancel ${cancelling?.code ?? ''}?`}
        message={
          <>
            The order is cancelled immediately. Any wallet money is refunded, loyalty points earned on it are
            reversed and a redeemed coupon is restored to the customer.
          </>
        }
        confirmLabel="Cancel order"
        loading={statusMutation.isPending}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}

/** `useSearchParams` needs a Suspense boundary during prerender. */
export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 w-full rounded-[var(--radius-card)]" />}>
      <OrdersPageInner />
    </Suspense>
  );
}
