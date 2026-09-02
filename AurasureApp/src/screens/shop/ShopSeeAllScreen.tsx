import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { CartButton } from '../../components/ui/CartButton';
import { Text } from '../../components/ui/Text';
import { Grid } from '../../components/common/Grid';
import { CompactProductCard, CompactProductCardSkeleton } from '../../components/shop/CompactProductCard';
import { StoreGridCard } from '../../components/shop/StoreCard';
import { CompactFoodCard, CompactFoodCardSkeleton } from '../../components/food/CompactFoodCard';
import { RestaurantCard, RestaurantCardSkeleton } from '../../components/food/RestaurantCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchFoodSeeAll } from '@/api/food';
import { buildShopCounts, fetchShopSeeAll } from '@/api/shop';
import {
  getNewRestaurants,
  getPopularFoodItems,
  getSpecialFoodItems,
  getVibeItems,
  restaurants,
} from '../../data/food';
import {
  getNicheStores,
  getPopularProducts,
  getProductsByStore,
  getRecommendedStores,
  getSpecialOfferProducts,
  shopProducts,
  shopStores,
} from '../../data/shop';
import { colors } from '@/theme/colors';
import type { FoodItem, Product, Restaurant, ShopStore } from '@/types';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'SeeAll'>;

type Mode = Props['route']['params']['mode'];

type Result =
  | { kind: 'shopProducts'; data: Product[] }
  | { kind: 'shopStores'; data: ShopStore[]; countByStore: Record<string, number> }
  | { kind: 'foodItems'; data: FoodItem[] }
  | { kind: 'foodStores'; data: Restaurant[] };

function produce(mode: Mode, vibeId?: string): Result {
  switch (mode) {
    case 'popular':
      return { kind: 'shopProducts', data: getPopularProducts() };
    case 'special':
      return { kind: 'shopProducts', data: getSpecialOfferProducts() };
    case 'recommended': {
      const recommended = getRecommendedStores();
      return {
        kind: 'shopStores',
        data: [...recommended, ...getNicheStores().filter((n) => !recommended.some((r) => r.id === n.id))],
        countByStore: buildShopCounts(shopProducts).store,
      };
    }
    case 'stores':
      return { kind: 'shopStores', data: shopStores, countByStore: buildShopCounts(shopProducts).store };
    case 'foodPopular':
      return { kind: 'foodItems', data: getPopularFoodItems() };
    case 'foodOffers':
      return { kind: 'foodItems', data: getSpecialFoodItems() };
    case 'foodVibes':
      return { kind: 'foodItems', data: vibeId ? getVibeItems(vibeId) : getPopularFoodItems() };
    case 'foodNew':
      return { kind: 'foodStores', data: getNewRestaurants() };
    case 'foodNearby':
      return { kind: 'foodStores', data: restaurants };
  }
}

async function fetchResult(mode: Mode, vibeId?: string): Promise<Result> {
  switch (mode) {
    case 'popular':
      return fetchShopSeeAll('popular');
    case 'special':
      return fetchShopSeeAll('special');
    case 'recommended':
      return fetchShopSeeAll('recommended');
    case 'stores':
      return fetchShopSeeAll('stores');
    case 'foodPopular':
    case 'foodOffers':
    case 'foodVibes':
    case 'foodNew':
    case 'foodNearby':
      return fetchFoodSeeAll(mode, vibeId);
  }
}

/**
 * "See all" landing page reached from the round arrows on both home screens:
 * a full grid of popular products, offers, food items or stores.
 */
export function ShopSeeAllScreen({ route, navigation }: Props): React.ReactElement {
  const { mode, title, vibeId } = route.params;
  const { data, loading, refreshing, refresh } = useAppQuery(
    () => fetchResult(mode, vibeId),
    () => produce(mode, vibeId),
  );
  const kind = data.kind;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text variant="h3" weight="bold" color={colors.text} style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      <CartButton />
    </View>
  );

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      <SectionHeader
        title={title}
        subtitle={`${data.data.length} ${kind === 'shopStores' || kind === 'foodStores' ? 'stores' : 'items'}`}
      />

      {loading ? (
        kind === 'shopStores' ? (
          <Grid
            data={[1, 2, 3, 4]}
            renderItem={() => <View style={{ height: 210, borderRadius: 16, backgroundColor: colors.brand[50] }} />}
          />
        ) : kind === 'foodStores' ? (
          <Grid data={[1, 2, 3, 4]} renderItem={() => <RestaurantCardSkeleton />} />
        ) : (
          <Grid columns={3} gap={8} data={[1, 2, 3, 4, 5, 6]} renderItem={() => (kind === 'foodItems' ? <CompactFoodCardSkeleton /> : <CompactProductCardSkeleton />)} />
        )
      ) : kind === 'shopStores' ? (
        <Grid
          data={(data.data as ShopStore[]).map((s) => ({ store: s, count: data.countByStore[s.id] ?? getProductsByStore(s.id).length }))}
          renderItem={({ store, count }) => (
            <StoreGridCard
              store={store}
              itemCount={count}
              onPress={(s) => navigation.navigate('Store', { storeId: s.id })}
            />
          )}
        />
      ) : kind === 'foodStores' ? (
        <Grid
          data={data.data as Restaurant[]}
          renderItem={(r) => (
            <RestaurantCard restaurant={r} onPress={(rest) => navigation.navigate('Restaurant', { restaurantId: rest.id })} />
          )}
        />
      ) : kind === 'foodItems' ? (
        <Grid
          columns={3}
          gap={8}
          data={data.data as FoodItem[]}
          renderItem={(item) => (
            <CompactFoodCard
              item={item}
              onPress={(dish) => navigation.navigate('Restaurant', { restaurantId: dish.restaurantId })}
            />
          )}
        />
      ) : (
        <Grid
          columns={3}
          gap={8}
          data={data.data as Product[]}
          renderItem={(p) => (
            <CompactProductCard product={p} onPress={(product) => navigation.navigate('Product', { productId: product.id })} />
          )}
        />
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
