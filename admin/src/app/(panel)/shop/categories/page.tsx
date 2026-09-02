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
    key: 'tagline',
    label: 'Tagline',
    render: (row) => <span className="text-[13px] text-ink-600">{String(row.tagline ?? '—')}</span>,
    value: (row) => String(row.tagline ?? ''),
  },
  {
    key: 'icon',
    label: 'Icon',
    hideOnMobile: true,
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
  { name: 'name', label: 'Category name', type: 'text', required: true, placeholder: 'Fashion' },
  { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Trending fits under ₹999' },
  { name: 'icon', label: 'Icon name', type: 'text', required: true, placeholder: 'shirt-outline' },
  { name: 'image', label: 'Image', type: 'image' },
  { name: 'sortOrder', label: 'Sort order', type: 'number' },
];

export default function ShopCategoriesPage() {
  return (
    <ResourcePage
      title="Shop categories"
      subtitle="How products are grouped inside the Shop module."
      path="shop/categories"
      responseKey="categories"
      singular="Category"
      searchPlaceholder="Search categories…"
      columns={columns}
      fields={fields}
    />
  );
}
