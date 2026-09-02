'use client';

import { ResourcePage, type FieldDef } from '@/components/resource/ResourcePage';
import { NameCell, RatingCell, BoolCell, TagsCell } from '@/components/resource/cells';
import { Badge } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataTable';
import { useLookups } from '@/lib/queries';
import { money } from '@/lib/format';
import type { CatalogRecord } from '@/lib/types';

export default function RestaurantsPage() {
  const { data: lookups } = useLookups();

  const columns: Column<CatalogRecord>[] = [
    {
      key: 'name',
      label: 'Restaurant',
      primary: true,
      render: (row) => <NameCell image={row.cover} name={row.name} meta={String(row.line ?? row.id)} />,
      value: (row) => String(row.name ?? ''),
    },
    {
      key: 'cuisines',
      label: 'Cuisines',
      hideOnMobile: true,
      render: (row) => <TagsCell value={row.cuisines} />,
      value: (row) => (Array.isArray(row.cuisines) ? (row.cuisines as string[]).join(' | ') : ''),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => <RatingCell rating={row.rating} reviews={row.reviews} />,
      value: (row) => Number(row.rating ?? 0),
    },
    {
      key: 'deliveryTime',
      label: 'Delivery',
      align: 'right',
      hideOnMobile: true,
      render: (row) => <span className="tabular">{Number(row.deliveryTime ?? 0)} min</span>,
      value: (row) => Number(row.deliveryTime ?? 0),
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
      key: 'isVeg',
      label: 'Veg only',
      hideOnMobile: true,
      render: (row) => <BoolCell value={row.isVeg} yes="Pure veg" no="Mixed" />,
      value: (row) => (row.isVeg ? 'veg' : 'mixed'),
    },
    {
      key: 'isClosed',
      label: 'Status',
      render: (row) => <Badge tone={row.isClosed ? 'danger' : 'success'}>{row.isClosed ? 'Closed' : 'Open'}</Badge>,
      value: (row) => (row.isClosed ? 'closed' : 'open'),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'name', label: 'Restaurant name', type: 'text', required: true, placeholder: 'Spice Villa' },
    { name: 'line', label: 'Address line', type: 'text', placeholder: 'Civil Lines, Raipur' },
    { name: 'cuisines', label: 'Cuisines', type: 'tags', hint: 'Comma separated · North Indian, Chinese' },
    { name: 'tags', label: 'Tags', type: 'tags', hint: 'Comma separated' },
    {
      name: 'categoryIds',
      label: 'Category ids',
      type: 'tags',
      hint: lookups?.foodCategories.length
        ? `Available: ${lookups.foodCategories.map((c) => c.id).join(', ')}`
        : 'Comma separated food category ids',
    },
    { name: 'cover', label: 'Cover image', type: 'image' },
    { name: 'rating', label: 'Rating (0-5)', type: 'number' },
    { name: 'reviews', label: 'Review count', type: 'number' },
    { name: 'deliveryTime', label: 'Delivery time (min)', type: 'number' },
    { name: 'deliveryFee', label: 'Delivery fee (₹)', type: 'number' },
    { name: 'minOrder', label: 'Minimum order (₹)', type: 'number' },
    { name: 'priceForTwo', label: 'Price for two (₹)', type: 'number' },
    { name: 'distanceKm', label: 'Distance (km)', type: 'number' },
    { name: 'promo', label: 'Promo text', type: 'text', placeholder: '50% OFF up to ₹100' },
    { name: 'offer', label: 'Offer text', type: 'text' },
    { name: 'isVeg', label: 'Pure veg', type: 'toggle' },
    { name: 'isPopular', label: 'Popular', type: 'toggle' },
    { name: 'isNewlyJoined', label: 'Newly joined', type: 'toggle' },
    { name: 'isClosed', label: 'Temporarily closed', type: 'toggle' },
  ];

  return (
    <ResourcePage
      title="Restaurants"
      subtitle="Food vendors shown in the app's Food module."
      path="food/restaurants"
      responseKey="restaurants"
      singular="Restaurant"
      searchPlaceholder="Search by name, address or id…"
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'category',
          label: 'All categories',
          options: (lookups?.foodCategories ?? []).map((c) => ({ value: c.id, label: c.name })),
        },
        {
          key: 'closed',
          label: 'Any status',
          options: [
            { value: 'false', label: 'Open' },
            { value: 'true', label: 'Closed' },
          ],
        },
      ]}
    />
  );
}
