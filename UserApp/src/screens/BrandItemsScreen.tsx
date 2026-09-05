import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SmartImage } from '@/components/ui/SmartImage';
import { ItemRow } from '@/components/list/ItemRow';
import { EmptyState } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { fetchBrand, type OutletSnapshot } from '@/api/app';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { initials } from '@/lib/format';
import type { ScreenProps } from '@/navigation/types';

/** `brands_product_screen.dart` — the items of one brand, with store snapshots. */
export function BrandItemsScreen({ navigation, route }: ScreenProps<'BrandItems'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite } = useSession();
  const { id, name } = route.params;

  const query = useQuery(
    useCallback((signal: AbortSignal) => fetchBrand(id, signal), [id]),
    {},
  );
  const brand = query.data?.brand;
  const rows = useMemo(() => query.data?.products ?? [], [query.data]);
  const stores = useMemo<Record<string, OutletSnapshot>>(() => query.data?.stores ?? {}, [query.data]);

  const title = brand?.name ?? name;
  return (
    <Screen
      title={title}
      subtitle={query.loading ? 'Loading…' : `${rows.length} item${rows.length === 1 ? '' : 's'} from this brand`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
        <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          {brand?.image ? (
            <SmartImage source={brand.image} name={title} style={styles.plate} radiusOverride={radius.md} />
          ) : (
            <View style={[styles.plate, { backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
              <Text variant="h3" weight="bold" color={c.primary}>
                {initials(title)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subtitle" weight="semibold">
              {title}
            </Text>
            <Text variant="micro" tone="muted">
              {brand?.tagline || 'Everything with this brand on the shelves near you, priced by the store that lists it.'}
            </Text>
          </View>
          <SmartImage source={rows[0]?.image ?? null} name={title} style={styles.thumb} radiusOverride={radius.md} />
        </View>
      </View>

      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={5} thumb={62} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="tag"
          title={`No ${title} items right now`}
          subtitle="The brand exists in the catalogue but nothing is listed today. Try again after a restock."
          actionLabel="All brands"
          onAction={() => navigation.navigate('Brands')}
        />
      ) : (
        <View style={{ backgroundColor: c.surface, marginTop: spacing.md, paddingBottom: spacing.xl }}>
          {rows.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              module="shop"
              last={index === rows.length - 1}
              qty={cart.qtyOf('shop', item.id)}
              favorite={isFavorite('shop', item.id)}
              onFavorite={() => void toggleFavorite('shop', item.id)}
              onOpen={() => navigation.navigate('Item', { module: 'shop', id: item.id })}
              onAdd={() => {
                const storeId = item.storeId ?? '';
                void actions.quickAdd(
                  'shop',
                  item,
                  stores[storeId] ?? { id: storeId, name: '', deliveryFee: 0, minOrder: 0, etaMinutes: item.deliveryMins ?? 40 },
                );
              }}
              onInc={() => {
                const line = cart.linesFor('shop').find((row) => row.refId === item.id);
                if (line) actions.inc('shop', line.id, line.qty);
              }}
              onDec={() => {
                const line = cart.linesFor('shop').find((row) => row.refId === item.id);
                if (line) actions.dec('shop', line.id, line.qty);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = {
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1 },
  plate: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
} as const;
