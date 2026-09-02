import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { CartButton } from '../../components/ui/CartButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SeeAllArrow } from '../../components/ui/SeeAllArrow';
import { Grid } from '../../components/common/Grid';
import { ShopCategoryRow } from '../../components/shop/ShopCategoryCard';
import { BannerCarousel, BannerCarouselSkeleton } from '../../components/shop/BannerCarousel';
import { RecommendedStoreCard, PopularStoreCard, StoreGridCard } from '../../components/shop/StoreCard';
import { CompactProductCard, CompactProductCardSkeleton } from '../../components/shop/CompactProductCard';
import { CategoryTile } from '../../components/shop/CategoryTile';
import { layout } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import { useAppQuery } from '../../hooks/useAppQuery';
import { buildShopCounts, fetchShopHome } from '@/api/shop';
import {
  getBannersByModule,
  getNicheStores,
  getPopularProducts,
  getRecommendedStores,
  getSpecialOfferProducts,
  getProductsByCategory,
  getProductsByStore,
  shopCategories,
  shopProducts,
  shopStores,
  userProfile,
} from '../../data/mock';
import type {
  Banner,
  BannerTarget,
  Product,
  ShopCategory,
  ShopStore,
} from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { useApp } from '@/context/AppContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShopHome'>;

