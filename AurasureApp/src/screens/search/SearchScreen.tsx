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
import { foodCategories, searchFood, searchProducts, shopCategories } from '../../data/mock';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import type { FoodItem, Product, ShopCategory } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { module } = useApp();
  const isFood = module === 'food';

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = (): void => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  // Only the selected module is searchable - Food never surfaces shop items.
  const foods = query.trim() && isFood ? searchFood(query) : [];
  const shops = query.trim() && !isFood ? searchProducts(query) : [];
  const total = foods.length + shops.length;

  const openFood = (d: FoodItem): void => {
    void navigation.navigate('Restaurant', { restaurantId: d.restaurantId });
  };
  const openProduct = (p: Product): void => {
    void navigation.navigate('Product', { productId: p.id });
  };

  const categories = isFood ? foodCategories : shopCategories;

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.contentHorizontalPadding,
        paddingVertical: 10,
        backgroundColor: colors.appBar,
      }}
    >
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <SearchBar value={query} onChangeText={setQuery} autoFocus placeholder={isFood ? 'Search dishes or restaurants' : 'Search products or brands'} />
      </View>
    </View>
  );

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={onRefresh} padded>
      {!query.trim() ? (
        <>
          <SectionHeader title={isFood ? 'Popular in Food' : 'Popular in the store'} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {categories.map((c, i) => (
              <View key={c.id} style={{ marginRight: i === categories.length - 1 ? 0 : 8, marginBottom: 8 }}>
                <Chip
                  label={c.name}
                  icon={c.icon}
                  onPress={() => {
                    haptic.selection();
                    setQuery(c.name);
                  }}
                />
              </View>
            ))}
          </View>
        </>
      ) : loading ? (
        isFood ? (
          <>
            <SectionHeader title="Food" />
            {[1, 2, 3].map((k) => (
              <View key={k} style={{ marginBottom: 12 }}>
                <DishCardSkeleton />
              </View>
            ))}
          </>
        ) : (
          <>
            <SectionHeader title="Products" />
            <Grid data={[1, 2, 3, 4]} renderItem={() => <ProductCardSkeleton />} />
          </>
        )
      ) : total === 0 ? (
        <EmptyState icon="search" title="No results found" subtitle={`We couldn't find anything for "${query}" in ${isFood ? 'Food' : 'the store'}. Try another keyword.`} />
      ) : isFood ? (
        <>
          <SectionHeader title="Food" subtitle={`${foods.length} results`} />
          {foods.map((d) => (
            <View key={d.id} style={{ marginBottom: 12 }}>
              <DishCard item={d} onPress={openFood} />
            </View>
          ))}
        </>
      ) : (
        <>
          <SectionHeader title="Products" subtitle={`${shops.length} results`} />
          <Grid data={shops} renderItem={(p) => <ProductCard product={p} onPress={openProduct} />} />
        </>
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
