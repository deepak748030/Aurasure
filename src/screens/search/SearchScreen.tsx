import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { SearchBar } from '../../components/ui/SearchBar';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { DishCard, DishCardSkeleton } from '../../components/food/DishCard';
import { ProductCard, ProductCardSkeleton } from '../../components/shop/ProductCard';
import { Grid } from '../../components/common/Grid';
import { useCart } from '../../context/CartContext';
import { foodCategories, searchFood, searchProducts, shopCategories } from '../../data/mock';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import { switchTab } from '../../navigation/RootNavigation';
import type { FoodItem, Product, ShopCategory } from '../../types';
import type { SearchStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchResults'>;

export function SearchScreen({ navigation }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = (): void => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const foods = query.trim() ? searchFood(query) : [];
  const shops = query.trim() ? searchProducts(query) : [];

  // These detail screens live in the Food/Shop tab stacks, so jump through the
  // tab navigator with nested params instead of navigate('Restaurant') — a bare
  // navigate from this stack is not handled by any parent navigator.
  const openFood = (d: FoodItem): void => switchTab('Food', { screen: 'Restaurant', params: { restaurantId: d.restaurantId } });
  const openProduct = (p: Product): void => switchTab('Shop', { screen: 'Product', params: { productId: p.id } });

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background }}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <SearchBar value={query} onChangeText={setQuery} autoFocus placeholder="Search food or products" />
      </View>
    </View>
  );

  const suggestions: (FoodItem | Product)[] = [];
  if (!query.trim()) {
    // not used directly; we show category chips instead
  }

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={onRefresh} padded>
      {!query.trim() ? (
        <>
          <SectionHeader title="Popular in Food" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {foodCategories.map((c, i) => (
              <View key={c.id} style={{ marginRight: i === foodCategories.length - 1 ? 0 : 8, marginBottom: 8 }}>
                <Chip label={c.name} icon={c.icon} onPress={() => { haptic.selection(); setQuery(c.name); }} />
              </View>
            ))}
          </View>
          <View style={{ height: 22 }} />
          <SectionHeader title="Popular in Mart" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {shopCategories.map((c: ShopCategory, i) => (
              <View key={c.id} style={{ marginRight: i === shopCategories.length - 1 ? 0 : 8, marginBottom: 8 }}>
                <Chip label={c.name} icon={c.icon} onPress={() => { haptic.selection(); setQuery(c.name); }} />
              </View>
            ))}
          </View>
        </>
      ) : loading ? (
        <>
          <SectionHeader title="Food" />
          {[1, 2].map((k) => (
            <View key={k} style={{ marginBottom: 12 }}>
              <DishCardSkeleton />
            </View>
          ))}
          <View style={{ height: 16 }} />
          <SectionHeader title="Mart" />
          <Grid data={[1, 2, 3, 4]} renderItem={() => <ProductCardSkeleton />} />
        </>
      ) : foods.length === 0 && shops.length === 0 ? (
        <EmptyState icon="search" title="No results found" subtitle={`We couldn't find anything for "${query}". Try another keyword.`} />
      ) : (
        <>
          {foods.length > 0 ? (
            <>
              <SectionHeader title="Food" subtitle={`${foods.length} results`} />
              {foods.map((d) => (
                <View key={d.id} style={{ marginBottom: 12 }}>
                  <DishCard item={d} onPress={openFood} />
                </View>
              ))}
            </>
          ) : null}
          {shops.length > 0 ? (
            <>
              <SectionHeader title="Mart" subtitle={`${shops.length} results`} />
              <Grid data={shops} renderItem={(p) => <ProductCard product={p} onPress={openProduct} />} />
            </>
          ) : null}
        </>
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
