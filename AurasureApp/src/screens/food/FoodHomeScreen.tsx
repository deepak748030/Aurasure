import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { CartButton } from '../../components/ui/CartButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SeeAllArrow } from '../../components/ui/SeeAllArrow';
import { SearchBar } from '../../components/ui/SearchBar';
import { Chip } from '../../components/ui/Chip';
import { BannerCard } from '../../components/common/BannerCard';
import { Grid } from '../../components/common/Grid';
import { FoodHero } from '../../components/food/FoodHero';
import { FoodCategoryCircles } from '../../components/food/FoodCategoryCircles';
import { JustForYouTile } from '../../components/food/JustForYouTile';
import { FoodStoreRailCard } from '../../components/food/FoodStoreRailCard';
import { CompactFoodCard, CompactFoodCardSkeleton } from '../../components/food/CompactFoodCard';
import { RestaurantCard, RestaurantCardSkeleton } from '../../components/food/RestaurantCard';
import { layout } from '@/theme/tokens';
import { colors } from '@/theme/colors';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchFoodHome } from '@/api/food';
import {
  foodCategories,
  foodVibes,
  getBannersByModule,
  getNewRestaurants,
  getPopularFoodItems,
  getSpecialFoodItems,
  restaurants,
  userProfile,
} from '../../data/mock';
import { Images } from '@/assets';
import type { Banner, BannerTarget, FoodItem, FoodVibe, Restaurant } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { useApp } from '@/context/AppContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodHome'>;

type FilterKey = 'all' | 'new' | 'popular' | 'top';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'Newly joined' },
  { key: 'popular', label: 'Popular' },
  { key: 'top', label: 'Top rated' },
];