export function ShopHomeScreen({ navigation }: Props): React.ReactElement {
  const { data, loading, refreshing, refresh } = useAppQuery(
    fetchShopHome,
    () => ({
      banners: getBannersByModule('shop'),
      categories: shopCategories,
      stores: shopStores,
      popular: getPopularProducts(),
      offers: getSpecialOfferProducts(),
      recommended: getRecommendedStores(),
      niche: getNicheStores(),
      counts: buildShopCounts(shopProducts),
      user: userProfile,
    }),
  );
  const { city } = useApp();

  const firstName = (data.user?.name ?? userProfile.name).split(' ')[0] ?? 'there';

  const openProduct = (p: Product): void => navigation.navigate('Product', { productId: p.id });
  const openStore = (s: ShopStore): void => navigation.navigate('Store', { storeId: s.id });
  const openCategory = (c: ShopCategory): void => navigation.navigate('ShopCategory', { categoryId: c.id });
  const openSeeAll = (
    mode: 'popular' | 'special' | 'recommended' | 'stores',
    title: string,
  ): void => navigation.navigate('SeeAll', { mode, title });

  const openBanner = (banner: Banner): void => {
    const target: BannerTarget | undefined = banner.target;
    if (!target) return;
    switch (target.kind) {
      case 'search':
        navigation.navigate('Search');
        break;
      case 'product':
        navigation.navigate('Product', { productId: target.productId });
        break;
      case 'category':
        navigation.navigate('ShopCategory', { categoryId: target.categoryId });
        break;
      case 'store':
        navigation.navigate('Store', { storeId: target.storeId });
        break;
    }
  };

  const popularProducts = data.popular.slice(0, 6);
  const offerProducts = data.offers.slice(0, 6);
  const categoryItems = data.categories.filter((c) => c.image);
  const storesWithCount = data.stores.map((s) => ({
    store: s,
    count: data.counts.store[s.id] ?? getProductsByStore(s.id).length,
  }));
  // Recommended rail = top picks + niche stores that aren't already listed.
  const railStores = [
    ...data.recommended,
    ...data.niche.filter((n) => !data.recommended.some((r) => r.id === n.id)),
  ];

  return (
    <Screen
      title={`Hi ${firstName}`}
      subtitle={city ? `Best deals delivering to ${city}` : 'Discover the best deals in Raipur'}
      headerRight={<CartButton />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {/* 1 · Banners - right-side swipeable carousel */}
      {loading ? (
        <BannerCarouselSkeleton />
      ) : (
        <BannerCarousel banners={data.banners} onPress={openBanner} height={150} />
      )}

      <View style={{ height: 18 }} />
      {/* 2 · Categories - right-side scrolling row */}
      <ShopCategoryRow items={data.categories} onSelect={openCategory} />

      <View style={{ height: 26 }} />
      {/* 3 · Recommended stores (+ niche) - right side arrow -> more stores */}
      <SectionHeader
        title="Recommended stores"
        subtitle="Hand-picked & niche stores near you"
        action={<SeeAllArrow onPress={() => openSeeAll('recommended', 'Recommended stores')} />}
      />
      {loading ? (
        <View style={{ height: 176 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: layout.contentHorizontalPadding, gap: 8 }}
          style={{ marginHorizontal: -layout.contentHorizontalPadding }}
        >
          {railStores.map((s) => (
            <RecommendedStoreCard key={s.id} store={s} onPress={openStore} />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 26 }} />
      {/* 4 · Most popular products - 3 across (2 rows) + see-all arrow */}
      <SectionHeader
        title="Most popular products"
        subtitle="Bought by hundreds this week"
        action={<SeeAllArrow onPress={() => openSeeAll('popular', 'Most popular products')} />}
      />
      {loading ? (
        <Grid columns={3} gap={8} data={[1, 2, 3, 4, 5, 6]} renderItem={() => <CompactProductCardSkeleton />} />
      ) : (
        <Grid
          columns={3}
          gap={8}
          data={popularProducts}
          renderItem={(p) => <CompactProductCard product={p} onPress={openProduct} />}
        />
      )}

      <View style={{ height: 26 }} />
      {/* 5 · Popular stores - right-side scrolling (name, road, house, city) */}
      <SectionHeader
        title="Popular stores"
        subtitle="Top rated across Raipur"
        action={<SeeAllArrow onPress={() => openSeeAll('stores', 'Popular stores')} />}
      />
      {loading ? (
        <View style={{ height: 96 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: layout.contentHorizontalPadding, gap: 8 }}
          style={{ marginHorizontal: -layout.contentHorizontalPadding }}
        >
          {data.stores.map((s) => (
            <PopularStoreCard key={s.id} store={s} onPress={openStore} />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 26 }} />
      {/* 6 · Special offers - same layout as popular products */}
      <SectionHeader
        title="Special offers"
        subtitle="Deals that end soon"
        action={<SeeAllArrow onPress={() => openSeeAll('special', 'Special offers')} />}
      />
      {loading ? (
        <Grid columns={3} gap={8} data={[1, 2, 3, 4, 5, 6]} renderItem={() => <CompactProductCardSkeleton />} />
      ) : (
        <Grid
          columns={3}
          gap={8}
          data={offerProducts}
          renderItem={(p) => <CompactProductCard product={p} onPress={openProduct} />}
        />
      )}

      <View style={{ height: 26 }} />
      {/* 7 · Browse categories - big image tiles, right-side scroll */}
      <SectionHeader title="Shop by category" subtitle="Explore what you love" />
      {loading ? (
        <View style={{ height: 116 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: layout.contentHorizontalPadding, gap: 8 }}
          style={{ marginHorizontal: -layout.contentHorizontalPadding }}
        >
          {categoryItems.map((c) => (
            <CategoryTile
              key={c.id}
              category={c}
              itemCount={data.counts.category[c.id] ?? getProductsByCategory(c.id).length}
              onPress={openCategory}
            />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 26 }} />
      {/* 8 · All stores - tap a store to see only its items */}
      <SectionHeader
        title="All stores"
        subtitle={`${data.stores.length} stores delivering to ${city ?? 'you'}`}
        action={<SeeAllArrow onPress={() => openSeeAll('stores', 'All stores')} />}
      />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <View style={{ height: 210, borderRadius: 16, backgroundColor: colors.brand[50] }} />} />
      ) : (
        <Grid
          data={storesWithCount}
          renderItem={({ store, count }) => (
            <StoreGridCard store={store} itemCount={count} onPress={openStore} />
          )}
        />
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({});
