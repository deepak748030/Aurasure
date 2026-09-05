import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Chip, EmptyState, Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { SmartImage } from '@/components/ui/SmartImage';
import { Icon } from '@/lib/icons';
import { useQuery } from '@/hooks/useQuery';
import { fetchFoodCategories, fetchRestaurants, fetchShopCategories, fetchStores, type StoreFilter } from '@/api/catalog';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { FoodCategory, ImageRef, Restaurant, ShopCategory, ShopStore } from '@/types';

/**
 * "Top stores near you" list + the see-all screen.
 * Rows touch each other (gap 0) and the surface is full-bleed - the project
 * rule for flat lists. Filters map onto
 * `GET /food/restaurants?filter=` and `GET /shop/stores?popular=&niche=&recommended=`.
 */

export type StoreFilterKey = 'all' | 'popular' | 'new' | 'top' | 'niche';

const FILTERS: { key: StoreFilterKey; label: string; icon: 'layers' | 'flame' | 'sparkles' | 'starCheck' | 'shield' }[] = [
  { key: 'all', label: 'All', icon: 'layers' },
  { key: 'popular', label: 'Popular', icon: 'flame' },
  { key: 'new', label: 'New', icon: 'sparkles' },
  { key: 'top', label: 'Top rated', icon: 'starCheck' },
  { key: 'niche', label: 'Curated', icon: 'shield' },
];

export interface OutletRow {
  id: string;
  name: string;
  line: string;
  rating: number;
  reviews: number;
  eta: string;
  promo?: string;
  closed: boolean;
  image: ImageRef | null;
}

function fromRestaurant(restaurant: Restaurant): OutletRow {
  return {
    id: restaurant.id,
    name: restaurant.name,
    line: [restaurant.line, restaurant.cuisines.slice(0, 2).join(' · ')].filter(Boolean).join(' · '),
    rating: restaurant.rating,
    reviews: restaurant.reviews,
    eta: `${restaurant.deliveryTime} min`,
    promo: restaurant.promo || restaurant.offer,
    closed: Boolean(restaurant.isClosed),
    image: restaurant.cover ?? null,
  };
}

function fromStore(store: ShopStore): OutletRow {
  return {
    id: store.id,
    name: store.name,
    line: [store.house, store.road, store.city].filter(Boolean).join(', '),
    rating: store.rating,
    reviews: store.reviews,
    eta: `${store.deliveryMins} min`,
    promo: store.promo,
    closed: Boolean(store.isClosed),
    image: store.cover ?? null,
  };
}

export function useOutletList(
  filter: StoreFilterKey,
  categoryId?: string,
): {
  rows: OutletRow[];
  loading: boolean;
  refresh: () => void;
  refreshing: boolean;
  error: string | null;
  offline: boolean;
} {
  const { module } = useSession();

  const query = useQuery<OutletRow[]>(
    useCallback(
      async () => {
        if (module === 'food') {
          const result = await fetchRestaurants({
            filter: (filter === 'niche' ? 'top' : filter) as StoreFilter,
            ...(categoryId ? { category: categoryId } : {}),
            limit: 40,
          });
          return result.restaurants.map(fromRestaurant);
        }
        const stores = await fetchStores({
          ...(filter === 'popular' ? { popular: true } : {}),
          ...(filter === 'niche' ? { niche: true } : {}),
          ...(filter === 'new' ? { popular: true } : {}),
          ...(filter === 'top' ? { recommended: true } : {}),
          limit: 40,
        });
        return stores.map(fromStore);
      },
      [module, filter, categoryId],
    ),
  );

  return {
    rows: query.data ?? [],
    loading: query.loading,
    refresh: query.refresh,
    refreshing: query.refreshing,
    error: query.error?.message ?? null,
    offline: query.offline,
  };
}

export function OutletFilterBar({
  filter,
  onChange,
  categories,
  categoryId,
  onCategory,
}: {
  filter: StoreFilterKey;
  onChange: (next: StoreFilterKey) => void;
  categories: (FoodCategory | ShopCategory)[];
  categoryId?: string;
  onCategory?: (id: string | undefined) => void;
}): React.ReactElement {
  const c = useColors();
  const [showCategories, setShowCategories] = useState(false);
  const activeCategory = useMemo(() => categories.find((cat) => cat.id === categoryId), [categories, categoryId]);

  return (
    <View style={{ gap: spacing.xs, paddingVertical: spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.edge }}>
        {FILTERS.map((item) => (
          <Chip key={item.key} label={item.label} icon={item.icon} selected={filter === item.key} onPress={() => onChange(item.key)} size="sm" />
        ))}
        {categories.length > 0 && onCategory ? (
          <Chip
            label={activeCategory ? activeCategory.name : 'Category'}
            icon="grid"
            selected={Boolean(activeCategory)}
            onPress={() => setShowCategories((prev) => !prev)}
            size="sm"
            right={<Icon name={showCategories ? 'chevronUp' : 'chevronDown'} size={11} color={activeCategory ? c.onPrimary : c.textSecondary} />}
          />
        ) : null}
      </View>

      {showCategories && onCategory ? (
        <View style={styles.categoryPanel}>
          <Chip label="All categories" selected={!categoryId} onPress={() => onCategory(undefined)} size="sm" />
          {categories.map((cat) => (
            <Chip key={cat.id} label={cat.name} selected={categoryId === cat.id} onPress={() => onCategory(cat.id)} size="sm" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Flush list of outlets. Zero row gaps, hairline dividers, edge to edge. */
export function OutletList({
  rows,
  loading,
  onOpen,
  emptyTitle = 'Nothing here yet',
  emptySubtitle,
}: {
  rows: OutletRow[];
  loading: boolean;
  onOpen: (row: OutletRow) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
}): React.ReactElement {
  const c = useColors();
  if (loading) return <SkeletonList rows={5} thumb={52} />;
  if (rows.length === 0) {
    return <EmptyState icon="store" title={emptyTitle} subtitle={emptySubtitle ?? 'Try another filter — new stores join every week.'} />;
  }
  return (
    <View style={{ gap: 0 }}>
      {rows.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          onPress={() => onOpen(row)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.sm,
            backgroundColor: pressed ? c.surfaceAlt : c.surface,
            borderBottomWidth: 1,
            borderBottomColor: c.divider,
          })}
        >
          <View style={{ width: 52, height: 52 }}>
            <SmartImage source={row.image} name={row.name} style={{ width: 52, height: 52 }} radiusOverride={radius.md} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="title" weight="bold" numberOfLines={1}>
              {row.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {row.line}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Tag label={row.rating > 0 ? `${row.rating.toFixed(1)} ★` : 'New'} tone={row.rating >= 4.5 ? 'success' : 'muted'} />
              <Tag label={row.eta} icon="clock" tone="muted" />
              {row.promo ? <Tag label={row.promo} icon="percent" /> : null}
              {row.closed ? <Tag label="Closed" tone="danger" /> : null}
            </View>
          </View>
          <Icon name="chevronRight" size={16} color={c.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = {
  categoryPanel: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginHorizontal: spacing.edge,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: radius.md,
  },
};
