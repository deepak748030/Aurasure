import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SmartImage } from '@/components/ui/SmartImage';
import { ItemRow } from '@/components/list/ItemRow';
import { EmptyState, ErrorState, Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { fetchVibeItems } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { ScreenProps } from '@/navigation/types';

/** A curated collection ("Late night cravings", "High protein") — food module. */
export function VibeScreen({ navigation, route }: ScreenProps<'Vibe'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite } = useSession();
  const query = useQuery(useCallback(() => fetchVibeItems(route.params.id), [route.params.id]), {});
  const items = query.data?.items ?? [];
  const vibe = query.data?.vibe;

  return (
    <Screen
      title={vibe?.name ?? route.params.name}
      subtitle={query.loading ? 'Plating the collection…' : `${items.length} dish${items.length === 1 ? '' : 'es'}`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm, gap: spacing.sm }}>
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <SmartImage source={vibe?.image ?? null} name={vibe?.name ?? 'Vibe'} style={styles.art} radiusOverride={radius.md} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h2" weight="bold" color={c.white} numberOfLines={2}>
              {vibe?.name ?? route.params.name}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.88)">
              {vibe?.tagline ?? route.params.tagline ?? 'Hand-picked by the Aurasure kitchen team'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', paddingTop: 2 }}>
              <Tag label={`${items.length} dishes`} tone="muted" />
              <Tag label="Chef pick" tone="primary" />
            </View>
          </View>
        </View>
      </View>

      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={5} thumb={62} />
        </View>
      ) : query.error ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="flame" title="This collection is empty" subtitle="No dishes carry this vibe in the catalogue right now." />
      ) : (
        <View style={{ backgroundColor: c.surface, marginTop: spacing.sm, paddingBottom: spacing.xl }}>
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              module="food"
              last={index === items.length - 1}
              qty={cart.qtyOf('food', item.id)}
              favorite={isFavorite('food', item.id)}
              onFavorite={() => void toggleFavorite('food', item.id)}
              onOpen={() => navigation.navigate('Item', { module: 'food', id: item.id })}
              onAdd={() => {
                void actions.quickAdd('food', item, { id: item.restaurantId ?? '', name: '', deliveryFee: 0, minOrder: 0, etaMinutes: item.prepTime ?? 30 });
              }}
              onInc={() => {
                const line = cart.linesFor('food').find((row) => row.refId === item.id);
                if (line) actions.inc('food', line.id, line.qty);
              }}
              onDec={() => {
                const line = cart.linesFor('food').find((row) => row.refId === item.id);
                if (line) actions.dec('food', line.id, line.qty);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = {
  hero: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.xl, alignItems: 'center' },
  art: { width: 78, height: 78, borderRadius: radius.md },
} as const;
