import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Icon } from '@/lib/icons';
import { Skeleton } from '../ui/Skeleton';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatDistance, formatINR, formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Restaurant } from '@/types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
}

export function RestaurantCard({ restaurant, onPress }: RestaurantCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(restaurant);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.coverWrap}>
        <SmartImage source={restaurant.cover} placeholderIcon="utensils" style={styles.cover} />
        {restaurant.isVeg ? (
          <View style={styles.vegBadge}>
            <Badge label="Pure Veg" tone="food" icon="leaf" />
          </View>
        ) : null}
        {restaurant.promo ? (
          <View style={styles.promo}>
            <Text variant="caption" color={colors.white} weight="bold">
              {restaurant.promo}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text variant="title" weight="bold" color={colors.text} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
          {restaurant.cuisines.join(' · ')}
        </Text>
        <View style={styles.metaRow}>
          <Rating value={restaurant.rating} reviews={restaurant.reviews} size={12} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginHorizontal: 6 }}>
            · {formatDistance(restaurant.distanceKm)}
          </Text>
          <Icon name="clock" size={12} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 3 }}>
            {formatMinutes(restaurant.deliveryTime)}
          </Text>
        </View>
        <View style={styles.footRow}>
          <Text variant="caption" color={colors.textSecondary}>
            ₹{formatINR(restaurant.priceForTwo)} for two
          </Text>
          <Text variant="caption" color={restaurant.deliveryFee === 0 ? colors.success : colors.textTertiary} weight="semibold">
            {restaurant.deliveryFee === 0 ? 'Free delivery' : `₹${restaurant.deliveryFee} delivery`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function RestaurantCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <Skeleton height={120} radius={radius.md} />
      <View style={styles.info}>
        <Skeleton width="70%" height={15} style={{ marginTop: 10 }} />
        <Skeleton width="50%" height={11} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={11} style={{ marginTop: 10 }} />
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
  coverWrap: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  cover: {
    width: '100%',
    height: 120,
  },
  vegBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  promo: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.food[600],
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderTopLeftRadius: radius.md,
  },
  info: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
