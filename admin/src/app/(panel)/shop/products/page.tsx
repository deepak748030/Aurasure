'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell, PriceCell, RatingCell } from '@/components/resource/cells';
import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import { useLookups } from '@/lib/queries';
import type { CatalogRecord } from '@/lib/types';

export default function ProductsPage() {
  const { data: lookups } = useLookups();
  const stores = lookups?.stores ?? [];
  const categories = lookups?.shopCategories ?? [];
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  const columns: Column<CatalogRecord>[] = [
    {
      key: 'name',
      label: 'Product',
      primary: true,
      render: (row) => (
        <NameCell
          image={row.image}
          name={row.name}
          meta={`${row.brand ? `${String(row.brand)} · ` : ''}${storeName.get(String(row.storeId)) ?? String(row.storeId ?? '')}`}
        />
      ),
      value: (row) => String(row.name ?? ''),
    },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: (row) => <PriceCell price={row.price} mrp={row.mrp} />,
      value: (row) => Number(row.price ?? 0),
    },
    {
      key: 'rating',
      label: 'Rating',
      hideOnMobile: true,
      render: (row) => <RatingCell rating={row.rating} reviews={row.reviews} />,
      value: (row) => Number(row.rating ?? 0),
    },
    {
      key: 'inStock',
      label: 'Stock',
      render: (row) => <Badge tone={row.inStock ? 'success' : 'danger'}>{row.inStock ? 'In stock' : 'Out of stock'}</Badge>,
      value: (row) => (row.inStock ? 'in stock' : 'out of stock'),
    },
    {
      key: 'flags',
      label: 'Highlights',
      hideOnMobile: true,
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.isTrending ? <Badge tone="brand">Trending</Badge> : null}
          {row.isBestseller ? <Badge tone="warning">Bestseller</Badge> : null}
          {row.isSpecialOffer ? <Badge tone="food">Offer</Badge> : null}
          {row.isNew ? <Badge tone="info">New</Badge> : null}
          {!row.isTrending && !row.isBestseller && !row.isSpecialOffer && !row.isNew ? (
            <span className="text-ink-300">—</span>
          ) : null}
        </span>
      ),
      value: (row) =>
        [row.isTrending && 'trending', row.isBestseller && 'bestseller', row.isSpecialOffer && 'offer', row.isNew && 'new']
          .filter(Boolean)
          .join(' | '),
    },
    {
      key: 'deliveryMins',
      label: 'Delivery',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular">{Number(row.deliveryMins ?? 0)} min</span>,
      value: (row) => Number(row.deliveryMins ?? 0),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'name', label: 'Product name', type: 'text', required: true, placeholder: 'Cotton oversized tee' },
    { name: 'brand', label: 'Brand', type: 'text' },
    {
      name: 'storeId',
      label: 'Store',
      type: 'select',
      required: true,
      options: stores.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      required: true,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'image', label: 'Image', type: 'image' },
    { name: 'price', label: 'Price (₹)', type: 'number', required: true },
    { name: 'mrp', label: 'MRP (₹)', type: 'number', required: true },
    { name: 'rating', label: 'Rating (0-5)', type: 'number' },
    { name: 'reviews', label: 'Review count', type: 'number' },
    { name: 'deliveryMins', label: 'Delivery time (min)', type: 'number' },
    { name: 'colors', label: 'Colours', type: 'tags', hint: 'Comma separated hex or names' },
    { name: 'sizes', label: 'Sizes', type: 'tags', hint: 'Comma separated · S, M, L' },
    { name: 'tags', label: 'Tags', type: 'tags', hint: 'Comma separated' },
    { name: 'inStock', label: 'In stock', type: 'toggle', defaultValue: true },
    { name: 'isTrending', label: 'Trending', type: 'toggle' },
    { name: 'isBestseller', label: 'Bestseller', type: 'toggle' },
    { name: 'isSpecialOffer', label: 'Special offer', type: 'toggle' },
    { name: 'isNew', label: 'New arrival', type: 'toggle' },
  ];

  return (
    <ResourcePage
      title="Products"
      subtitle="Everything on sale across your shop stores."
      path="shop/products"
      responseKey="products"
      singular="Product"
      searchPlaceholder="Search products or brands…"
      columns={columns}
      fields={fields}
      filters={[
        { key: 'storeId', label: 'All stores', options: stores.map((s) => ({ value: s.id, label: s.name })) },
        { key: 'categoryId', label: 'All categories', options: categories.map((c) => ({ value: c.id, label: c.name })) },
        {
          key: 'inStock',
          label: 'Any stock',
          options: [
            { value: 'true', label: 'In stock' },
            { value: 'false', label: 'Out of stock' },
          ],
        },
      ]}
    />
  );
}
