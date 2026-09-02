'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Ban, RefreshCw, Timer } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge, ModuleBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Input';
import { useOrders, useOrderStatusMutation } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { money, minutesSince, nextStatus, ORDER_STATUS_LABEL } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

/** Live board columns + the age (minutes) after which a card turns urgent. */
const COLUMNS: { status: OrderStatus; label: string; sla: number }[] = [
  { status: 'placed', label: 'New · waiting on vendor', sla: 2 },
  { status: 'confirmed', label: 'Accepted', sla: 10 },
  { status: 'preparing', label: 'Preparing', sla: 25 },
  { status: 'out_for_delivery', label: 'On the way', sla: 45 },
];

export default function LiveOpsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [auto, setAuto] = useState(true);
  const [cancelling, setCancelling] = useState<Order | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useOrders(
    { limit: 100, page: 1 },
    { refetchInterval: auto ? 15000 : undefined },
  );
  const mutation = useOrderStatusMutation();

  const board = useMemo(() => {
    const orders = data?.orders ?? [];
    return COLUMNS.map((column) => ({
      ...column,
      orders: orders.filter((order) => order.status === column.status),
    }));
  }, [data]);

  const attention = useMemo(
    () =>
      board.flatMap((column) =>
        column.orders.filter((order) => minutesSince(order.placedAt) > column.sla * 3),
      ),
    [board],
  );

  const advance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    try {
      await mutation.mutateAsync({ id: order.id, status: next });
      logActivity({ actor: user?.name ?? 'admin', action: `Order → ${ORDER_STATUS_LABEL[next]}`, target: order.code });
      toast.success(`${order.code} → ${ORDER_STATUS_LABEL[next]}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const cancel = async () => {
    if (!cancelling) return;
    try {
      await mutation.mutateAsync({ id: cancelling.id, status: 'cancelled' });
      logActivity({ actor: user?.name ?? 'admin', action: 'Order cancelled + refunded', target: cancelling.code });
      toast.success(`${cancelling.code} cancelled and refunded`);
      setCancelling(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const total = board.reduce((sum, column) => sum + column.orders.length, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Ops board"
        subtitle="Every order still in the fulfilment queue, oldest first inside each lane."
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[13px] text-ink-600">
              <Toggle checked={auto} onChange={setAuto} label="Auto refresh" />
              Auto refresh
            </label>
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} className={isFetching ? 'spin' : undefined} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {isError ? (
        <Card padded={false}>
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        </Card>
      ) : null}

      {attention.length > 0 ? (
        <Card className="border-l-[3px] border-l-[var(--color-warning)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-warning)]" />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink-900">
                {attention.length} order{attention.length === 1 ? '' : 's'} past the expected time
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {attention.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="rounded-lg bg-[var(--color-warning-soft)] px-2.5 py-1 font-mono text-[12px] font-medium text-[var(--color-warning)]"
                  >
                    {order.code} · {minutesSince(order.placedAt)}m
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.status} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-card)]" />
              ))}
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="Queue is clear"
            message="No live orders right now. New orders appear here automatically."
            icon={<Timer size={22} />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {board.map((column) => (
            <section key={column.status} className="flex min-w-0 flex-col">
              <header className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="truncate text-[13px] font-semibold text-ink-700">{column.label}</h2>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600 tabular">
                  {column.orders.length}
                </span>
              </header>

              <div className="space-y-2.5">
                {column.orders.length === 0 ? (
                  <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] px-3 py-6 text-center text-[12.5px] text-ink-400">
                    Empty lane
                  </p>
                ) : null}

                {column.orders.map((order) => {
                  const age = minutesSince(order.placedAt);
                  const late = age > column.sla * 3;
                  const next = nextStatus(order.status);
                  return (
                    <article
                      key={order.id}
                      className={`rounded-[var(--radius-card)] bg-white p-3.5 shadow-[var(--shadow-card)] ring-1 ${
                        late ? 'ring-[var(--color-warning)]' : 'ring-[var(--color-line)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono text-[12.5px] font-semibold text-ink-900 hover:text-brand-600"
                        >
                          {order.code}
                        </Link>
                        <Badge tone={late ? 'warning' : 'neutral'}>{age}m</Badge>
                      </div>

                      <p className="mt-1.5 truncate text-[13px] text-ink-700">{order.user?.name ?? 'Deleted user'}</p>
                      <p className="truncate text-[12px] text-ink-400">{order.address}</p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <ModuleBadge module={order.module} />
                        <span className="text-[13px] font-semibold text-ink-900 tabular">{money(order.total)}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {next ? (
                          <Button
                            size="sm"
                            className="flex-1 justify-center"
                            icon={<ChevronRight size={14} />}
                            loading={mutation.isPending && mutation.variables?.id === order.id}
                            onClick={() => advance(order)}
                          >
                            {ORDER_STATUS_LABEL[next]}
                          </Button>
                        ) : null}
                        {['placed', 'confirmed'].includes(order.status) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label="Cancel order"
                            onClick={() => setCancelling(order)}
                          >
                            <Ban size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={`Cancel ${cancelling?.code ?? ''}?`}
        message="Wallet money is refunded, loyalty reversed and the coupon restored."
        confirmLabel="Cancel order"
        loading={mutation.isPending}
        onConfirm={cancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
