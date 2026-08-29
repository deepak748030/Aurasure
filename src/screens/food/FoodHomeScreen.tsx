import React, { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { CartButton } from '../../components/ui/CartButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { BannerCard } from '../../components/common/BannerCard';
import { Grid } from '../../components/common/Grid';
import { FoodCategoryPills } from '../../components/food/FoodCategoryPills';
import { RestaurantCard, RestaurantCardSkeleton } from '../../components/food/RestaurantCard';
import { DishCard, DishCardSkeleton } from '../../components/food/DishCard';
import { useMockQuery } from '../../hooks/useMockQuery';
import {
  foodCategories,
  foodItems,
  getBannersByModule,
  restaurants,
  userProfile,
} from '../../data/mock';
import type { FoodStackParamList } from '../../navigation/types';
import { switchTab } from '@/navigation/RootNavigation';
import type { FoodItem, Restaurant } from '../../types';

type Props = NativeStackScreenProps<FoodStackParamList, 'FoodHome'>;

export function FoodHomeScreen({ navigation }: Props): React.ReactElement {
  const { data, loading, refreshing, refresh } = useMockQuery(() => ({
    banners: getBannersByModule('food'),
    restaurants,
    bestsellers: foodItems.filter((d) => d.isBestseller).slice(0, 4),
  }));
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);

  const filtered = activeCat
    ? data.restaurants.filter((r) => r.categoryIds.includes(activeCat))
    : data.restaurants;

  const openRestaurant = (r: Restaurant): void => navigation.navigate('Restaurant', { restaurantId: r.id });
  const openDish = (d: FoodItem): void => navigation.navigate('Restaurant', { restaurantId: d.restaurantId });

  const firstName = userProfile.name.split(' ')[0] ?? userProfile.name;

  return (
    <Screen
      title={`Hi ${firstName}`}
      subtitle="What are you craving today?"
      headerRight={<CartButton />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <BannerCard
        title={data.banners[0]?.title ?? 'Crave something good?'}
        subtitle={data.banners[0]?.subtitle}
        badge={data.banners[0]?.badge}
        image={data.banners[0]?.image ?? null}
        height={150}
        onPress={() => switchTab('Search')}
      />

      <View style={{ height: 18 }} />
      <FoodCategoryPills
        items={foodCategories}
        activeId={activeCat}
        onSelect={(id) => setActiveCat((prev) => (prev === id ? undefined : id))}
      />

      <View style={{ height: 22 }} />
      <SectionHeader title="Popular near you" subtitle={`${filtered.length} places`} />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <RestaurantCardSkeleton />} />
      ) : (
        <Grid
          data={filtered}
          renderItem={(r) => <RestaurantCard restaurant={r} onPress={openRestaurant} />}
        />
      )}

      <View style={{ height: 26 }} />
      <BannerCard
        title={data.banners[1]?.title ?? 'Aurora Bistro'}
        subtitle={data.banners[1]?.subtitle}
        badge={data.banners[1]?.badge}
        image={data.banners[1]?.image ?? null}
        height={132}
        onPress={() => navigation.navigate('Restaurant', { restaurantId: 'r_aurora' })}
      />

      <View style={{ height: 26 }} />
      <SectionHeader title="Bestsellers" subtitle="Loved by Raipur" />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <DishCardSkeleton />} />
      ) : (
        <Grid data={data.bestsellers} renderItem={(d) => <DishCard item={d} onPress={openDish} />} />
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
