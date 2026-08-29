import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Price } from '../ui/Price';
import { Icon } from '@/lib/icons';
import { Skeleton } from '../ui/Skeleton';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, onPress }: ProductCardProps): React.ReactElement {
  const [liked, setLiked] = useState(false);

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(product);
      }}
      disabled={!product.inStock}
      style={({ pressed }) => [styles.card, { opacity: product.inStock ? (pressed ? 0.96 : 1) : 0.6 }]}
    >
      <View style={styles.imageWrap}>
        <SmartImage source={product.image} placeholderIcon="bag" style={styles.image} tint={colors.brand[50]} />
        {product.isNew ? (
          <View style={styles.newBadge}>
            <Badge label="NEW" tone="brand" size="md" />
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            haptic.medium();
            setLiked((v) => !v);
          }}
          hitSlop={8}
          style={styles.wish}
        >
          <Icon name="heart" size={16} color={liked ? colors.danger : colors.textTertiary} filled={liked} />
        </Pressable>
        {!product.inStock ? (
          <View style={styles.out}>
            <Text variant="caption" color={colors.white} weight="bold">
              Out of stock
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text variant="caption" color={colors.brand[700]} weight="bold">
          {product.brand}
        </Text>
        <Text variant="title" weight="semibold" color={colors.text} numberOfLines={1} style={{ marginTop: 2 }}>
          {product.name}
        </Text>
        <Rating value={product.rating} reviews={product.reviews} size={11} />
        <View style={styles.foot}>
          <Price price={product.price} mrp={product.mrp} variant="subtitle" showDiscount={false} />
          <View style={styles.addCircle}>
            <Icon name="plus" size={16} color={colors.brand[600]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ProductCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <Skeleton height={140} radius={radius.md} />
      <View style={styles.info}>
        <Skeleton width="50%" height={11} style={{ marginTop: 10 }} />
        <Skeleton width="80%" height={13} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={13} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: colors.brand[50],
  },
  image: {
    width: '100%',
    height: 140,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  wish: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    paddingVertical: 4,
  },
  info: {
    padding: 12,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
