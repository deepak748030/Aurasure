'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell, PriceCell, RatingCell, BoolCell } from '@/components/resource/cells';
import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import { useLookups } from '@/lib/queries';
import type { CatalogRecord } from '@/lib/types';

export default function FoodItemsPage() {
  const { data: lookups } = useLookups();
  const restaurants = lookups?.restaurants ?? [];
  const nameById = new Map(restaurants.map((r) => [r.id, r.name]));

  const columns: Column<CatalogRecord>[] = [
    {
      key: 'name',
      label: 'Item',
      primary: true,
      render: (row) => (
        <NameCell image={row.image} name={row.name} meta={nameById.get(String(row.restaurantId)) ?? String(row.restaurantId ?? '')} />
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
      key: 'prepTime',
      label: 'Prep',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular">{Number(row.prepTime ?? 0)} min</span>,
      value: (row) => Number(row.prepTime ?? 0),
    },
    {
      key: 'isVeg',
      label: 'Diet',
      render: (row) => <BoolCell value={row.isVeg} yes="Veg" no="Non-veg" />,
      value: (row) => (row.isVeg ? 'veg' : 'non-veg'),
    },
    {
      key: 'flags',
      label: 'Highlights',
      hideOnMobile: true,
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.isBestseller ? <Badge tone="warning">Bestseller</Badge> : null}
          {row.isPopular ? <Badge tone="brand">Popular</Badge> : null}
          {row.isSpecial ? <Badge tone="food">Special</Badge> : null}
          {!row.isBestseller && !row.isPopular && !row.isSpecial ? <span className="text-ink-300">—</span> : null}
        </span>
      ),
      value: (row) =>
        [row.isBestseller && 'bestseller', row.isPopular && 'popular', row.isSpecial && 'special']
          .filter(Boolean)
          .join(' | '),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'name', label: 'Item name', type: 'text', required: true, placeholder: 'Paneer Butter Masala' },
    {
      name: 'restaurantId',
      label: 'Restaurant',
      type: 'select',
      required: true,
      options: restaurants.map((r) => ({ value: r.id, label: r.name })),
    },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Slow cooked, rich tomato gravy…' },
    { name: 'image', label: 'Image', type: 'image' },
    { name: 'price', label: 'Price (₹)', type: 'number', required: true },
    { name: 'mrp', label: 'MRP (₹)', type: 'number' },
    { name: 'prepTime', label: 'Prep time (min)', type: 'number' },
    { name: 'rating', label: 'Rating (0-5)', type: 'number' },
    { name: 'reviews', label: 'Review count', type: 'number' },
    {
      name: 'vibeId',
      label: 'Collection',
      type: 'select',
      options: (lookups?.vibes ?? []).map((v) => ({ value: v.id, label: v.name })),
    },
    { name: 'categoryIds', label: 'Category ids', type: 'tags', hint: 'Comma separated' },
    { name: 'tags', label: 'Tags', type: 'tags', hint: 'Comma separated' },
    { name: 'isVeg', label: 'Vegetarian', type: 'toggle', defaultValue: true },
    { name: 'isBestseller', label: 'Bestseller', type: 'toggle' },
    { name: 'isPopular', label: 'Popular', type: 'toggle' },
    { name: 'isSpecial', label: "Today's special", type: 'toggle' },
  ];

  return (
    <ResourcePage
      title="Food items"
      subtitle="Dishes served by your restaurants."
      path="food/items"
      responseKey="items"
      singular="Food item"
      searchPlaceholder="Search dishes…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'restaurantId',
          label: 'All restaurants',
          options: restaurants.map((r) => ({ value: r.id, label: r.name })),
        },
        {
          key: 'veg',
          label: 'Any diet',
          options: [
            { value: 'true', label: 'Veg only' },
            { value: 'false', label: 'Non-veg only' },
          ],
        },
      ]}
    />
  );
}
