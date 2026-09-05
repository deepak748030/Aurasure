import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { HomeHeader } from '@/components/home/HomeHeader';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { FlashSaleTimer } from '@/components/home/FlashSaleTimer';
import { Rail } from '@/components/ui/Rail';
import { EmptyState, SectionHeader, Tag } from '@/components/ui/Primitives';
import { CategoryTile, ItemCard, SpecialOfferCard, StoreCard } from '@/components/cards/Cards';
import { SkeletonCard, SkeletonHero, SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { groupBrands } from '@/lib/brands';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { discountPercent, money } from '@/lib/format';
import type { Nav } from '@/navigation/types';
import {
  fetchBanners,
  fetchProducts,
  fetchShopCategories,
  fetchShopOffers,
  fetchShopPopular,
  fetchStores,
  fetchStore,
} from '@/api/catalog';
import type { Banner, CatalogItem, ShopStore } from '@/types';

/**
 * Home for the Shop module. Section order follows
 * `features/home/screens/modules/shop_home_screen.dart`:
 * banner → categories → visit again → recommended stores → most popular →
 * flash sale → highlights → popular stores → special offer → products by
 * category → just for you → items you love → new on Aurasure.
 */

interface ShopHomePayload {
  banners: Banner[];
  categories: { id: string; name: string; icon: string; image: import('@/types').ImageRef | null; tagline?: string; sortOrder: number }[];
  recommended: ShopStore[];
  popularStores: ShopStore[];
  newStores: ShopStore[];
  popular: CatalogItem[];
  offers: CatalogItem[];
  trending: CatalogItem[];
  fresh: CatalogItem[];
}

export function HomeShopScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite, favorites, online, checkHealth, module } = useSession();

  const home = useQuery<ShopHomePayload>(
    useCallback(async () => {
      const [banners, categories, recommended, popularStores, popular, offers, trending, fresh, newStores] = await Promise.all([
        fetchBanners('shop'),
        fetchShopCategories(),
        fetchStores({ recommended: true, limit: 12 }),
        fetchStores({ popular: true, limit: 12 }),
        fetchShopPopular(12),
        fetchShopOffers(12),
        fetchProducts({ trending: true, limit: 12 }),
        fetchProducts({ isNew: true, limit: 12 }),
        fetchStores({ niche: true, limit: 12 }),
      ]);
      return { banners, categories, recommended, popularStores, newStores, popular, offers, trending, fresh };
    }, []),
  );

  const data = home.data;

  const outletOf = useCallback(
    (product: CatalogItem) => {
      const store = [...(data?.recommended ?? []), ...(data?.popularStores ?? [])].find((row) => row.id === product.storeId);
      return {
        id: product.storeId ?? store?.id ?? '',
        name: store?.name ?? '',
        deliveryFee: store?.deliveryFee ?? 0,
        minOrder: store?.minOrder ?? 0,
        etaMinutes: store?.deliveryMins ?? 40,
      };
    },
    [data?.recommended, data?.popularStores],
  );

  const visitAgain = useMemo(() => {
    if (!data || favorites.length === 0) return [];
    const savedRefs = new Set(favorites.filter((fav) => fav.module === 'shop').map((fav) => fav.refId));
    const storeIds = new Set([...data.popular, ...data.offers].filter((product) => savedRefs.has(product.id)).map((product) => product.storeId));
    return data.recommended.filter((store) => storeIds.has(store.id));
  }, [data, favorites]);

  const brands = useMemo(
    () => (data ? groupBrands([...data.popular, ...data.offers, ...data.trending, ...data.fresh]) : []),
    [data],
  );

  const flashSale = useMemo(() => {
    if (!data) return [];
    return data.offers.filter((product) => discountPercent(product.mrp, product.price) >= 10).slice(0, 8);
  }, [data]);

  const loved = useMemo(() => {
    if (!data) return [];
    const saved = new Set(favorites.filter((fav) => fav.module === 'shop').map((fav) => fav.refId));
    return [...data.popular, ...data.trending].filter((product) => saved.has(product.id));
  }, [data, favorites]);

  const openProduct = (product: CatalogItem): void => navigation.navigate('Item', { module: 'shop', id: product.id });

  const cardProps = (product: CatalogItem) => ({
    item: product,
    module: 'shop' as const,
    qty: cart.qtyOf('shop', product.id),
    favorite: isFavorite('shop', product.id),
    onFavorite: () => void toggleFavorite('shop', product.id),
    onOpen: () => openProduct(product),
    onAdd: () => void actions.quickAdd('shop', product, outletOf(product)),
    onInc: () => void actions.quickAdd('shop', product, outletOf(product)),
    onDec: () => {
      const line = cart.linesFor('shop').find((row) => row.refId === product.id);
      if (line) actions.dec('shop', line.id, line.qty);
    },
  });

  const onBanner = (banner: Banner): void => {
    const target = banner.target;
    if (!target) {
      sheet.info(banner.title, banner.subtitle, 'megaphone');
      return;
    }
    if (target.kind === 'store') navigation.navigate('Outlet', { module: 'shop', id: target.storeId });
    else if (target.kind === 'product') navigation.navigate('Item', { module: 'shop', id: target.productId });
    else if (target.kind === 'category') navigation.navigate('Category', { module: 'shop', id: target.categoryId, name: 'Category' });
    else navigation.navigate('Search', {});
  };

  const loading = home.loading && !data;

  return (
    <Screen
      scroll
      padded={false}
      onRefresh={() => {
        home.refresh();
        void checkHealth();
      }}
      refreshing={home.refreshing}
      header={
        <HomeHeader
          module={module}
          greeting="Groceries, pharmacy, fashion — delivered today"
          onSearch={() => navigation.navigate('Search', {})}
          onLocation={() => navigation.navigate('Location', { from: 'home' })}
          onBell={() => navigation.navigate('Notifications')}
          onCart={() => navigation.navigate('Cart')}
        />
      }
    >
      {online === false ? (
        <Pressable accessibilityRole="button" onPress={() => void checkHealth()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.edge, paddingVertical: 8, backgroundColor: c.warningBg }}>
          <Icon name="wifiOff" size={14} color={c.warning} />
          <Text variant="caption" weight="semibold" color={c.warning} style={{ flex: 1 }}>
            {data ? 'Offline — showing the last catalogue that loaded. Tap to retry.' : 'Offline — no cached catalogue on this device yet. Tap to retry.'}
          </Text>
          <Icon name="refresh" size={14} color={c.warning} />
        </Pressable>
      ) : null}

      <View style={{ marginTop: spacing.sm }}>
        {loading ? <SkeletonHero height={168} /> : <BannerCarousel banners={data?.banners ?? []} onPress={onBanner} />}
      </View>

      {loading ? (
        <View style={{ paddingTop: spacing.md, gap: spacing.lg }}>
          <SkeletonRail cardWidth={72} height={104} count={5} />
          <SkeletonRail cardWidth={268} height={116} count={2} />
          <SkeletonRail cardWidth={168} height={230} count={3} />
          <SkeletonCard height={120} />
          <SkeletonList rows={3} thumb={52} />
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          {data && data.categories.length > 0 ? (
            <Rail title="Shop by category" subtitle="Everything for today" icon="store" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'products', title: 'All products' })}>
              {data.categories.slice(0, 10).map((category) => (
                <CategoryTile key={category.id} category={category} compact onPress={() => navigation.navigate('Category', { module: 'shop', id: category.id, name: category.name })} />
              ))}
            </Rail>
          ) : null}

          {visitAgain.length > 0 ? (
            <Rail title="Visit again" subtitle="Stores from your favourites" icon="history">
              {visitAgain.map((store) => (
                <StoreCard key={store.id} store={store} onPress={() => navigation.navigate('Outlet', { module: 'shop', id: store.id, name: store.name })} favorite={isFavorite('shop', store.id)} onFavorite={() => void toggleFavorite('shop', store.id)} />
              ))}
            </Rail>
          ) : null}

          {data && data.recommended.length > 0 ? (
            <Rail title="Recommended stores" subtitle="Hand-picked near you" icon="shield" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'stores', title: 'All stores' })}>
              {data.recommended.map((store) => (
                <StoreCard key={store.id} store={store} onPress={() => navigation.navigate('Outlet', { module: 'shop', id: store.id, name: store.name })} />
              ))}
            </Rail>
          ) : null}

          {data && data.popular.length > 0 ? (
            <Rail title="Most popular right now" subtitle="What everyone is buying" icon="flame" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'popular', title: 'Most popular' })}>
              {data.popular.map((product) => (
                <ItemCard key={product.id} {...cardProps(product)} />
              ))}
            </Rail>
          ) : null}

          {flashSale.length > 0 ? (
            <View style={{ marginTop: spacing.section, backgroundColor: c.gradientPromo[0], paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <SectionHeader title="Flash sale" subtitle="Deepest discounts, ending soon" icon="zap" actionLabel={`${flashSale.length} deals`} />
                </View>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('FlashSale')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: spacing.md }}>
                  <Text variant="caption" weight="bold" color={c.primary}>
                    See all
                  </Text>
                  <Icon name="chevronRight" size={13} color={c.primary} />
                </Pressable>
              </View>
              <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm }}>
                <FlashSaleTimer compact />
              </View>
              <Rail>
                {flashSale.map((product) => (
                  <ItemCard key={product.id} {...cardProps(product)} />
                ))}
              </Rail>
            </View>
          ) : null}

          {brands.length > 0 ? (
            <View style={{ marginTop: spacing.section }}>
              <SectionHeader
                title="Brands"
                subtitle={`Shop by maker · ${brands.length} in the catalogue`}
                icon="tag"
                actionLabel="All brands"
                onAction={() => navigation.navigate('Brands')}
              />
              <View style={styles.brandGrid}>
                {brands.slice(0, 8).map((brand) => (
                  <Pressable
                    key={brand.name}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('BrandItems', { name: brand.name })}
                    style={({ pressed }) => [styles.brandCell, { backgroundColor: pressed ? c.surfaceAlt : c.surfaceHi }]}
                  >
                    {brand.image ? (
                      <SmartImage source={brand.image} name={brand.name} style={styles.brandArt} radiusOverride={radius.md} />
                    ) : (
                      <View style={[styles.brandArt, styles.brandPlate, { backgroundColor: c.primarySoft }]}>
                        <Text variant="caption" weight="bold" color={c.primary}>
                          {brand.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text variant="micro" tone="muted" numberOfLines={1} center>
                      {brand.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {data?.offers[0] ? (
            <View style={{ marginTop: spacing.section }}>
              <SectionHeader title="Special offer" subtitle="Price drops you can use today" icon="tag" />
              <SpecialOfferCard item={data.offers[0]} onPress={() => openProduct(data.offers[0]!)} />
            </View>
          ) : null}

          {data && data.popularStores.length > 0 ? (
            <Rail title="Popular stores" subtitle="Busy around you right now" icon="storefront">
              {data.popularStores.map((store) => (
                <StoreCard key={store.id} store={store} onPress={() => navigation.navigate('Outlet', { module: 'shop', id: store.id, name: store.name })} />
              ))}
            </Rail>
          ) : null}

          {data && data.trending.length > 0 ? (
            <Rail title="Trending in your city" subtitle="Trending products this week" icon="sparkles" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'products', title: 'Trending products' })}>
              {data.trending.map((product) => (
                <ItemCard key={product.id} {...cardProps(product)} />
              ))}
            </Rail>
          ) : null}

          {data && data.newStores.length > 0 ? (
            <Rail title="Curated niches" subtitle="Specialist stores" icon="layers">
              {data.newStores.map((store) => (
                <StoreCard key={store.id} store={store} onPress={() => navigation.navigate('Outlet', { module: 'shop', id: store.id, name: store.name })} />
              ))}
            </Rail>
          ) : null}

          {loved.length > 0 ? (
            <Rail title="Items you love" subtitle="From your favourites" icon="heart" actionLabel="Favourites" onAction={() => navigation.navigate('Favorites')}>
              {loved.slice(0, 10).map((product) => (
                <ItemCard key={product.id} {...cardProps(product)} />
              ))}
            </Rail>
          ) : null}

          {data && data.fresh.length > 0 ? (
            <Rail title="New on Aurasure" subtitle="Just landed" icon="gift" actionLabel="See all" onAction={() => navigation.navigate('SeeAll', { kind: 'new', title: 'New arrivals' })}>
              {data.fresh.map((product) => (
                <ItemCard key={product.id} {...cardProps(product)} />
              ))}
            </Rail>
          ) : null}

          {home.error ? (
            <EmptyState icon="wifiOff" title="Couldn't load the catalogue" subtitle={home.error.message} actionLabel="Try again" onAction={home.refresh} />
          ) : null}

          <View style={{ paddingHorizontal: spacing.edge, marginTop: spacing.md, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Tag label="Free cancellation before confirmation" icon="circleCheck" tone="success" />
              <Tag label={`Delivery from ${money(0)}`} icon="truck" tone="muted" />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void (async () => {
                const first = data?.recommended[0];
                if (!first) return;
                const detail = await fetchStore(first.id);
                void detail;
                navigation.navigate('Outlet', { module: 'shop', id: first.id, name: first.name });
              })();
            }}
            style={({ pressed }) => [
              {
                marginHorizontal: spacing.edge,
                marginTop: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text variant="subtitle" weight="bold" color={c.primary}>
              Browse all stores
            </Text>
            <Icon name="arrowRight" size={16} color={c.primary} />
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, paddingHorizontal: spacing.edge, paddingTop: spacing.sm },
  brandCell: { width: '22%', borderRadius: radius.lg, padding: spacing.xs, alignItems: 'center', gap: 4 },
  brandArt: { width: 60, height: 60, borderRadius: radius.md },
  brandPlate: { alignItems: 'center', justifyContent: 'center' },
});
