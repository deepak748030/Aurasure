'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell } from '@/components/resource/cells';
import type { Column } from '@/components/ui/DataTable';
import type { CatalogRecord } from '@/lib/types';

const columns: Column<CatalogRecord>[] = [
  {
    key: 'name',
    label: 'Category',
    primary: true,
    render: (row) => <NameCell image={row.image} name={row.name} meta={String(row.id)} />,
    value: (row) => String(row.name ?? ''),
  },
  {
    key: 'icon',
    label: 'Icon',
    render: (row) => <span className="text-[13px] text-ink-600">{String(row.icon ?? '—')}</span>,
    value: (row) => String(row.icon ?? ''),
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
  { name: 'name', label: 'Category name', type: 'text', required: true, placeholder: 'Biryani' },
  {
    name: 'icon',
    label: 'Icon name',
    type: 'text',
    required: true,
    placeholder: 'restaurant-outline',
    hint: 'Ionicons name used by the mobile app',
  },
  { name: 'image', label: 'Image URL', type: 'image' },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
];

export default function FoodCategoriesPage() {
  return (
    <ResourcePage
      title="Food categories"
      subtitle="Category chips shown at the top of the Food home screen."
      path="food/categories"
      responseKey="categories"
      singular="Category"
      searchPlaceholder="Search categories…"
      columns={columns}
      fields={fields}
    />
  );
}
