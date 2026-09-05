import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SmartImage } from '@/components/ui/SmartImage';
import { EmptyState } from '@/components/ui/Primitives';
import { SkeletonRail } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchProducts } from '@/api/catalog';
import { groupBrands } from '@/lib/brands';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { initials } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

/**
 * `brands_screen.dart` — every brand in the catalogue, three tiles per row.
 * Tiles come from the `brand` field of live products (`/shop/products`), which
 * is the closest this API has to the reference's brand table.
 */
export function BrandsScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const query = useQuery(useCallback(() => fetchProducts({ limit: 100 }), []), {});
  const brands = useMemo(() => groupBrands(query.data ?? []), [query.data]);

  return (
    <Screen
      title="All brands"
      subtitle={query.loading ? 'Scanning the shelves…' : `${brands.length} brands with items in stock`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md }}>
          <SkeletonRail count={6} cardWidth={104} height={104} />
        </View>
      ) : brands.length === 0 ? (
        <EmptyState icon="tag" title="No brands published yet" subtitle="Products get a brand tile as soon as a store fills in the brand field." />
      ) : (
        <View style={styles.grid}>
          {brands.map((brand) => (
            <Pressable
              key={brand.name}
              accessibilityRole="button"
              accessibilityLabel={`${brand.name}, ${brand.items} items`}
              onPress={() => {
                haptic.light();
                navigation.navigate('BrandItems', { name: brand.name });
              }}
              style={({ pressed }) => [styles.cell, { backgroundColor: pressed ? c.surfaceAlt : c.surfaceHi, borderColor: c.border }]}
            >
              {brand.image ? (
                <SmartImage source={brand.image} name={brand.name} style={styles.art} radiusOverride={radius.md} />
              ) : (
                <View style={[styles.art, styles.letterPlate, { backgroundColor: c.primarySoft }]}>
                  <Text variant="subtitle" weight="semibold" color={c.primary}>
                    {initials(brand.name)}
                  </Text>
                </View>
              )}
              <Text variant="caption" weight="semibold" numberOfLines={1} center style={{ paddingHorizontal: 2 }}>
                {brand.name}
              </Text>
              <Text variant="micro" tone="faint">
                {brand.items} item{brand.items === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.edge, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  cell: { width: '31%', borderRadius: radius.lg, borderWidth: 1, padding: spacing.xs, alignItems: 'center', gap: 4, minHeight: 128, justifyContent: 'center' },
  art: { width: 60, height: 60, borderRadius: radius.md },
  letterPlate: { alignItems: 'center', justifyContent: 'center' },
});
