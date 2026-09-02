'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell } from '@/components/resource/cells';
import type { Column } from '@/components/ui/DataTable';
import type { CatalogRecord } from '@/lib/types';

const columns: Column<CatalogRecord>[] = [
  {
    key: 'name',
    label: 'Collection',
    primary: true,
    render: (row) => <NameCell image={row.image} name={row.name} meta={String(row.tagline ?? row.id)} />,
    value: (row) => String(row.name ?? ''),
  },
  {
    key: 'colors',
    label: 'Card colours',
    hideOnMobile: true,
    render: (row) => (
      <span className="flex items-center gap-1.5">
        <span
          className="h-5 w-5 rounded-md ring-1 ring-[var(--color-line)]"
          style={{ backgroundColor: String(row.from ?? '#5b46e5') }}
        />
        <span
          className="h-5 w-5 rounded-md ring-1 ring-[var(--color-line)]"
          style={{ backgroundColor: String(row.to ?? '#8b5cf6') }}
        />
        <span className="font-mono text-[11.5px] text-ink-500">
          {String(row.from ?? '')} → {String(row.to ?? '')}
        </span>
      </span>
    ),
    value: (row) => `${String(row.from ?? '')} ${String(row.to ?? '')}`,
  },
  {
    key: 'sortOrder',
    label: 'Sort order',
    align: 'right',
    render: (row) => <span className="tabular">{Number(row.sortOrder ?? 0)}</span>,
    value: (row) => Number(row.sortOrder ?? 0),
  },
];

const fields: FieldDef[] = [
  { name: 'name', label: 'Collection name', type: 'text', required: true, placeholder: 'Late night cravings' },
  { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Open till 2 AM' },
  { name: 'image', label: 'Image URL', type: 'image' },
  { name: 'from', label: 'Card colour (start)', type: 'color', defaultValue: '#6a5ef5' },
  { name: 'to', label: 'Card colour (end)', type: 'color', defaultValue: '#8b5cf6' },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
];

export default function FoodCollectionsPage() {
  return (
    <ResourcePage
      title="Collections"
      subtitle="Curated “vibes” the Food home screen groups dishes under."
      path="food/vibes"
      responseKey="vibes"
      singular="Collection"
      searchPlaceholder="Search collections…"
      columns={columns}
      fields={fields}
    />
  );
}
