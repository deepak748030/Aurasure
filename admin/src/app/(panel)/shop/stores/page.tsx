'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell, RatingCell, TagsCell } from '@/components/resource/cells';
import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import { useLookups } from '@/lib/queries';
import { money } from '@/lib/format';
import type { CatalogRecord } from '@/lib/types';

export default function StoresPage() {
  const { data: lookups } = useLookups();

  const columns: Column<CatalogRecord>[] = [
    {
      key: 'name',
      label: 'Store',
      primary: true,
      render: (row) => <NameCell image={row.cover} name={row.name} meta={String(row.brand ?? row.id)} />,
      value: (row) => String(row.name ?? ''),
    },
    {
      key: 'city',
      label: 'Location',
      render: (row) => (
        <span className="text-[13px] text-ink-700">
          {String(row.city ?? '—')}
          {row.road ? <span className="block text-[12px] text-ink-400">{String(row.road)}</span> : null}
        </span>
      ),
      value: (row) => `${String(row.city ?? '')} ${String(row.road ?? '')}`.trim(),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => <RatingCell rating={row.rating} reviews={row.reviews} />,
      value: (row) => Number(row.rating ?? 0),
    },
    {
      key: 'deliveryMins',
      label: 'Delivery',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular">{Number(row.deliveryMins ?? 0)} min</span>,
      value: (row) => Number(row.deliveryMins ?? 0),
    },
    {
      key: 'deliveryFee',
      label: 'Fee',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular">{money(Number(row.deliveryFee ?? 0))}</span>,
      value: (row) => Number(row.deliveryFee ?? 0),
    },
    {
      key: 'tags',
      label: 'Tags',
      hideOnMobile: true,
      render: (row) => <TagsCell value={row.tags} />,
      value: (row) => (Array.isArray(row.tags) ? (row.tags as string[]).join(' | ') : ''),
    },
    {
      key: 'isPopular',
      label: 'Flag',
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.isPopular ? <Badge tone="brand">Popular</Badge> : null}
          {row.isNiche ? <Badge tone="info">Niche</Badge> : null}
          {!row.isPopular && !row.isNiche ? <span className="text-ink-300">—</span> : null}
        </span>
      ),
      value: (row) => [row.isPopular && 'popular', row.isNiche && 'niche'].filter(Boolean).join(' | '),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'name', label: 'Store name', type: 'text', required: true, placeholder: 'Urban Threads' },
    { name: 'brand', label: 'Brand', type: 'text' },
    { name: 'city', label: 'City', type: 'text', required: true, placeholder: 'Raipur' },
    { name: 'road', label: 'Road / area', type: 'text' },
    { name: 'house', label: 'House / shop no.', type: 'text' },
    { name: 'pin', label: 'PIN code', type: 'text' },
    { name: 'cover', label: 'Cover image', type: 'image' },
    { name: 'rating', label: 'Rating (0-5)', type: 'number' },
    { name: 'reviews', label: 'Review count', type: 'number' },
    { name: 'deliveryMins', label: 'Delivery time (min)', type: 'number' },
    { name: 'deliveryFee', label: 'Delivery fee (₹)', type: 'number' },
    { name: 'minOrder', label: 'Minimum order (₹)', type: 'number' },
    { name: 'promo', label: 'Promo text', type: 'text' },
    {
      name: 'categoryIds',
      label: 'Category ids',
      type: 'tags',
      hint: lookups?.shopCategories.length
        ? `Available: ${lookups.shopCategories.map((c) => c.id).join(', ')}`
        : 'Comma separated shop category ids',
    },
    { name: 'tags', label: 'Tags', type: 'tags', hint: 'Comma separated' },
    { name: 'isPopular', label: 'Popular store', type: 'toggle' },
    { name: 'isNiche', label: 'Niche store', type: 'toggle' },
  ];

  return (
    <ResourcePage
      title="Stores"
      subtitle="Retail partners powering the app's Shop module."
      path="shop/stores"
      responseKey="stores"
      singular="Store"
      searchPlaceholder="Search stores, brands or cities…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'category',
          label: 'All categories',
          options: (lookups?.shopCategories ?? []).map((c) => ({ value: c.id, label: c.name })),
        },
      ]}
    />
  );
}
