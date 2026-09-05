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
import { fetchProducts } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { initials } from '@/lib/format';
import type { ScreenProps } from '@/navigation/types';

/** `brands_product_screen.dart` — the items of one brand. */
export function BrandItemsScreen({ navigation, route }: ScreenProps<'BrandItems'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite } = useSession();
  const brand = route.params.name;

  // `q` on /shop/products matches name, brand, description and tags — then the
  // client keeps the exact brand rows so the list is honest.
  const query = useQuery(useCallback(() => fetchProducts({ q: brand, limit: 60 }), [brand]), {});
  const rows = useMemo(() => (query.data ?? []).filter((item) => (item.brand ?? '').trim().toLowerCase() === brand.toLowerCase()), [query.data, brand]);

  return (
    <Screen
      title={brand}
      subtitle={query.loading ? 'Loading…' : `${rows.length} item${rows.length === 1 ? '' : 's'} from this brand`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
        <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.plate, { backgroundColor: c.primarySoft }]}>
            <Text variant="h3" weight="bold" color={c.primary}>
              {initials(brand)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subtitle" weight="semibold">
              {brand}
            </Text>
            <Text variant="micro" tone="muted">
              Everything with this brand on the shelves near you, priced by the store that lists it.
            </Text>
          </View>
          <SmartImage source={rows[0]?.image ?? null} name={brand} style={styles.thumb} radiusOverride={radius.md} />
        </View>
      </View>

      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={5} thumb={62} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="tag"
          title={`No ${brand} items right now`}
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
                void actions.quickAdd('shop', item, { id: item.storeId ?? '', name: '', deliveryFee: 0, minOrder: 0, etaMinutes: item.deliveryMins ?? 40 });
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
