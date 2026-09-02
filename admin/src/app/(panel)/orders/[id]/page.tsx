'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Wallet,
  Ticket,
  Sparkles,
  Ban,
  ChevronRight,
  Clock,
  StickyNote,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, ModuleBadge, StatusBadge } from '@/components/ui/Badge';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useOrder, useOrderStatusMutation } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { money, dateTime, timeAgo, nextStatus, ORDER_FLOW, ORDER_STATUS_LABEL, titleCase, imageSrc } from '@/lib/format';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOrder(id);
  const mutation = useOrderStatusMutation();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const order = data?.order;

  const move = async (status: string, label: string) => {
    if (!order) return;
    try {
      await mutation.mutateAsync({ id: order.id, status });
      logActivity({ actor: user?.name ?? 'admin', action: `Order → ${label}`, target: order.code });
      toast.success(`${order.code} → ${label}`);
      setConfirmCancel(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={6} />
          </div>
          <CardSkeleton lines={7} />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <Card padded={false}>
        <ErrorState message={(error as Error)?.message ?? 'Order not found'} onRetry={() => refetch()} />
      </Card>
    );
  }

  const next = nextStatus(order.status);
  const cancellable = ['placed', 'confirmed'].includes(order.status);
  const currentStep = ORDER_FLOW.indexOf(order.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to orders" onClick={() => router.push('/orders')}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-lg font-semibold tracking-[-0.01em] text-ink-900">{order.code}</h1>
              <StatusBadge status={order.status} />
              <ModuleBadge module={order.module} />
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              Placed {dateTime(order.placedAt)} · {timeAgo(order.placedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cancellable ? (
            <Button variant="secondary" icon={<Ban size={16} />} onClick={() => setConfirmCancel(true)}>
              Cancel & refund
            </Button>
          ) : null}
          {next ? (
            <Button
              icon={<ChevronRight size={16} />}
              loading={mutation.isPending}
              onClick={() => move(next, ORDER_STATUS_LABEL[next])}
            >
              Move to {ORDER_STATUS_LABEL[next]}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Fulfilment timeline */}
      <Card>
        <CardHeader
          title="Fulfilment"
          subtitle={
            order.status === 'cancelled'
              ? 'This order was cancelled — the customer was refunded automatically.'
              : 'Orders only ever move forward through this flow.'
          }
        />
        {order.status === 'cancelled' ? (
          <div className="mt-4 rounded-lg bg-[var(--color-danger-soft)] px-4 py-3 text-[13px] text-[var(--color-danger)]">
            Cancelled. Wallet money refunded, loyalty reversed and any coupon restored.
          </div>
        ) : (
          <ol className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
            {ORDER_FLOW.map((step, index) => {
              const done = index <= currentStep;
              const active = index === currentStep;
              return (
                <li key={step} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-stretch">
                  <div className="flex items-center gap-2 sm:w-full">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                        done ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={`hidden h-[3px] flex-1 rounded-full sm:block ${done ? 'bg-brand-600' : 'bg-ink-100'}`} />
                  </div>
                  <div className="sm:mt-2">
                    <p className={`text-[13.5px] font-medium ${done ? 'text-ink-900' : 'text-ink-400'}`}>
                      {ORDER_STATUS_LABEL[step]}
                    </p>
                    {active ? <p className="text-[12px] text-brand-600">Current stage</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card padded={false}>
            <div className="p-4 sm:p-5">
              <CardHeader title={`Items (${order.items.length})`} subtitle="What the customer ordered" />
            </div>
            <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {order.items.map((item) => {
                const src = imageSrc(item.image);
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 text-[11px] text-ink-400">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      ) : (
                        item.kind === 'food' ? 'Food' : 'Shop'
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink-900">{item.name}</p>
                      <p className="truncate text-[12px] text-ink-500">
                        {item.meta ? `${item.meta} · ` : ''}
                        {money(item.unitPrice)} × {item.qty}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-semibold text-ink-900 tabular">
                      {money(item.unitPrice * item.qty)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-2 border-t border-[var(--color-line)] px-4 py-4 text-[13.5px] sm:px-5">
              <div className="flex justify-between text-ink-600">
                <dt>Item total</dt>
                <dd className="tabular">{money(order.itemTotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-600">
                <dt>Delivery fee</dt>
                <dd className="tabular">{money(order.deliveryFee)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-[var(--color-success)]">
                  <dt>Discount {order.couponCode ? `(${order.couponCode})` : ''}</dt>
                  <dd className="tabular">− {money(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[var(--color-line)] pt-2.5 text-[15px] font-semibold text-ink-900">
                <dt>Total</dt>
                <dd className="tabular">{money(order.total)}</dd>
              </div>
            </dl>
          </Card>

          {order.instructions ? (
            <Card>
              <CardHeader title="Customer instruction" />
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-ink-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-ink-700">
                <StickyNote size={16} className="mt-0.5 shrink-0 text-ink-400" />
                {order.instructions}
              </p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" />
            <div className="mt-3 space-y-2.5 text-[13.5px]">
              <p className="flex items-center gap-2 text-ink-800">
                <UserIcon size={15} className="text-ink-400" />
                {order.user?.name ?? 'Deleted user'}
              </p>
              <p className="flex items-center gap-2 text-ink-700">
                <Phone size={15} className="text-ink-400" />
                <a href={`tel:${order.user?.phone ?? ''}`} className="hover:text-brand-600">
                  {order.user?.phone ?? '—'}
                </a>
              </p>
              <p className="flex items-start gap-2 text-ink-700">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-400" />
                <span className="leading-relaxed">{order.address}</span>
              </p>
              {order.user?.id ? (
                <Link
                  href={`/customers/${order.user.id}`}
                  className="inline-flex items-center gap-1 pt-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Open customer profile <ChevronRight size={14} />
                </Link>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment & rewards" />
            <dl className="mt-3 space-y-2.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Method</dt>
                <dd>
                  <Badge tone={order.payBy === 'wallet' ? 'brand' : 'neutral'}>{titleCase(order.payBy)}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-ink-500">
                  <Wallet size={14} /> Wallet paid
                </dt>
                <dd className="tabular text-ink-800">{money(order.walletPaid)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-ink-500">
                  <Sparkles size={14} /> Loyalty earned
                </dt>
                <dd className="tabular text-ink-800">{order.loyaltyEarned} pts</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-ink-500">
                  <Ticket size={14} /> Coupon
                </dt>
                <dd className="text-ink-800">{order.couponCode ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-ink-500">
                  <Clock size={14} /> ETA
                </dt>
                <dd className="tabular text-ink-800">{order.etaMinutes ? `${order.etaMinutes} min` : '—'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel ${order.code}?`}
        message="Wallet money is refunded, loyalty points reversed and the coupon restored. This cannot be undone."
        confirmLabel="Cancel order"
        loading={mutation.isPending}
        onConfirm={() => move('cancelled', 'Cancelled')}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
