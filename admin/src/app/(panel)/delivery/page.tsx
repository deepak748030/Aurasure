'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bike, RefreshCw, Route } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useAssignableRiders, useAssignDelivery, useDeliveryTasks } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { money } from '@/lib/format';
import type { DeliveryTaskRow } from '@/lib/types';

const STATE_TABS = [
  { key: 'available', label: 'Available' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'all', label: 'All' },
];

const STATE_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  available: 'info',
  accepted: 'warning',
  at_pickup: 'warning',
  picked_up: 'brand',
  at_drop: 'brand',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'danger',
};

export default function DeliveryPage() {
  const toast = useToast();
  const [tab, setTab] = useState('available');
  const [assigning, setAssigning] = useState<DeliveryTaskRow | null>(null);
  const [selectedRider, setSelectedRider] = useState('');

  const { data, isLoading, isError, error, refetch, isFetching } = useDeliveryTasks({ limit: 100 }, 30000);
  const riders = useAssignableRiders();
  const assign = useAssignDelivery();

  const tasks = data?.tasks ?? [];
  const rows = useMemo(() => (tab === 'all' ? tasks : tasks.filter((t) => t.state === tab)), [tasks, tab]);

  const openAssign = (task: DeliveryTaskRow) => {
    setAssigning(task);
    setSelectedRider('');
  };

  const runAssign = async () => {
    if (!assigning || !selectedRider) return;
    try {
      await assign.assignTask.mutateAsync({ id: assigning.id, riderId: selectedRider });
      toast.success(`Assigned ${assigning.orderCode} to a delivery partner`);
      setAssigning(null);
      setSelectedRider('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Delivery tasks"
        subtitle="Track every dispatch published when an order goes out for delivery, and manually assign a rider when needed."
        actions={
          <>
            <Badge tone="info" dot>{tasks.length} tasks</Badge>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void refetch()} disabled={isFetching}>
              Refresh
            </Button>
          </>
        }
      />

      <Card padded={false}>
        <div className="p-4 sm:p-5">
          <Tabs items={STATE_TABS} active={tab} onChange={setTab} />
        </div>
        <div className="border-t border-[var(--color-line)]">
          {isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={tab === 'all' ? 'No delivery tasks yet' : `No ${tab} deliveries`}
              message="Tasks are created automatically when an order is moved to out_for_delivery."
              icon={<Route size={22} />}
            />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {rows.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Bike size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/orders/${task.orderCode}`} className="font-mono text-[13px] font-medium text-brand-700 hover:underline">
                        {task.orderCode}
                      </Link>
                      <Badge tone={STATE_TONE[task.state] ?? 'neutral'}>{task.state.replaceAll('_', ' ')}</Badge>
                      <Badge tone={task.module === 'food' ? 'food' : 'brand'}>{task.module}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
                      {task.vendorName} → {task.drop?.name || 'Customer'} · {task.drop?.address || '—'}
                    </p>
                    <p className="text-[12px] text-ink-400">
                      {task.riderId ? `Rider: ${task.riderName || task.riderPhone}` : 'No rider yet'} · COD ₹{Math.round(task.codAmount || 0)} · Payout ₹{Math.round(task.riderPayout)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink-800">{money(task.total || 0)}</span>
                    {task.state === 'available' ? (
                      <Button size="sm" variant="secondary" onClick={() => openAssign(task)}>
                        Assign rider
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title="Assign a delivery partner"
        subtitle={assigning ? `${assigning.orderCode} · ₹${Math.round(assigning.codAmount)} COD` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button loading={assign.assignTask.isPending} onClick={() => void runAssign()} disabled={!selectedRider}>
              Assign
            </Button>
          </>
        }
      >
        {riders.isLoading ? (
          <p className="py-8 text-center text-[13px] text-ink-500">Loading online riders…</p>
        ) : !riders.data?.riders.length ? (
          <EmptyState title="No rider available" message="Make sure a delivery partner is approved, online and below their COD limit." icon={<Bike size={20} />} />
        ) : (
          <ul className="space-y-2">
            {riders.data.riders.map((rider) => (
              <li
                key={rider.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRider(rider.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRider(rider.id); }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  selectedRider === rider.id ? 'border-brand-300 bg-brand-50' : 'border-[var(--color-line)] hover:bg-ink-50'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[13px] font-semibold text-ink-700">
                  {rider.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink-900">{rider.name}</p>
                  <p className="text-[12px] text-ink-500">{rider.phone} · {rider.vehicleType.toUpperCase()} {rider.vehicleNumber}</p>
                  <p className="text-[12px] text-ink-400">
                    {rider.dutyState} · COD in hand ₹{Math.round(rider.codInHand)}/{Math.round(rider.maxCodLimit)} · {rider.currentDayTrips} trips today
                  </p>
                </div>
                {rider.activeTask ? <Badge tone="warning">On task</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
