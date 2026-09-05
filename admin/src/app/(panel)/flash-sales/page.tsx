'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell } from '@/components/resource/cells';
import { Badge, ModuleBadge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import type { CatalogRecord } from '@/lib/types';

function liveState(row: CatalogRecord): 'live' | 'scheduled' | 'ended' | 'hidden' {
  if (!row.active) return 'hidden';
  const now = Date.now();
  const start = new Date(String(row.startsAt)).getTime();
  const end = new Date(String(row.endsAt)).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'scheduled';
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'live';
}

const STATE_TONE = { live: 'success', scheduled: 'warning', ended: 'neutral', hidden: 'neutral' } as const;

const columns: Column<CatalogRecord>[] = [
  {
    key: 'title',
    label: 'Sale',
    primary: true,
    render: (row) => <NameCell name={row.title} meta={String(row.subtitle || row.id)} />,
    value: (row) => String(row.title ?? ''),
  },
  {
    key: 'module',
    label: 'Module',
    render: (row) => <ModuleBadge module={String(row.module ?? 'food')} />,
    value: (row) => String(row.module ?? ''),
  },
  {
    key: 'window',
    label: 'Window',
    hideOnMobile: true,
    render: (row) => (
      <span className="text-[12.5px] text-ink-500 tabular">
        {row.startsAt ? new Date(String(row.startsAt)).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
        {' → '}
        {row.endsAt ? new Date(String(row.endsAt)).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
      </span>
    ),
    value: (row) => String(row.startsAt ?? ''),
  },
  {
    key: 'items',
    label: 'Items',
    align: 'right',
    hideOnMobile: true,
    render: (row) => <span className="tabular">{Array.isArray(row.itemIds) ? row.itemIds.length : 0}</span>,
    value: (row) => (Array.isArray(row.itemIds) ? row.itemIds.length : 0),
  },
  {
    key: 'state',
    label: 'State',
    render: (row) => {
      const state = liveState(row);
      return (
        <Badge tone={STATE_TONE[state]} dot={state === 'live'}>
          {state === 'live' ? 'Live now' : state[0].toUpperCase() + state.slice(1)}
        </Badge>
      );
    },
    value: (row) => liveState(row),
  },
];

const fields: FieldDef[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Flash cravings' },
  { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'Up to 40% OFF · ends tonight' },
  {
    name: 'module',
    label: 'Module',
    type: 'select',
    required: true,
    options: [
      { value: 'food', label: 'Food (dish ids like f12)' },
      { value: 'shop', label: 'Shop (product ids like p10)' },
    ],
    defaultValue: 'food',
  },
  { name: 'badge', label: 'Badge text', type: 'text', placeholder: 'FLASH' },
  { name: 'startsAt', label: 'Starts at', type: 'datetime', required: true },
  { name: 'endsAt', label: 'Ends at', type: 'datetime', required: true },
  {
    name: 'itemIds',
    label: 'Item ids',
    type: 'tags',
    full: true,
    placeholder: 'f1, f5, f17, f21',
    hint: 'Comma-separated catalogue ids in display order. The app keeps this order for equal discounts.',
  },
  { name: 'active', label: 'Enabled', type: 'toggle', defaultValue: true },
];

export default function FlashSalesPage() {
  return (
    <ResourcePage
      title="Flash sales"
      subtitle="Time-boxed sale events — one live event per module, with a countdown in the app."
      path="flash-sales"
      responseKey="sales"
      singular="Sale"
      searchPlaceholder="Search sales…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'status',
          label: 'Any state',
          options: [{ value: 'live', label: 'Live now' }],
        },
        {
          key: 'module',
          label: 'All modules',
          options: [
            { value: 'food', label: 'Food' },
            { value: 'shop', label: 'Shop' },
          ],
        },
      ]}
    />
  );
}
