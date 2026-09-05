import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { HomeHeader } from '@/components/home/HomeHeader';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { Rail } from '@/components/ui/Rail';
import { EmptyState, SectionHeader } from '@/components/ui/Primitives';
import { CategoryTile, ItemCard, SpecialOfferCard, StoreCard, VibeCard } from '@/components/cards/Cards';
import { SkeletonCard, SkeletonHero, SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import type { Nav } from '@/navigation/types';
import {
  fetchBanners,
  fetchFoodCategories,
  fetchFoodNewStores,
  fetchFoodOffers,
  fetchFoodPopular,
  fetchFoodVibes,
  fetchRestaurants,
  fetchVibeItems,
} from '@/api/catalog';
import type { Banner, CatalogItem, FoodCategory, FoodVibe, Restaurant } from '@/types';

/**
 * Home for the Food module. The section order follows
 * `features/home/screens/modules/food_home_screen.dart`:
 * banner → categories → visit again → special offer → highlights → offers near
 * you → best reviewed → items you love → most popular → just for you → new on
 * Aurasure. Each section paints its own skeleton while loading.
 */

interface HomePayload {
  banners: Banner[];
  categories: FoodCategory[];
  vibes: FoodVibe[];
  restaurants: Restaurant[];
  popular: CatalogItem[];
  offers: CatalogItem[];
  newStores: Restaurant[];
}

export function HomeFoodScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite, favorites, online, checkHealth, module } = useSession();
  const [vibe, setVibe] = useState<FoodVibe | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const home = useQuery<HomePayload>(
    useCallback(async () => {
      const [banners, categories, vibes, restaurants, popular, offers, newStores] = await Promise.all([
        fetchBanners('food'),
        fetchFoodCategories(),
        fetchFoodVibes(),
        fetchRestaurants({ filter: 'all', limit: 12 }),
        fetchFoodPopular(12),
        fetchFoodOffers(12),
        fetchFoodNewStores(),
      ]);
      return { banners, categories, vibes, restaurants: restaurants.restaurants, popular, offers, newStores };
    }, []),
  );

  const vibeItems = useQuery<CatalogItem[]>(useCallback(async () => (vibe ? (await fetchVibeItems(vibe.id)).items : []), [vibe]), {
    enabled: Boolean(vibe),
  });

  const data = home.data;

  const outletOf = useCallback(
    (item: CatalogItem) => {
      const restaurant = data?.restaurants.find((row) => row.id === item.restaurantId);
      return {
        id: item.restaurantId ?? restaurant?.id ?? '',
        name: restaurant?.name ?? '',
        deliveryFee: restaurant?.deliveryFee ?? 0,
        minOrder: restaurant?.minOrder ?? 0,
        etaMinutes: restaurant?.deliveryTime ?? 30,
      };
    },
    [data?.restaurants],
  );

  /** "Visit again" = the kitchens behind the dishes you saved. */
  const visitAgain = useMemo(() => {
    if (!data || favorites.length === 0) return [];
    const savedRefs = new Set(favorites.filter((fav) => fav.module === 'food').map((fav) => fav.refId));
    const outletIds = new Set(
      [...data.popular, ...data.offers].filter((item) => savedRefs.has(item.id)).map((item) => item.restaurantId),
    );
    return data.restaurants.filter((restaurant) => outletIds.has(restaurant.id));
  }, [data, favorites]);

  const bestReviewed = useMemo(() => (data ? [...data.restaurants].sort((a, b) => b.rating - a.rating).slice(0, 8) : []), [data]);
  const offerStores = useMemo(() => (data ? data.restaurants.filter((row) => Boolean(row.promo || row.offer)).slice(0, 8) : []), [data]);
  const loved = useMemo(() => {
    if (!data) return [];
    const saved = new Set(favorites.filter((fav) => fav.module === 'food').map((fav) => fav.refId));
    const matches = [...data.popular, ...data.offers].filter((item) => saved.has(item.id));
    return matches.length > 0 ? matches : [];
  }, [data, favorites]);

  const openItem = (item: CatalogItem): void => navigation.navigate('Item', { module: 'food', id: item.id });

  const cardProps = (item: CatalogItem) => ({
    item,
    module: 'food' as const,
    qty: cart.qtyOf('food', item.id),
    favorite: isFavorite('food', item.id),
    onFavorite: () => void toggleFavorite('food', item.id),
    onOpen: () => openItem(item),
    onAdd: () => void actions.quickAdd('food', item, outletOf(item)),
    onInc: () => void actions.quickAdd('food', item, outletOf(item)),
    onDec: () => {
      const line = cart.linesFor('food').find((row) => row.refId === item.id);
      if (line) actions.dec('food', line.id, line.qty);
    },
  });

  const onBanner = (banner: Banner): void => {
    const target = banner.target;
    if (!target) {
      sheet.info(banner.title, banner.subtitle, 'megaphone');
      return;
    }
    if (target.kind === 'store') navigation.navigate('Outlet', { module: 'food', id: target.storeId });
    else if (target.kind === 'product') navigation.navigate('Item', { module: 'food', id: target.productId });
    else if (target.kind === 'category') {
      const category = data?.categories.find((row) => row.id === target.categoryId);
      navigation.navigate('Category', { module: 'food', id: target.categoryId, name: category?.name ?? 'Category' });
    } else navigation.navigate('Search', {});
  };

  const loading = home.loading && !data;

  return (
    <Screen
      scroll
      padded={false}
      scrollRef={scrollRef}
      onRefresh={() => {
        home.refresh();
        void checkHealth();
      }}
      refreshing={home.refreshing}
      headerBackground={c.primary}
      header={
        <HomeHeader
          module={module}
          greeting={greeting()}
          onSearch={() => navigation.navigate('Search', {})}
          onLocation={() => navigation.navigate('Location', { from: 'home' })}
          onBell={() => navigation.navigate('Notifications')}
          onCart={() => navigation.navigate('Cart')}
        />
      }
    >
      {online === false ? (
        <Pressable accessibilityRole="button" onPress={() => void checkHealth()} style={[styles.strip, { backgroundColor: c.warningBg }]}>
          <Icon name="wifiOff" size={14} color={c.warning} />
          <Text variant="caption" weight="semibold" color={c.warning} style={{ flex: 1 }}>
            {data ? 'Offline — showing the last menus that loaded. Tap to retry.' : 'Offline — no cached menus on this device yet. Tap to retry.'}
          </Text>
          <Icon name="refresh" size={14} color={c.warning} />
        </Pressable>
      ) : null}

      <View>
        {loading ? (
          <SkeletonHero height={168} />
        ) : home.error && !data ? (
          <ErrorState message={home.error.message} onRetry={home.refetch} />
        ) : (
          <BannerCarousel banners={data?.banners ?? []} onPress={onBanner} />
        )}
      </View>

      {loading ? (
        <View style={{ paddingTop: spacing.md, gap: spacing.lg }}>
          <SkeletonRail cardWidth={72} height={104} count={5} />
          <SkeletonRail cardWidth={168} height={230} count={3} />
          <SkeletonCard height={120} />
          <SkeletonList rows={3} thumb={52} />
          <SkeletonRail cardWidth={268} height={116} count={2} />
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          {data && data.categories.length > 0 ? (
            <Rail
              title="What are you craving?"
              subtitle="Pick a category to start"
              icon="grid"
              actionLabel="See all"
              onAction={() => navigation.navigate('SeeAll', { kind: 'items', title: 'All categories' })}
            >
              {data.categories.slice(0, 10).map((category) => (
                <CategoryTile key={category.id} category={category} compact onPress={() => navigation.navigate('Category', { module: 'food', id: category.id, name: category.name })} />
              ))}
              {data.categories.length > 10 ? (
                <CategoryTile
                  category={{ id: 'all', name: 'See all', icon: 'grid', sortOrder: 999 }}
                  compact
                  onPress={() => navigation.navigate('SeeAll', { kind: 'items', title: 'All categories' })}
                />
              ) : null}
            </Rail>
          ) : null}

          {visitAgain.length > 0 ? (
            <Rail title="Visit again" subtitle="Kitchens from your favourites" icon="history" actionLabel="All stores" onAction={() => navigation.navigate('SeeAll', { kind: 'restaurants', title: 'All restaurants' })}>
              {visitAgain.map((restaurant) => (
                <StoreCard
                  key={restaurant.id}
                  store={restaurant}
                  onPress={() => navigation.navigate('Outlet', { module: 'food', id: restaurant.id, name: restaurant.name })}
                  favorite={isFavorite('food', restaurant.id)}
                  onFavorite={() => void toggleFavorite('food', restaurant.id)}
                />
              ))}
            </Rail>
          ) : null}

          {data?.offers[0] ? (
            <View style={{ marginTop: spacing.section }}>
              <SectionHeader title="Special offer" subtitle="Limited-time price drops" icon="zap" />
              <SpecialOfferCard item={data.offers[0]} onPress={() => openItem(data.offers[0]!)} />
            </View>
          ) : null}

          {data && data.vibes.length > 0 ? (
            <Rail title="Highlights" subtitle="Order by mood" icon="sparkles">
              {data.vibes.map((row) => (
                <VibeCard
                  key={row.id}
                  vibe={row}
                  onPress={() => {
                    setVibe((prev) => (prev?.id === row.id ? null : row));
                  }}
                />
              ))}
            </Rail>
          ) : null}

          {vibe ? (
            <View style={{ marginTop: spacing.md, backgroundColor: c.surfaceHi, paddingBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.edge, paddingTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" weight="bold">
                    {vibe.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {vibe.tagline || 'Picked for this mood'}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setVibe(null)} hitSlop={8} style={{ padding: 6 }}>
                  <Icon name="x" size={16} color={c.textSecondary} />
                </Pressable>
              </View>
              {vibeItems.loading ? (
                <View style={{ paddingTop: spacing.sm }}>
                  <SkeletonRail cardWidth={168} height={230} count={3} />
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.edge, gap: 8, paddingTop: spacing.sm }}>
                  {(vibeItems.data ?? []).map((item) => (
                    <ItemCard key={item.id} {...cardProps(item)} width={168} />
                  ))}
                  {(vibeItems.data ?? []).length === 0 ? (
                    <EmptyState icon="utensils" title="No dishes in this vibe yet" subtitle="The menu for this mood is being prepared." compact />
                  ) : null}
                </ScrollView>
              )}
            </View>
          ) : null}

          {offerStores.length > 0 ? (
            <Rail title="Top offers near you" subtitle="Promos running right now" icon="percent">
              {offerStores.map((restaurant) => (
                <StoreCard key={restaurant.id} store={restaurant} onPress={() => navigation.navigate('Outlet', { module: 'food', id: restaurant.id, name: restaurant.name })} />
              ))}
            </Rail>
          ) : null}

          {bestReviewed.length > 0 ? (
            <Rail title="Best reviewed" subtitle="Highest rated around you" icon="starCheck">
              {bestReviewed.map((restaurant) => (
                <StoreCard key={restaurant.id} store={restaurant} onPress={() => navigation.navigate('Outlet', { module: 'food', id: restaurant.id, name: restaurant.name })} />
              ))}
            </Rail>
          ) : null}

          {data && data.restaurants.length > 0 ? (
            <Rail
              title="Closest to you"
              subtitle="Shortest drive first"
              icon="navigation"
              actionLabel="All stores"
              onAction={() => navigation.navigate('SeeAll', { kind: 'restaurants', title: 'All restaurants' })}
            >
              {[...data.restaurants]
                .sort((a, b) => a.deliveryTime - b.deliveryTime)
                .slice(0, 8)
                .map((restaurant) => (
                  <StoreCard
                    key={restaurant.id}
                    store={restaurant}
                    onPress={() => navigation.navigate('Outlet', { module: 'food', id: restaurant.id, name: restaurant.name })}
                    favorite={isFavorite('food', restaurant.id)}
                    onFavorite={() => void toggleFavorite('food', restaurant.id)}
                  />
                ))}
            </Rail>
          ) : null}

          {loved.length > 0 ? (
            <Rail title="Items you love" subtitle="From your favourites" icon="heart" actionLabel="Favourites" onAction={() => navigation.navigate('Favorites')}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {loved.slice(0, 10).map((item) => (
                  <ItemCard key={item.id} {...cardProps(item)} />
                ))}
              </View>
            </Rail>
          ) : null}

          {data && data.popular.length > 0 ? (
            <Rail title="Most popular right now" subtitle="What your city is ordering" icon="flame" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'popular', title: 'Most popular' })}>
              {data.popular.map((item) => (
                <ItemCard key={item.id} {...cardProps(item)} />
              ))}
            </Rail>
          ) : null}

          {data && data.offers.length > 1 ? (
            <Rail title="Just for you" subtitle="Discounts matched to your taste" icon="gift" actionLabel="Offers" onAction={() => navigation.navigate('SeeAll', { kind: 'offers', title: 'Offers near you' })}>
              {data.offers.slice(1).map((item) => (
                <ItemCard key={item.id} {...cardProps(item)} />
              ))}
            </Rail>
          ) : null}

          {data && data.newStores.length > 0 ? (
            <Rail title="New on Aurasure" subtitle="Recently joined kitchens" icon="sparkles" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'new', title: 'New on Aurasure' })}>
              {data.newStores.map((restaurant) => (
                <StoreCard key={restaurant.id} store={restaurant} onPress={() => navigation.navigate('Outlet', { module: 'food', id: restaurant.id, name: restaurant.name })} />
              ))}
            </Rail>
          ) : null}

          {home.error ? (
            <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.lg }}>
              <EmptyState icon="wifiOff" title="Couldn't load the menus" subtitle={home.error.message} actionLabel="Try again" onAction={home.refresh} />
            </View>
          ) : null}

          {data && data.restaurants.length === 0 && !home.error ? (
            <EmptyState icon="store" title="No kitchens open nearby" subtitle="Try a different address or check back a little later." actionLabel="Change location" onAction={() => navigation.navigate('Location', { from: 'home' })} />
          ) : null}

          <View style={{ height: spacing.md }} />
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('SeeAll', { kind: 'restaurants', title: 'All restaurants' })}
            style={({ pressed }) => [styles.seeAll, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text variant="subtitle" weight="semibold" color={c.primary}>
              Browse all restaurants
            </Text>
            <Icon name="arrowRight" size={16} color={c.primary} />
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning — breakfast is on' : hour < 17 ? 'Good afternoon — lunch nearby' : 'Good evening — dinner time';
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.edge, paddingVertical: 8 },
  seeAll: {
    marginHorizontal: spacing.edge,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
