import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { ItemRow } from '@/components/list/ItemRow';
import { EmptyState, ErrorState } from '@/components/ui/Primitives';
import { SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { OutletFilterBar, OutletList, useOutletList, type StoreFilterKey } from '@/components/outlets/OutletList';
import { useCartActions } from '@/hooks/useCartActions';
import { usePaginated, useQuery } from '@/hooks/useQuery';
import { fetchFoodItemsPage, fetchFoodCategories, fetchShopCategories, fetchProductsPage } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { ScreenProps } from '@/navigation/types';

const OUTLET_KINDS = ['restaurants', 'stores', 'new'] as const;

/** One list behind every "See all" rail: stores, items, offers, popular, new. */
export function SeeAllScreen({ navigation, route }: ScreenProps<'SeeAll'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { module, isFavorite, toggleFavorite } = useSession();
  const kind = route.params.kind;
  const isOutletKind = (OUTLET_KINDS as readonly string[]).includes(kind);

  const [filter, setFilter] = useState<StoreFilterKey>('all');
  const [categoryId, setCategoryId] = useState<string | undefined>(route.params.categoryId);

  const categories = useQuery(useCallback(() => (module === 'food' ? fetchFoodCategories() : fetchShopCategories()), [module]), {});
  const outlet = useOutletList(kind === 'new' ? 'new' : filter, categoryId);

  const pages = usePaginated(
    useCallback(
      async (page: number): Promise<{ items: import('@/types').CatalogItem[]; meta?: import('@/api/client').Meta }> => {
        const base = { page, limit: 20, ...(categoryId ? { category: categoryId } : {}) };
        if (module === 'food') {
          return await fetchFoodItemsPage({
            ...base,
            ...(kind === 'popular' ? { popular: true } : {}),
            ...(kind === 'offers' ? { special: true } : {}),
          });
        }
        const result = await fetchProductsPage({
          ...base,
          ...(kind === 'popular' ? { trending: true } : {}),
          ...(kind === 'offers' ? { special: true } : {}),
        });
        return { items: result.products, meta: result.meta };
      },
      [module, kind, categoryId],
    ),
    { deps: [kind, categoryId], pageSize: 20 },
  );

  const items = pages.items;
  const outletRows = outlet.rows;
  const loading = isOutletKind ? outlet.loading : pages.loading;
  const isEmpty = isOutletKind ? outletRows.length === 0 : items.length === 0;

  const header = useMemo(
    () => (
      <Text variant="overline" tone="faint" style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
        {isOutletKind ? `${outletRows.length} place${outletRows.length === 1 ? '' : 's'}` : `${pages.total || items.length} item${items.length === 1 ? '' : 's'}`}
      </Text>
    ),
    [isOutletKind, outletRows.length, pages.total, items.length],
  );

  return (
    <Screen
      title={route.params.title}
      subtitle={module === 'food' ? 'Straight from the live catalogue' : 'Straight from the live shelves'}
      back
      padded={false}
      onRefresh={() => (isOutletKind ? outlet.refresh() : pages.refresh())}
      refreshing={isOutletKind ? outlet.refreshing : false}
    >
      {isOutletKind ? (
        <OutletFilterBar
          filter={filter}
          onChange={setFilter}
          categories={categories.data ?? []}
          categoryId={categoryId}
          onCategory={setCategoryId}
        />
      ) : (
        header
      )}

      {loading ? (
        isOutletKind ? (
          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
            <SkeletonRail count={4} cardWidth={300} height={94} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
            <SkeletonList rows={6} thumb={62} />
          </View>
        )
      ) : isEmpty ? (
        <EmptyState
          icon={isOutletKind ? 'store' : 'tag'}
          title={kind === 'offers' ? 'No live offers right now' : 'Nothing to show here yet'}
          subtitle="This list comes straight from the API — the demo catalogue may not cover it."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      ) : isOutletKind ? (
        <OutletList
          rows={outletRows}
          loading={false}
          onOpen={(row) => navigation.navigate('Outlet', { module, id: row.id, name: row.name })}
          emptyTitle="No stores match this filter"
        />
      ) : (
        <View style={{ backgroundColor: c.surface, paddingBottom: spacing.xxl }}>
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              module={module}
              last={index === items.length - 1 && pages.endReached}
              qty={cart.qtyOf(module, item.id)}
              favorite={isFavorite(module, item.id)}
              onFavorite={() => void toggleFavorite(module, item.id)}
              onOpen={() => navigation.navigate('Item', { module, id: item.id })}
              onAdd={() => {
                const outletId = module === 'food' ? item.restaurantId ?? '' : item.storeId ?? '';
                void actions.quickAdd(module, item, { id: outletId, name: '', deliveryFee: 0, minOrder: 0, etaMinutes: item.prepTime ?? 30 });
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

          {pages.endReached ? (
            <View style={styles.end}>
              <Text variant="micro" tone="faint">
                That is all {items.length} item{items.length === 1 ? '' : 's'} in this list.
              </Text>
            </View>
          ) : (
            <Pressable onPress={pages.loadMore} style={({ pressed }) => [styles.more, { borderColor: c.border, opacity: pressed ? 0.92 : 1 }]}>
              <Icon name={pages.loadingMore ? 'refresh' : 'plus'} size={14} color={c.primary} />
              <Text variant="caption" weight="bold" color={c.primary}>
                {pages.loadingMore ? 'Loading…' : `Load ${Math.min(20, Math.max(1, (pages.total || 0) - items.length)) || 'more'} more`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  more: { marginHorizontal: spacing.edge, marginTop: spacing.sm, height: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  end: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm },
});
