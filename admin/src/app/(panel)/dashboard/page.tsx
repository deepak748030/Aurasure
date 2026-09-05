'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  IndianRupee,
  Users,
  Radio,
  Store,
  UtensilsCrossed,
  Boxes,
  UserCheck,
  Wallet,
  XCircle,
  ArrowRight,
  Image as ImageIcon,
  LayoutList,
  MessageSquareText,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { StatSkeleton, CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { StatusBadge, ModuleBadge, Badge } from '@/components/ui/Badge';
import { RevenueChart, SplitDonut } from '@/components/charts/Charts';
import { useOrders, useReport, useStats } from '@/lib/queries';
import { money, moneyShort, num, timeAgo, titleCase } from '@/lib/format';

export default function DashboardPage() {
  const router = useRouter();
  const stats = useStats();
  const report = useReport(14);
  const recent = useOrders({ limit: 8, page: 1 }, { refetchInterval: 30000 });

  const s = stats.data;
  const live = recent.data?.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Live snapshot of orders, revenue and the Aurasure catalogue."
        actions={
          <Link
            href="/live-ops"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Radio size={16} />
            Open Live Ops
          </Link>
        }
      />

      {/* KPI row */}
      {stats.isLoading ? (
        <StatSkeleton count={4} />
      ) : stats.isError ? (
        <Card padded={false}>
          <ErrorState message={(stats.error as Error).message} onRetry={() => stats.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total revenue"
              value={moneyShort(s?.revenue)}
              hint={`${num(s?.orders)} orders placed`}
              icon={IndianRupee}
              tone="success"
              onClick={() => router.push('/reports')}
            />
            <StatCard
              label="Live orders"
              value={num(s?.liveOrders)}
              hint="Waiting on fulfilment"
              icon={Radio}
              tone="warning"
              onClick={() => router.push('/live-ops')}
            />
            <StatCard
              label="Customers"
              value={num(s?.users)}
              hint="Registered accounts"
              icon={Users}
              tone="brand"
              onClick={() => router.push('/customers')}
            />
            <StatCard
              label="Vendor KYC queue"
              value={num(s?.pendingVendors)}
              hint="Documents waiting verification"
              icon={UserCheck}
              tone="info"
              onClick={() => router.push('/vendors')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Wallet collected" value={moneyShort(s?.walletCollected)} icon={Wallet} tone="neutral" />
            <StatCard
              label="Open support tickets"
              value={num(s?.openTickets)}
              hint="Waiting on a reply"
              icon={MessageSquareText}
              tone="danger"
              onClick={() => router.push('/support')}
            />
            <StatCard label="Cancelled orders" value={num(s?.cancelledOrders)} icon={XCircle} tone="danger" />
            <StatCard
              label="Restaurants"
              value={num(s?.restaurants)}
              hint={`${num(s?.foodItems)} food items`}
              icon={UtensilsCrossed}
              tone="food"
              onClick={() => router.push('/food/restaurants')}
            />
            <StatCard
              label="Shop stores"
              value={num(s?.shops)}
              hint={`${num(s?.products)} products`}
              icon={Store}
              tone="brand"
              onClick={() => router.push('/shop/stores')}
            />
          </div>
        </>
      )}

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue · last 14 days"
            subtitle="Cancelled orders are excluded from revenue."
            action={
              report.data ? (
                <Badge tone="brand">{moneyShort(report.data.series.reduce((sum, r) => sum + r.revenue, 0))}</Badge>
              ) : null
            }
          />
          <div className="mt-4">
            {report.isLoading ? <ChartSkeleton /> : report.data ? <RevenueChart data={report.data.series} /> : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Orders by module" subtitle="Food vs Shop, all time" />
          <div className="mt-2">
            {report.isLoading ? (
              <ChartSkeleton height={240} />
            ) : report.data ? (
              <SplitDonut data={report.data.byModule.map((r) => ({ ...r, key: titleCase(r.key) }))} />
            ) : null}
          </div>
        </Card>
      </div>

      {/* Live queue + status split */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="p-4 sm:p-5">
            <CardHeader
              title="Recent orders"
              subtitle="Newest first, refreshed every 30 seconds."
              action={
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
                >
                  View all <ArrowRight size={14} />
                </Link>
              }
            />
          </div>
          {recent.isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <ul className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {recent.data?.orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-ink-50 sm:px-5"
                  >
                    <span className="w-full font-mono text-[12.5px] font-medium text-ink-800 sm:w-auto">
                      {order.code}
                    </span>
                    <ModuleBadge module={order.module} />
                    <StatusBadge status={order.status} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-600">
                      {order.user?.name ?? 'Deleted user'} · {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[13px] font-semibold text-ink-900 tabular">{money(order.total)}</span>
                    <span className="w-20 shrink-0 text-right text-[12px] text-ink-400">{timeAgo(order.placedAt)}</span>
                  </Link>
                </li>
              ))}
              {recent.data && recent.data.orders.length === 0 ? (
                <li className="px-5 py-10 text-center text-[13px] text-ink-400">No orders yet.</li>
              ) : null}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Order status split" subtitle="All orders by state" />
            <div className="mt-2">
              {report.isLoading ? (
                <ChartSkeleton height={220} />
              ) : report.data ? (
                <SplitDonut
                  height={220}
                  data={report.data.byStatus.map((r) => ({ key: titleCase(r.key), orders: r.orders }))}
                />
              ) : null}
            </div>
          </Card>

          {stats.isLoading ? (
            <CardSkeleton lines={4} />
          ) : (
            <Card>
              <CardHeader title="Catalogue" subtitle="What customers can browse right now" />
              <ul className="mt-3 space-y-2.5 text-[13.5px]">
                {[
                  { icon: LayoutList, label: 'Food categories', value: s?.foodCategories, href: '/food/categories' },
                  { icon: UtensilsCrossed, label: 'Food items', value: s?.foodItems, href: '/food/items' },
                  { icon: Boxes, label: 'Shop products', value: s?.products, href: '/shop/products' },
                  { icon: ImageIcon, label: 'Active banners', value: s?.banners, href: '/banners' },
                ].map((row) => (
                  <li key={row.label}>
                    <Link
                      href={row.href}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-ink-700 transition-colors hover:bg-ink-50"
                    >
                      <row.icon size={16} className="text-ink-400" />
                      <span className="flex-1 truncate">{row.label}</span>
                      <span className="font-semibold text-ink-900 tabular">{num(row.value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {live.length > 0 ? (
        <Card>
          <CardHeader
            title="Needs attention"
            subtitle={`${live.length} order${live.length === 1 ? '' : 's'} in the fulfilment queue`}
            action={
              <Link href="/live-ops" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                Open board
              </Link>
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {live.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-[12.5px] text-ink-700 transition-colors hover:bg-ink-100"
              >
                <ShoppingBag size={14} className="text-ink-400" />
                <span className="font-mono font-medium">{order.code}</span>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
