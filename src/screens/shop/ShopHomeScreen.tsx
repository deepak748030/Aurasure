import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { CartButton } from '../../components/ui/CartButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { BannerCard } from '../../components/common/BannerCard';
import { Grid } from '../../components/common/Grid';
import { ShopCategoryRow } from '../../components/shop/ShopCategoryCard';
import { ProductCard, ProductCardSkeleton } from '../../components/shop/ProductCard';
import { useMockQuery } from '../../hooks/useMockQuery';
import { getBannersByModule, products, shopCategories, userProfile } from '../../data/mock';
import type { Product, ShopCategory } from '../../types';
import type { ShopStackParamList } from '../../navigation/types';
import { switchTab } from '@/navigation/RootNavigation';

type Props = NativeStackScreenProps<ShopStackParamList, 'ShopHome'>;

export function ShopHomeScreen({ navigation }: Props): React.ReactElement {
  const { data, loading, refreshing, refresh } = useMockQuery(() => ({
    banners: getBannersByModule('shop'),
    products,
    categories: shopCategories,
  }));
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);

  const filtered = activeCat
    ? data.products.filter((p) => p.categoryId === activeCat)
    : data.products;

  const openProduct = (p: Product): void => navigation.navigate('Product', { productId: p.id });
  const pickCategory = (c: ShopCategory): void => setActiveCat((prev) => (prev === c.id ? undefined : c.id));

  const firstName = userProfile.name.split(' ')[0] ?? userProfile.name;

  return (
    <Screen
      title={`Hi ${firstName}`}
      subtitle="Discover the best deals"
      headerRight={<CartButton />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <BannerCard
        title={data.banners[0]?.title ?? 'Big Electronics Sale'}
        subtitle={data.banners[0]?.subtitle}
        badge={data.banners[0]?.badge}
        image={data.banners[0]?.image ?? null}
        height={150}
        onPress={() => switchTab('Search')}
      />

      <View style={{ height: 18 }} />
      <ShopCategoryRow items={data.categories} activeId={activeCat} onSelect={pickCategory} />

      <View style={{ height: 22 }} />
      <SectionHeader title="Trending now" subtitle={`${filtered.length} products`} />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <ProductCardSkeleton />} />
      ) : (
        <Grid data={filtered} renderItem={(p) => <ProductCard product={p} onPress={openProduct} />} />
      )}

      <View style={{ height: 26 }} />
      <BannerCard
        title={data.banners[1]?.title ?? 'Aura Minimal Watch'}
        subtitle={data.banners[1]?.subtitle}
        badge={data.banners[1]?.badge}
        image={data.banners[1]?.image ?? null}
        height={132}
        onPress={() => navigation.navigate('Product', { productId: 'p4' })}
      />

      <View style={{ height: 26 }} />
      <SectionHeader title="Just for you" />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <ProductCardSkeleton />} />
      ) : (
        <Grid data={data.products.filter((p) => p.isTrending)} renderItem={(p) => <ProductCard product={p} onPress={openProduct} />} />
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
