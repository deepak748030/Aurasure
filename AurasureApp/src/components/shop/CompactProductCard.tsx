import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { discountPercent, formatINR, formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { cartItemFromProduct } from '@/data/shop';
import type { Product } from '@/types';

interface CompactProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  showWish?: boolean;
}

/**
 * Dense e-commerce card used in 3-across grids on the home screen:
 * image + % OFF badge, name, rating / delivery time, price + MRP and an
 * ADD button that puts the item straight into the cart.
 */
export function CompactProductCard({ product, onPress, showWish = true }: CompactProductCardProps): React.ReactElement {
  const { module, isLiked, toggleLike } = useApp();
  const { add } = useCart();
  const liked = isLiked(module, product.id);
  const off = discountPercent(product.mrp, product.price);

  const onAdd = (): void => {
    haptic.success();
    add(cartItemFromProduct(product, 1));
  };

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(product);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.imageWrap}>
        <SmartImage
          source={product.image}
          placeholderIcon="bag"
          style={StyleSheet.absoluteFill}
          tint={colors.brand[100]}
        />
        {off > 0 ? (
          <View style={styles.offBadge}>
            <Text variant="overline" color={colors.white} weight="bold">
              {off}% OFF
            </Text>
          </View>
        ) : null}
        {showWish ? (
          <Pressable
            onPress={() => {
              haptic.medium();
              toggleLike(module, product.id);
            }}
            hitSlop={6}
            accessibilityRole="togglebutton"
            accessibilityState={{ checked: liked }}
            style={styles.wish}
          >
            <Icon name="heart" size={13} color={liked ? colors.danger : colors.textSecondary} filled={liked} />
          </Pressable>
        ) : null}
        {!product.inStock ? (
          <View style={styles.out}>
            <Text variant="overline" color={colors.white} weight="bold">
              OUT OF STOCK
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text variant="caption" weight="semibold" color={colors.text} numberOfLines={2} style={{ minHeight: 32 }}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingWrap}>
            <Icon name="star" size={10} color={colors.star} filled />
            <Text variant="overline" color={colors.textSecondary} weight="bold" style={{ marginLeft: 2 }}>
              {product.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.timeWrap}>
            <Icon name="clock" size={11} color={colors.textTertiary} />
            <Text variant="overline" color={colors.textTertiary} style={{ marginLeft: 2 }}>
              {formatMinutes(product.deliveryMins)}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text variant="subtitle" weight="bold" color={colors.text}>
            {formatINR(product.price)}
          </Text>
          {product.mrp > product.price ? (
            <Text variant="overline" color={colors.textTertiary} style={{ textDecorationLine: 'line-through', marginLeft: 4 }}>
              {formatINR(product.mrp)}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onAdd}
          disabled={!product.inStock}
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: !product.inStock ? 0.4 : pressed ? 0.85 : 1 },
          ]}
        >
          <LinearGradient colors={colors.brandGradient} style={StyleSheet.absoluteFill} />
          <Icon name="plus" size={12} color={colors.white} />
          <Text variant="overline" color={colors.white} weight="bold" style={{ marginLeft: 4 }}>
            ADD
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function CompactProductCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <View style={[styles.imageWrap, { backgroundColor: colors.brand[50] }]} />
      <View style={styles.info}>
        <View style={{ height: 12, width: '85%', borderRadius: 4, backgroundColor: colors.ink[100] }} />
        <View style={{ height: 12, width: '60%', borderRadius: 4, backgroundColor: colors.ink[100], marginTop: 6 }} />
        <View style={{ height: 10, width: '45%', borderRadius: 4, backgroundColor: colors.ink[100], marginTop: 10 }} />
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
    backgroundColor: colors.brand[50],
  },
  offBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.danger,
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
  out: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11,16,32,0.55)',
    alignItems: 'center',
    paddingVertical: 3,
  },
  info: {
    padding: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  addBtn: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    height: 28,
    marginTop: 8,
  },
});
