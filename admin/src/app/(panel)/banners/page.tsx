'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell } from '@/components/resource/cells';
import { Badge, ModuleBadge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import type { CatalogRecord } from '@/lib/types';

const columns: Column<CatalogRecord>[] = [
  {
    key: 'title',
    label: 'Banner',
    primary: true,
    render: (row) => <NameCell image={row.image} name={row.title} meta={String(row.subtitle ?? row.id)} />,
    value: (row) => String(row.title ?? ''),
  },
  {
    key: 'module',
    label: 'Module',
    render: (row) => <ModuleBadge module={String(row.module ?? 'food')} />,
    value: (row) => String(row.module ?? ''),
  },
  {
    key: 'badge',
    label: 'Badge',
    hideOnMobile: true,
    render: (row) => (row.badge ? <Badge tone="warning">{String(row.badge)}</Badge> : <span className="text-ink-300">—</span>),
    value: (row) => String(row.badge ?? ''),
  },
  {
    key: 'active',
    label: 'Visibility',
    render: (row) => <Badge tone={row.active ? 'success' : 'neutral'}>{row.active ? 'Live' : 'Hidden'}</Badge>,
    value: (row) => (row.active ? 'live' : 'hidden'),
  },
  {
    key: 'sortOrder',
    label: 'Sort order',
    align: 'right',
    hideOnMobile: true,
    render: (row) => <span className="tabular">{Number(row.sortOrder ?? 0)}</span>,
    value: (row) => Number(row.sortOrder ?? 0),
  },
];

const fields: FieldDef[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Flat ₹100 off this weekend' },
  { name: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'On orders above ₹399' },
  {
    name: 'module',
    label: 'Module',
    type: 'select',
    required: true,
    options: [
      { value: 'food', label: 'Food' },
      { value: 'shop', label: 'Shop' },
    ],
    defaultValue: 'food',
  },
  { name: 'badge', label: 'Badge text', type: 'text', placeholder: 'LIMITED' },
  { name: 'image', label: 'Image URL', type: 'image' },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
  { name: 'active', label: 'Visible in app', type: 'toggle', defaultValue: true },
];

export default function BannersPage() {
  return (
    <ResourcePage
      title="Banners"
      subtitle="Promotional cards on the Food and Shop home screens."
      path="banners"
      responseKey="banners"
      singular="Banner"
      searchPlaceholder="Search banners…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'module',
          label: 'All modules',
          options: [
            { value: 'food', label: 'Food' },
            { value: 'shop', label: 'Shop' },
          ],
        },
        {
          key: 'active',
          label: 'Any visibility',
          options: [
            { value: 'true', label: 'Live' },
            { value: 'false', label: 'Hidden' },
          ],
        },
      ]}
    />
  );
}
