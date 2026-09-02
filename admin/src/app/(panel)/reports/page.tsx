'use client';

import { useState } from 'react';
import { Download, TrendingUp, ShoppingBag, XCircle, Percent } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { ChartSkeleton, StatSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/EmptyState';
import { RevenueChart, OrdersBarChart, SplitDonut } from '@/components/charts/Charts';
import { useReport } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { downloadCsv, toCsv } from '@/lib/csv';
import { money, moneyShort, num, titleCase, shortDate } from '@/lib/format';

const RANGES = [
  { key: '7', label: 'Last 7 days' },
  { key: '14', label: 'Last 14 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [range, setRange] = useState('14');
  const { data, isLoading, isError, error, refetch } = useReport(Number(range));

  const totals = data
    ? data.series.reduce(
        (acc, row) => ({
          revenue: acc.revenue + row.revenue,
          orders: acc.orders + row.orders,
          cancelled: acc.cancelled + row.cancelled,
        }),
        { revenue: 0, orders: 0, cancelled: 0 },
      )
    : { revenue: 0, orders: 0, cancelled: 0 };

  const aov = totals.orders ? totals.revenue / totals.orders : 0;

  const exportSeries = () => {
    if (!data) return;
    const csv = toCsv(data.series as unknown as Record<string, unknown>[], [
      { key: 'date', label: 'Date' },
      { key: 'orders', label: 'Orders' },
      { key: 'cancelled', label: 'Cancelled' },
      { key: 'revenue', label: 'Revenue' },
    ]);
    downloadCsv(`aurasure-report-${range}d`, csv);
    toast.info('Report exported');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & analytics"
        subtitle="Revenue, order volume and what customers are actually buying."
        actions={
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportSeries} disabled={!data}>
            Export daily CSV
          </Button>
        }
      />

      <Tabs items={RANGES} active={range} onChange={setRange} />

      {isError ? (
        <Card padded={false}>
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        </Card>
      ) : null}

      {isLoading ? (
        <StatSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label={`Revenue · ${range} days`} value={moneyShort(totals.revenue)} icon={TrendingUp} tone="success" />
          <StatCard label="Orders" value={num(totals.orders)} icon={ShoppingBag} tone="brand" />
          <StatCard label="Cancelled" value={num(totals.cancelled)} icon={XCircle} tone="danger" />
          <StatCard label="Average order value" value={moneyShort(aov)} icon={Percent} tone="info" />
        </div>
      )}

      <Card>
        <CardHeader title="Revenue trend" subtitle={`Daily revenue over the last ${range} days`} />
        <div className="mt-4">
          {isLoading ? <ChartSkeleton /> : data ? <RevenueChart data={data.series} height={300} /> : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Order volume" subtitle="Placed vs cancelled per day" />
        <div className="mt-4">{isLoading ? <ChartSkeleton /> : data ? <OrdersBarChart data={data.series} /> : null}</div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Revenue by module" subtitle="Food vs Shop" />
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : data ? (
            <SplitDonut
              height={230}
              valueKey="revenue"
              data={data.byModule.map((row) => ({ ...row, key: titleCase(row.key) }))}
            />
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Payment methods" subtitle="How customers paid" />
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : data ? (
            <SplitDonut height={230} data={data.byPayment.map((row) => ({ ...row, key: titleCase(row.key) }))} />
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Order status" subtitle="All orders by state" />
          {isLoading ? (
            <ChartSkeleton height={220} />
          ) : data ? (
            <SplitDonut height={230} data={data.byStatus.map((row) => ({ ...row, key: titleCase(row.key) }))} />
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <CardSkeleton lines={8} />
        ) : (
          <Card padded={false}>
            <div className="p-4 sm:p-5">
              <CardHeader title="Top selling items" subtitle="By quantity sold, all time" />
            </div>
            <ol className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {(data?.topItems ?? []).map((item, index) => (
                <li key={`${item.refId}-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[12px] font-semibold text-ink-600 tabular">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{item.name}</p>
                    <p className="text-[12px] text-ink-400">{item.kind === 'food' ? 'Food' : 'Shop'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-ink-900 tabular">{num(item.qty)} sold</p>
                    <p className="text-[12px] text-ink-400 tabular">{money(item.revenue)}</p>
                  </div>
                </li>
              ))}
              {data && data.topItems.length === 0 ? (
                <li className="px-5 py-10 text-center text-[13px] text-ink-400">No sales recorded yet.</li>
              ) : null}
            </ol>
          </Card>
        )}

        {isLoading ? (
          <CardSkeleton lines={8} />
        ) : (
          <Card padded={false}>
            <div className="p-4 sm:p-5">
              <CardHeader title="Top customers" subtitle="By lifetime spend" />
            </div>
            <ol className="divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
              {(data?.topCustomers ?? []).map((customer, index) => (
                <li key={customer.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[12px] font-semibold text-ink-600 tabular">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{customer.name}</p>
                    <p className="text-[12px] text-ink-400 tabular">{customer.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{num(customer.orders)} orders</Badge>
                    <span className="text-[13px] font-semibold text-ink-900 tabular">{money(customer.spent)}</span>
                  </div>
                </li>
              ))}
              {data && data.topCustomers.length === 0 ? (
                <li className="px-5 py-10 text-center text-[13px] text-ink-400">No customer spend yet.</li>
              ) : null}
            </ol>
          </Card>
        )}
      </div>

      {data ? (
        <Card padded={false}>
          <div className="p-4 sm:p-5">
            <CardHeader title="Daily breakdown" subtitle={`Raw numbers for the last ${range} days`} />
          </div>
          <div className="scroll-thin overflow-x-auto border-t border-[var(--color-line)]">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left">
                  {['Date', 'Orders', 'Cancelled', 'Revenue'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2.5 text-[11.5px] font-semibold tracking-wide text-ink-500 uppercase last:text-right"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {[...data.series].reverse().map((row) => (
                  <tr key={row.date} className="hover:bg-ink-50">
                    <td className="px-4 py-2.5 text-ink-700">{shortDate(row.date)}</td>
                    <td className="px-4 py-2.5 text-ink-700 tabular">{row.orders}</td>
                    <td className="px-4 py-2.5 text-ink-700 tabular">{row.cancelled}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink-900 tabular">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
