import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { ItemRow } from '@/components/list/ItemRow';
import { EmptyState, ErrorState } from '@/components/ui/Primitives';
import { SearchField } from '@/components/ui/Input';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonHero, SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { useOutletResolver } from '@/hooks/useOutletResolver';
import { fetchFoodCategories, fetchFoodItems, fetchShopCategoryProducts } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { CatalogItem } from '@/types';
import type { ScreenProps } from '@/navigation/types';

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'rating';

interface CategoryHero {
  name: string;
  icon: string | null;
  image: import('@/types').ImageRef | null;
  tagline: string;
}

/** Category landing page: everything in this category, sortable, add-to-cart inline. */
export function CategoryScreen({ navigation, route }: ScreenProps<'Category'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { module, isFavorite, toggleFavorite } = useSession();
  const resolveOutlet = useOutletResolver(module);
  const { id } = route.params;
  const [sort, setSort] = useState<Sort>('recommended');
  const [term, setTerm] = useState('');

  const query = useQuery<{ items: CatalogItem[]; hero: CategoryHero }>(
    useCallback(async () => {
      if (module === 'food') {
        const [categories, items] = await Promise.all([fetchFoodCategories(), fetchFoodItems({ category: id, limit: 80 })]);
        const found = categories.find((row) => row.id === id);
        return {
          items,
          hero: {
            name: found?.name ?? route.params.name,
            icon: found?.icon ?? null,
            image: found?.image ?? null,
            tagline: 'Every dish in this category from the kitchens near you',
          },
        };
      }
      const { category, products } = await fetchShopCategoryProducts(id);
      return {
        items: products,
        hero: { name: category.name, icon: category.icon ?? null, image: category.image ?? null, tagline: category.tagline ?? 'Everything this aisle holds, in one list' },
      };
    }, [module, id, route.params.name]),
    {},
  );

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const filtered = needle ? (query.data?.items ?? []).filter((item) => `${item.name} ${item.description} ${item.brand ?? ''}`.toLowerCase().includes(needle)) : query.data?.items ?? [];
    const sorted = [...filtered];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => Number(b.isBestseller ?? false) - Number(a.isBestseller ?? false) || b.rating - a.rating);
    return sorted;
  }, [query.data, sort, term]);

  const open = (item: CatalogItem): void => navigation.navigate('Item', { module, id: item.id });
  const hero = query.data?.hero ?? { name: route.params.name, icon: null, image: null, tagline: '' };

  return (
    <Screen
      title={hero.name}
      subtitle={query.loading ? 'Loading the shelf…' : rows.length === 0 ? 'No items' : `${rows.length} item${rows.length === 1 ? '' : 's'}`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonHero />
          <View style={{ paddingTop: spacing.md }}>
            <SkeletonList rows={5} thumb={62} />
          </View>
        </View>
      ) : query.error && rows.length === 0 ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : (
        <>
          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
            <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
              {hero.image || hero.icon ? (
                <SmartImage source={hero.image} name={hero.name} style={styles.heroImage} radiusOverride={radius.md} />
              ) : (
                <View style={[styles.heroImage, { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
                  <Icon name="grid" size={18} color={c.primary} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3" weight="bold" numberOfLines={1}>
                  {hero.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {hero.tagline}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
            <SearchField value={term} onChangeText={setTerm} placeholder={`Search in ${hero.name.toLowerCase()}`} onClear={() => setTerm('')} />
          </View>

          <SegmentedTabs
            tabs={[
              { key: 'recommended', label: 'Recommended' },
              { key: 'rating', label: 'Top rated' },
              { key: 'price-asc', label: 'Cheapest' },
              { key: 'price-desc', label: 'Dearest' },
            ]}
            active={sort}
            onChange={(key) => setSort(key as Sort)}
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={term ? 'search' : 'tag'}
              title={term ? `Nothing matches “${term}”` : 'This category is empty right now'}
              subtitle={term ? 'Clear the search to see the whole shelf.' : 'The store has not published items in it yet.'}
              actionLabel={term ? 'Clear search' : undefined}
              onAction={term ? () => setTerm('') : undefined}
            />
          ) : (
            <View style={{ backgroundColor: c.surface, paddingBottom: spacing.xl }}>
              {rows.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  module={module}
                  last={index === rows.length - 1}
                  qty={cart.qtyOf(module, item.id)}
                  favorite={isFavorite(module, item.id)}
                  onFavorite={() => void toggleFavorite(module, item.id)}
                  onOpen={() => open(item)}
                  onAdd={() => {
                    void (async () => actions.quickAdd(module, item, await resolveOutlet(item)))();
                  }}
                  onInc={() => {
                    const line = cart.linesFor(module).find((row) => row.refId === item.id);
                    if (line) actions.inc(module, line.id, line.qty);
                  }}
                  onDec={() => {
                    const line = cart.linesFor(module).find((row) => row.refId === item.id);
                    if (line) actions.dec(module, line.id, line.qty);
                  }}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = {
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1 },
  heroImage: { width: 46, height: 46, borderRadius: radius.md },
} as const;
