import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { SmartImage } from '../../components/ui/SmartImage';
import { Text } from '../../components/ui/Text';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '@/lib/icons';
import { Rating } from '../../components/ui/Rating';
import { Chip } from '../../components/ui/Chip';
import { DishCard, DishCardSkeleton } from '../../components/food/DishCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useMockQuery } from '../../hooks/useMockQuery';
import { useCart } from '../../context/CartContext';
import {
  cartItemFromFood,
  foodCategories,
  getFoodItemsByRestaurant,
  getRestaurantById,
} from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius, shadow } from '@/theme/tokens';
import { TAB_BAR_HEIGHT } from '@/lib/layout';
import { formatDistance, formatINR, formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { openCart } from '@/navigation/RootNavigation';
import type { FoodItem } from '@/types';
import type { FoodStackParamList } from '../../navigation/types';
import { switchTab } from '@/navigation/RootNavigation';

type Props = NativeStackScreenProps<FoodStackParamList, 'Restaurant'>;

export function RestaurantScreen({ route, navigation }: Props): React.ReactElement {
  const { restaurantId } = route.params;
  const insets = useSafeAreaInsets();
  const { count, subtotal, add } = useCart();
  const [activeDish, setActiveDish] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);
  const [catFilter, setCatFilter] = useState<string | undefined>(undefined);

  const { data, loading, refreshing, refresh } = useMockQuery(() => {
    const restaurant = getRestaurantById(restaurantId);
    const items = getFoodItemsByRestaurant(restaurantId);
    return { restaurant, items };
  });

  const restaurant = data.restaurant;
  const dishes = catFilter ? data.items.filter((d) => d.categoryIds.includes(catFilter)) : data.items;

  const openDish = (item: FoodItem): void => {
    setQty(1);
    setActiveDish(item);
  };

  const confirmAdd = (): void => {
    if (!activeDish) return;
    add(cartItemFromFood(activeDish, qty));
    haptic.success();
    setActiveDish(null);
  };

  const header = restaurant ? (
    <View>
      <View style={styles.coverWrap}>
        <SmartImage source={restaurant.cover} placeholderIcon="utensils" style={styles.cover} />
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
          <Pressable onPress={() => switchTab('Search')} hitSlop={10} style={styles.roundBtn}>
            <Icon name="search" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoHead}>
          <Text variant="h2" weight="bold" color={colors.text}>
            {restaurant.name}
          </Text>
          {restaurant.isVeg ? <Badge label="Pure Veg" tone="food" icon="leaf" /> : null}
        </View>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {restaurant.cuisines.join(' · ')}
        </Text>
        <View style={styles.metaRow}>
          <Rating value={restaurant.rating} reviews={restaurant.reviews} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginHorizontal: 8 }}>
            · {formatDistance(restaurant.distanceKm)}
          </Text>
          <Icon name="clock" size={13} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 4 }}>
            {formatMinutes(restaurant.deliveryTime)}
          </Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 8 }}>
            ₹{formatINR(restaurant.priceForTwo)} for two
          </Text>
        </View>
        {restaurant.promo ? (
          <View style={{ marginTop: 10 }}>
            <Badge label={restaurant.promo} tone="brand" icon="badgePercent" />
          </View>
        ) : null}
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        header={header}
        refreshing={refreshing}
        onRefresh={refresh}
        contentStyle={{ paddingBottom: count > 0 ? 96 : 0 }}
        scroll
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text variant="overline" color={colors.textTertiary}>
            MENU
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 0, marginTop: 10 }}>
            <View style={{ marginRight: 8 }}>
              <Chip label="All" active={!catFilter} onPress={() => setCatFilter(undefined)} />
            </View>
            {foodCategories.map((c, i) => (
              <View key={c.id} style={{ marginRight: i === foodCategories.length - 1 ? 0 : 8 }}>
                <Chip label={c.name} icon={c.icon} active={catFilter === c.id} onPress={() => setCatFilter(c.id)} />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingTop: 14 }}>
          {loading
            ? [1, 2, 3, 4].map((k) => (
                <View key={k} style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                  <DishCardSkeleton />
                </View>
              ))
            : dishes.map((d) => (
                <View key={d.id} style={{ marginBottom: 12, paddingHorizontal: 16 }}>
                  <DishCard item={d} onPress={openDish} />
                </View>
              ))}
          {!loading && dishes.length === 0 ? (
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginVertical: 30 }}>
              No dishes in this category yet.
            </Text>
          ) : null}
        </View>
      </Screen>

      <BottomSheet visible={activeDish !== null} onClose={() => setActiveDish(null)} title={activeDish?.name}>
        {activeDish ? (
          <View>
            <SmartImage source={activeDish.image} placeholderIcon="utensils" style={styles.sheetImg} />
            <Text variant="subtitle" color={colors.textSecondary} style={{ marginTop: 12 }}>
              {activeDish.description}
            </Text>
            <View style={styles.sheetMeta}>
              <Rating value={activeDish.rating} />
              <Text variant="caption" color={colors.textTertiary}>
                {activeDish.prepTime} min
              </Text>
            </View>
            <View style={styles.qtyRow}>
              <Text variant="title" weight="bold" color={colors.text}>
                {formatINR(activeDish.price * qty)}
              </Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
                  <Icon name="minus" size={18} color={colors.text} />
                </Pressable>
                <Text variant="title" weight="bold" color={colors.text} style={{ minWidth: 28, textAlign: 'center' }}>
                  {qty}
                </Text>
                <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepBtn}>
                  <Icon name="plus" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
            <Button title={`Add ${qty} to cart`} onPress={confirmAdd} fullWidth style={{ marginTop: 14 }} leftIcon="cart" />
          </View>
        ) : null}
      </BottomSheet>

      {count > 0 ? (
        <Pressable
          onPress={openCart}
          style={[
            styles.cartBar,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + 10 },
          ]}
        >
          <View style={styles.cartBarInner}>
            <View style={styles.cartBadge}>
              <Icon name="cart" size={18} color={colors.white} />
              <View style={styles.cartCount}>
                <Text variant="caption" color={colors.white} weight="bold">
                  {count}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle" color={colors.white} weight="bold">
                {formatINR(subtotal)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                View cart
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={colors.white} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    position: 'relative',
    width: '100%',
    height: 188,
  },
  cover: {
    width: '100%',
    height: 188,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -28,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.sm,
  },
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  sheetImg: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
  },
  sheetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.xs,
  },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  cartBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...shadow.md,
  },
  cartBadge: {
    position: 'relative',
    marginRight: 12,
  },
  cartCount: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.food[500],
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.brand[600],
  },
});
