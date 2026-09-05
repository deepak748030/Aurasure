'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell } from '@/components/resource/cells';
import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import type { CatalogRecord } from '@/lib/types';

const columns: Column<CatalogRecord>[] = [
  {
    key: 'name',
    label: 'Brand',
    primary: true,
    render: (row) => <NameCell image={row.image} name={row.name} meta={String(row.tagline || row.id)} />,
    value: (row) => String(row.name ?? ''),
  },
  {
    key: 'featured',
    label: 'Featured',
    render: (row) => (row.featured ? <Badge tone="brand">Featured</Badge> : <span className="text-ink-300">—</span>),
    value: (row) => (row.featured ? 'featured' : ''),
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
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Solace', hint: 'Must match Product.brand exactly.' },
  { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Eyewear that loves the sun' },
  { name: 'image', label: 'Logo / tile image', type: 'image' },
  { name: 'featured', label: 'Featured on home', type: 'toggle', defaultValue: false },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
  { name: 'active', label: 'Visible in app', type: 'toggle', defaultValue: true },
];

export default function BrandsPage() {
  return (
    <ResourcePage
      title="Brands"
      subtitle="Maker tiles on Shop home and the Brands screen. Product counts are computed live."
      path="shop/brands"
      responseKey="brands"
      singular="Brand"
      searchPlaceholder="Search brands…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'featured',
          label: 'Any placement',
          options: [
            { value: 'true', label: 'Featured' },
            { value: 'false', label: 'Regular' },
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
