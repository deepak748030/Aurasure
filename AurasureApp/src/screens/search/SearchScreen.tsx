import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { Text } from '../../components/ui/Text';
import { SearchBar } from '../../components/ui/SearchBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { DishCard, DishCardSkeleton } from '../../components/food/DishCard';
import { ProductCard, ProductCardSkeleton } from '../../components/shop/ProductCard';
import { RestaurantCard, RestaurantCardSkeleton } from '../../components/food/RestaurantCard';
import { RecommendedStoreCard, RecommendedStoreCardSkeleton } from '../../components/shop/StoreCard';
import { Grid } from '../../components/common/Grid';
import { useDebouncedCallback } from '@/lib/debounce';
import { useAppQuery } from '../../hooks/useAppQuery';
import { isApiEnabled } from '@/api/config';
import { ApiError } from '@/api/client';
import { fetchFoodCategories, fetchFoodSearch } from '@/api/food';
import { fetchShopCategories, fetchShopSearch } from '@/api/shop';
import { foodCategories, shopCategories } from '../../data/mock';
import { searchFood, searchRestaurants } from '../../data/food';
import { searchProducts, searchStores } from '../../data/shop';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import type { FoodCategory, FoodItem, Product, Restaurant, ShopCategory, ShopStore } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Search'>;

const SEARCH_DEBOUNCE_MS = 300;

