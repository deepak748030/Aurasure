import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { discountPercent, formatINR, formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { cartItemFromFood } from '@/data/food';
import type { FoodItem } from '@/types';

interface CompactFoodCardProps {
  item: FoodItem;
  onPress: (item: FoodItem) => void;
}

/**
 * Dense dish card used 3-across on the food home (Most Popular Items /
 * Special Offer): photo + % OFF pill, prep time, name, MRP + price and an
 * ADD button that puts the dish straight into the cart.
 */
export function CompactFoodCard({ item, onPress }: CompactFoodCardProps): React.ReactElement {
  const { module, isLiked, toggleLike } = useApp();
  const { add } = useCart();
  const liked = isLiked(module, item.id);
  const off = item.mrp ? discountPercent(item.mrp, item.price) : 0;

  const onAdd = (): void => {
    haptic.success();
    add(cartItemFromFood(item, 1));
  };

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(item);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.imageWrap}>
        <SmartImage source={item.image} placeholderIcon="sandwich" style={StyleSheet.absoluteFill} tint={colors.food[100]} />
        {off > 0 ? (
          <View style={styles.offBadge}>
            <Icon name="tag" size={10} color={colors.white} style={{ marginRight: 3 }} />
            <Text variant="overline" color={colors.white} weight="bold">
              {off}% OFF
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            haptic.medium();
            toggleLike(module, item.id);
          }}
          hitSlop={6}
          accessibilityRole="togglebutton"
          accessibilityState={{ checked: liked }}
          style={styles.wish}
        >
          <Icon name="heart" size={12} color={liked ? colors.danger : colors.textSecondary} filled={liked} />
        </Pressable>
      </View>

      <View style={styles.info}>
        <View style={styles.timeRow}>
          <Icon name="clock" size={11} color={colors.success} />
          <Text variant="overline" color={colors.success} weight="bold" style={{ marginLeft: 3 }}>
            {formatMinutes(item.prepTime)}
          </Text>
        </View>
        <Text variant="caption" weight="semibold" color={colors.text} numberOfLines={2} style={{ marginTop: 3, minHeight: 32 }}>
          {item.name}
        </Text>
        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            {item.mrp && item.mrp > item.price ? (
              <Text variant="overline" color={colors.textTertiary} style={{ textDecorationLine: 'line-through' }}>
                {formatINR(item.mrp)}
              </Text>
            ) : null}
            <Text variant="subtitle" weight="bold" color={colors.text}>
              {formatINR(item.price)}
            </Text>
          </View>
          <Pressable
            onPress={onAdd}
            hitSlop={6}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name="plus" size={12} color={colors.food[700]} />
            <Text variant="overline" color={colors.food[700]} weight="bold" style={{ marginLeft: 3 }}>
              ADD
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function CompactFoodCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={[styles.imageWrap, { backgroundColor: colors.food[50] }]} />
      <View style={styles.info}>
        <View style={{ height: 10, width: '45%', borderRadius: 4, backgroundColor: colors.ink[100] }} />
        <View style={{ height: 12, width: '85%', borderRadius: 4, backgroundColor: colors.ink[100], marginTop: 6 }} />
        <View style={{ height: 12, width: '60%', borderRadius: 4, backgroundColor: colors.ink[100], marginTop: 6 }} />
        <View style={{ height: 26, width: '100%', borderRadius: radius.pill, backgroundColor: colors.ink[100], marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 104,
    backgroundColor: colors.food[50],
  },
  offBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B9E4B',
    borderRadius: radius.xs,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  wish: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.food[400],
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
});
