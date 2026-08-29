import React from 'react';
import { View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Grid } from '../../components/common/Grid';
import { DishCard } from '../../components/food/DishCard';
import { ProductCard } from '../../components/shop/ProductCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMockQuery } from '../../hooks/useMockQuery';
import { useApp } from '@/context/AppContext';
import { foodItems, getProductById } from '../../data/mock';
import { openHomeRoute, switchTab } from '@/navigation/RootNavigation';
import type { FoodItem, Product } from '@/types';

/**
 * Wishlist for whichever module is active: liked dishes in Food, liked products
 * in E-commerce. The two lists are kept apart so the tab always shows relevant
 * items, and taps hand over to the Home stack that owns the detail screens.
 */
export function LikesScreen(): React.ReactElement {
  const { module, likesFor } = useApp();
  const ids = likesFor(module);

  const { loading, refreshing, refresh } = useMockQuery(() => ids.length);

  // Derived from the live wishlist (not from the mocked query) so un-liking an
  // item here removes it immediately instead of on the next refresh.
  const dishes = module === 'food' ? foodItems.filter((f) => ids.includes(f.id)) : [];
  const products =
    module === 'shop'
      ? ids.map((id) => getProductById(id)).filter((p): p is Product => p != null)
      : [];

  const openDish = (item: FoodItem): void => openHomeRoute('Restaurant', { restaurantId: item.restaurantId });
  const openProduct = (item: Product): void => openHomeRoute('Product', { productId: item.id });
  const goBrowse = (): void => switchTab('Home');

  const total = dishes.length + products.length;

  return (
    <Screen
      title="Your likes"
      subtitle={total > 0 ? `${total} saved in ${module === 'food' ? 'Food' : 'Shopping'}` : 'Nothing saved yet'}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading ? (
        [1, 2].map((k) => (
          <View key={k} style={{ marginBottom: 12 }}>
            <Skeleton height={module === 'food' ? 108 : 200} radius={6} />
          </View>
        ))
      ) : total === 0 ? (
        <EmptyState
          icon="heart"
          title="No likes yet"
          subtitle={`Tap the heart on any ${module === 'food' ? 'dish' : 'product'} to save it here.`}
          actionLabel={module === 'food' ? 'Browse food' : 'Browse store'}
          onAction={goBrowse}
        />
      ) : module === 'food' ? (
        <>
          <SectionHeader title="Saved dishes" subtitle={`${dishes.length} items`} />
          {dishes.map((d) => (
            <View key={d.id} style={{ marginBottom: 10 }}>
              <DishCard item={d} onPress={openDish} />
            </View>
          ))}
        </>
      ) : (
        <>
          <SectionHeader title="Saved products" subtitle={`${products.length} items`} />
          <Grid data={products} renderItem={(p) => <ProductCard product={p} onPress={openProduct} />} />
        </>
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