export function FoodHomeScreen({ navigation }: Props): React.ReactElement {
  const { data, loading, refreshing, refresh } = useAppQuery(
    fetchFoodHome,
    () => ({
      banners: getBannersByModule('food'),
      categories: foodCategories,
      vibes: foodVibes,
      restaurants,
      newStores: getNewRestaurants(),
      popular: getPopularFoodItems(),
      offers: getSpecialFoodItems(),
      user: userProfile,
    }),
  );
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<FilterKey>('all');
  const { city } = useApp();

  const firstName = (data.user?.name ?? userProfile.name).split(' ')[0] ?? 'there';

  const openRestaurant = (r: Restaurant): void => navigation.navigate('Restaurant', { restaurantId: r.id });
  const openDish = (d: FoodItem): void => navigation.navigate('Restaurant', { restaurantId: d.restaurantId });
  const openVibe = (v: FoodVibe): void => navigation.navigate('SeeAll', { mode: 'foodVibes', title: v.name, vibeId: v.id });
  const openSeeAll = (mode: 'foodPopular' | 'foodOffers' | 'foodNew' | 'foodNearby', title: string): void =>
    navigation.navigate('SeeAll', { mode, title });

  const openBanner = (banner: Banner): void => {
    const target: BannerTarget | undefined = banner.target;
    if (!target) return;
    if (target.kind === 'search') navigation.navigate('Search');
    else if (target.kind === 'store') navigation.navigate('Restaurant', { restaurantId: target.storeId });
    else if (target.kind === 'product') navigation.navigate('Product', { productId: target.productId });
    else if (target.kind === 'category') navigation.navigate('ShopCategory', { categoryId: target.categoryId });
  };

  const filteredRestaurants = data.restaurants.filter((r) => {
    if (activeCat && !r.categoryIds.includes(activeCat)) return false;
    switch (filter) {
      case 'new':
        return Boolean(r.isNewlyJoined);
      case 'popular':
        return Boolean(r.isPopular);
      case 'top':
        return r.rating >= 4.7;
      default:
        return true;
    }
  });

  const popularItems = data.popular.slice(0, 9);
  const offerItems = data.offers.slice(0, 9);

  return (
    <Screen
      title={`Hi ${firstName}`}
      subtitle={city ? `Craving something? Delivering to ${city}` : 'What are you craving today?'}
      headerRight={<CartButton />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {/* Search bar above the hero (tap opens full search) */}
      <Pressable onPress={() => navigation.navigate('Search')} accessibilityRole="button">
        <View pointerEvents="none">
          <SearchBar value="" onChangeText={() => undefined} placeholder='Search for "Biryani"' />
        </View>
      </Pressable>

      <View style={{ height: 14 }} />
      {/* Hero GIF with search bar right behind it + quick features */}
      <FoodHero
        gif={{ kind: 'asset', source: Images.heroFoodGif }}
        badge="FOOD FEST"
        title="30 minutes or it's free"
        subtitle="Hot & fresh, right to your door"
        onOrder={() => navigation.navigate('Search')}
      />

      <View style={{ height: 22 }} />
      {/* Image-based category circles (filter) */}
      <FoodCategoryCircles
        items={data.categories}
        activeId={activeCat}
        onSelect={(id) => setActiveCat((prev) => (prev === id ? undefined : id))}
      />

      <View style={{ height: 26 }} />
      {/* Just for You - big collection tiles */}
      <SectionHeader
        title="Just for You"
        subtitle="Curated collections"
        action={<SeeAllArrow onPress={() => openSeeAll('foodPopular', 'Popular items')} />}
      />
      <Grid columns={3} gap={5} data={data.vibes} renderItem={(v) => <JustForYouTile vibe={v} onPress={openVibe} />} />

      <View style={{ height: 26 }} />
      {/* New on Aurasure - freshly added stores */}
      <SectionHeader
        title="New on Aurasure"
        subtitle="Freshly Added Stores"
        action={<SeeAllArrow onPress={() => openSeeAll('foodNew', 'New stores')} />}
      />
      {loading ? (
        <View style={{ height: 216 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: layout.contentHorizontalPadding, gap: 8 }}
          style={{ marginHorizontal: -layout.contentHorizontalPadding }}
        >
          {data.newStores.map((r) => (
            <FoodStoreRailCard key={r.id} restaurant={r} onPress={openRestaurant} />
          ))}
        </ScrollView>
      )}

      <View style={{ height: 26 }} />
      {/* Restaurants - filter chips + cards */}
      <SectionHeader title="Restaurants" subtitle={`${filteredRestaurants.length} places near you`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.contentHorizontalPadding, gap: 8 }}
        style={{ marginHorizontal: -layout.contentHorizontalPadding }}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            activeColor={colors.food[600]}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </ScrollView>
      <View style={{ height: 14 }} />
      {loading ? (
        <Grid data={[1, 2, 3, 4]} renderItem={() => <RestaurantCardSkeleton />} />
      ) : (
        <Grid data={filteredRestaurants} renderItem={(r) => <RestaurantCard restaurant={r} onPress={openRestaurant} />} />
      )}

      <View style={{ height: 26 }} />
      <BannerCard
        title={data.banners[0]?.title ?? 'Crave something good?'}
        subtitle={data.banners[0]?.subtitle}
        badge={data.banners[0]?.badge}
        image={data.banners[0]?.image ?? null}
        height={132}
        onPress={() => navigation.navigate('Search')}
      />

      <View style={{ height: 26 }} />
      {/* Best stores nearby */}
      <SectionHeader
        title="Best Stores Nearby"
        subtitle="Ratings & distance picked for you"
        action={<SeeAllArrow onPress={() => openSeeAll('foodNearby', 'Best stores nearby')} />}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: layout.contentHorizontalPadding, gap: 8 }}
        style={{ marginHorizontal: -layout.contentHorizontalPadding }}
      >
        {data.restaurants.map((r) => (
          <FoodStoreRailCard key={r.id} restaurant={r} onPress={openRestaurant} />
        ))}
      </ScrollView>

      <View style={{ height: 26 }} />
      {/* Most Popular Items */}
      <SectionHeader
        title="Most Popular Items"
        subtitle="Ordered again & again"
        icon="flame"
        action={<SeeAllArrow onPress={() => openSeeAll('foodPopular', 'Most popular items')} />}
      />
      {loading ? (
        <Grid columns={3} gap={5} data={[1, 2, 3, 4, 5, 6, 7, 8, 9]} renderItem={() => <CompactFoodCardSkeleton />} />
      ) : (
        <Grid
          columns={3}
          gap={5}
          data={popularItems}
          renderItem={(item) => <CompactFoodCard item={item} onPress={openDish} />}
        />
      )}

      <View style={{ height: 26 }} />
      {/* Special Offer - yellow band */}
      <View style={{ marginHorizontal: -layout.contentHorizontalPadding, paddingHorizontal: layout.contentHorizontalPadding, backgroundColor: '#FFF8DF', paddingTop: 16, paddingBottom: 18 }}>
        <SectionHeader
          title="Special Offer"
          subtitle="Deals that end soon"
          icon="badgePercent"
          action={<SeeAllArrow onPress={() => openSeeAll('foodOffers', 'Special offers')} />}
        />
        {loading ? (
          <Grid columns={3} gap={5} data={[1, 2, 3, 4, 5, 6, 7, 8, 9]} renderItem={() => <CompactFoodCardSkeleton />} />
        ) : (
          <Grid
            columns={3}
            gap={5}
            data={offerItems}
            renderItem={(item) => <CompactFoodCard item={item} onPress={openDish} />}
          />
        )}
      </View>
      <View style={{ height: 8 }} />
    </Screen>
  );
}
