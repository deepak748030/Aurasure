import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { CartButton } from '../../components/ui/CartButton';
import { SmartImage } from '../../components/ui/SmartImage';
import { Text } from '../../components/ui/Text';
import { Grid } from '../../components/common/Grid';
import { CompactProductCard, CompactProductCardSkeleton } from '../../components/shop/CompactProductCard';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchShopCategory } from '@/api/shop';
import { getCategoryById, getProductsByCategory } from '../../data/mock';
import { colors } from '@/theme/colors';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShopCategory'>;

/**
 * Category landing: hero image + name, then every product that belongs to
 * the category (e.g. tap "Sunglasses" -> all sunglasses).
 */
export function ShopCategoryScreen({ route, navigation }: Props): React.ReactElement {
  const { categoryId } = route.params;
  const { data, loading, refreshing, refresh } = useAppQuery(
    () => fetchShopCategory(categoryId),
    () => ({
      category: getCategoryById(categoryId),
      items: getProductsByCategory(categoryId),
    }),
  );

  const category = data.category;

  const header = (
    <View style={styles.topBar}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text variant="h3" weight="bold" color={colors.text} numberOfLines={1}>
          {category?.name ?? 'Category'}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {category?.tagline ?? `${data.items.length} products`}
        </Text>
      </View>
      <CartButton />
    </View>
  );

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      {category?.image ? (
        <View style={styles.hero}>
          <SmartImage source={category.image} placeholderIcon={category.icon} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBadge}>
            <Text variant="overline" color={colors.brand[700]} weight="bold">
              {data.items.length} PRODUCTS
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ height: data.items.length ? 18 : 0 }} />
      {loading ? (
        <Grid columns={3} gap={10} data={[1, 2, 3, 4, 5, 6]} renderItem={() => <CompactProductCardSkeleton />} />
      ) : (
        <Grid
          columns={3}
          gap={10}
          data={data.items}
          renderItem={(p) => (
            <CompactProductCard
              product={p}
              onPress={(product) => navigation.navigate('Product', { productId: product.id })}
            />
          )}
        />
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 6,
  },
  hero: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.brand[50],
  },
  heroBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
});