export function SearchScreen({ navigation }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[] | Product[]>([]);
  const [places, setPlaces] = useState<Restaurant[] | ShopStore[]>([]);
  // The term the currently shown results were resolved for (used to detect
  // "user is typing faster than the debounce" so old results can dim).
  const [resolvedTerm, setResolvedTerm] = useState('');
  // True while a live request is in flight (keeps results visible + dimmed).
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { module } = useApp();
  const isFood = module === 'food';

  // Category chips come from the server when connected, mock otherwise.
  const { data: categories, refresh: refreshCategories } = useAppQuery<FoodCategory[] | ShopCategory[]>(
    () => (isFood ? fetchFoodCategories() : fetchShopCategories()),
    () => (isFood ? foodCategories : shopCategories),
    { deps: [module] },
  );

  // Kill any in-flight request when the screen unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  /** The single place a search actually runs (offline or live). */
  const runSearch = useCallback(
    (termRaw: string): void => {
      const term = termRaw.trim();
      if (!term) {
        abortRef.current?.abort();
        setResolvedTerm('');
        setItems([]);
        setPlaces([]);
        setPending(false);
        setRefreshing(false);
        return;
      }

      // Offline: instant curated matches (no network, no race).
      if (!isApiEnabled) {
        setResolvedTerm(term);
        setItems(isFood ? searchFood(term) : searchProducts(term));
        setPlaces(isFood ? searchRestaurants(term) : searchStores(term));
        setPending(false);
        setRefreshing(false);
        return;
      }

      // Live: abort the previous request (its AbortSignal cancels the actual
      // fetch, not just this effect) so only the newest term can win.
      setResolvedTerm(term);
      setPending(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      (async () => {
        try {
          if (isFood) {
            const payload = await fetchFoodSearch(term, signal);
            if (signal.aborted) return;
            setItems(payload.items);
            setPlaces(payload.restaurants);
          } else {
            const payload = await fetchShopSearch(term, signal);
            if (signal.aborted) return;
            setItems(payload.products);
            setPlaces(payload.stores);
          }
        } catch (err) {
          if (signal.aborted) return;
          // Only genuine failures fall back; ABORTED/TIMEOUT are handled above.
          if (err instanceof ApiError && (err.code === 'ABORTED' || err.code === 'TIMEOUT')) return;
          console.warn('[search] server unavailable, showing curated matches:', err instanceof Error ? err.message : err);
          setItems(isFood ? searchFood(term) : searchProducts(term));
          setPlaces(isFood ? searchRestaurants(term) : searchStores(term));
        } finally {
          if (!signal.aborted) {
            setPending(false);
            setRefreshing(false);
          }
        }
      })();
    },
    [isFood],
  );

  // Trailing-edge scheduler: typing "chees" fires exactly one request.
  const schedule = useDebouncedCallback((t: string) => runSearch(t), SEARCH_DEBOUNCE_MS);

  const handleQueryChange = (text: string): void => {
    setQuery(text);
    if (!text.trim()) {
      schedule.cancel();
      runSearch('');
      return;
    }
    schedule(text);
  };

  // Keyboard "search" key → skip the debounce and run the typed term now.
  const submitNow = (): void => {
    const typed = query.trim();
    if (!typed) return;
    schedule.cancel();
    runSearch(typed);
  };

  // Module switch while a term is typed → search the new catalogue at once.
  useEffect(() => {
    const typed = query.trim();
    if (!typed) return;
    schedule.cancel();
    runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFood]);

  const refresh = (): void => {
    refreshCategories();
    const target = query.trim() || resolvedTerm;
    if (!target) return;
    schedule.cancel();
    setRefreshing(true);
    runSearch(target);
  };

  const typed = query.trim();
  const typing = Boolean(typed) && typed !== resolvedTerm;
  const stale = typing || pending;

  const totalItems = (isFood ? (items as FoodItem[]).length : (items as Product[]).length);
  const totalPlaces = (isFood ? (places as Restaurant[]).length : (places as ShopStore[]).length);
  const anyResults = totalItems + totalPlaces > 0;
  const noMatches = typed.length > 0 && !stale && !anyResults;
  // First search on a fresh term → real skeletons (nothing to dim yet).
  const showSkeletons = typed.length > 0 && pending && !anyResults;

  const openRestaurant = (r: Restaurant): void => {
    navigation.navigate('Restaurant', { restaurantId: r.id });
  };
  const openFood = (d: FoodItem): void => {
    navigation.navigate('Restaurant', { restaurantId: d.restaurantId });
  };
  const openStore = (s: ShopStore): void => {
    navigation.navigate('Store', { storeId: s.id });
  };
  const openProduct = (p: Product): void => {
    navigation.navigate('Product', { productId: p.id });
  };

  const header = (
    <View style={styles.header}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <SearchBar
          value={query}
          onChangeText={handleQueryChange}
          onSubmit={submitNow}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          placeholder={isFood ? 'Search dishes or restaurants' : 'Search products, brands or stores'}
        />
      </View>
    </View>
  );

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh} padded>
      {!typed ? (
        <>
          <SectionHeader title={isFood ? 'Popular in Food' : 'Popular in the store'} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {(categories ?? []).map((c, i, list) => (
              <View key={c.id} style={{ marginRight: i === list.length - 1 ? 0 : 8, marginBottom: 8 }}>
                <Chip
                  label={c.name}
                  icon={c.icon}
                  onPress={() => {
                    haptic.selection();
                    setQuery(c.name);
                    schedule(c.name);
                  }}
                />
              </View>
            ))}
          </View>
        </>
      ) : showSkeletons ? (
        isFood ? (
          <View>
            <SectionHeader title="Restaurants" />
            <Grid data={[1, 2]} renderItem={() => <RestaurantCardSkeleton />} />
            <SectionHeader title="Food" />
            {[1, 2, 3].map((k) => (
              <View key={k} style={{ marginBottom: 12 }}>
                <DishCardSkeleton />
              </View>
            ))}
          </View>
        ) : (
          <View>
            <SectionHeader title="Stores" />
            <View style={{ flexDirection: 'row' }}>
              {[1, 2].map((k) => (
                <View key={k} style={{ marginRight: 12 }}>
                  <RecommendedStoreCardSkeleton />
                </View>
              ))}
            </View>
            <SectionHeader title="Products" />
            <Grid data={[1, 2, 3, 4]} renderItem={() => <ProductCardSkeleton />} />
          </View>
        )
      ) : noMatches ? (
        <EmptyState
          icon="search"
          title="No results found"
          subtitle={`We couldn't find anything for "${typed}" in ${isFood ? 'Food' : 'the store'}. Try another keyword.`}
        />
      ) : (
        <>
          {/* Thin status strip while a newer term is resolving - results stay
              visible underneath instead of flashing away. */}
          {stale ? (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.brand[600]} />
              <Text style={styles.searchingLabel}>{typing ? 'Searching…' : 'Updating results…'}</Text>
            </View>
          ) : null}

          <View style={stale ? styles.stale : null}>
            {isFood ? (
              <>
                {(places as Restaurant[]).length > 0 ? (
                  <>
                    <SectionHeader title="Restaurants" subtitle={`${totalPlaces} match${totalPlaces === 1 ? '' : 'es'}`} />
                    <Grid
                      data={places as Restaurant[]}
                      renderItem={(r) => <RestaurantCard restaurant={r} onPress={openRestaurant} />}
                    />
                  </>
                ) : null}
                {(items as FoodItem[]).length > 0 ? (
                  <>
                    <SectionHeader title="Food" subtitle={`${totalItems} result${totalItems === 1 ? '' : 's'}`} />
                    {(items as FoodItem[]).map((d) => (
                      <View key={d.id} style={{ marginBottom: 12 }}>
                        <DishCard item={d} onPress={openFood} />
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {(places as ShopStore[]).length > 0 ? (
                  <>
                    <SectionHeader title="Stores" subtitle={`${totalPlaces} store${totalPlaces === 1 ? '' : 's'}`} />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 12 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {(places as ShopStore[]).map((s) => (
                        <View key={s.id} style={{ marginRight: 12 }}>
                          <RecommendedStoreCard store={s} onPress={openStore} />
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
                {(items as Product[]).length > 0 ? (
                  <>
                    <SectionHeader title="Products" subtitle={`${totalItems} product${totalItems === 1 ? '' : 's'}`} />
                    <Grid
                      data={items as Product[]}
                      renderItem={(p) => <ProductCard product={p} onPress={openProduct} />}
                    />
                  </>
                ) : null}
              </>
            )}
          </View>
          <View style={{ height: 8 }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
    backgroundColor: colors.appBar,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  searchingLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  stale: { opacity: 0.45 },
});
