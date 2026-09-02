import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Rating } from '../ui/Rating';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { Skeleton } from '../ui/Skeleton';
import type { ShopStore } from '@/types';

interface StoreCardProps {
  store: ShopStore;
  onPress: (store: ShopStore) => void;
}

/**
 * Recommended store card - portrait tile for the horizontal rail. Shows the
 * store front, niche/popular badge, rating, delivery time and street address.
 */
export function RecommendedStoreCard({ store, onPress }: StoreCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(store);
      }}
      style={({ pressed }) => [styles.recCard, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.coverWrap}>
        <SmartImage source={store.cover} placeholderIcon="store" style={styles.cover} />
        <LinearGradient
          colors={['rgba(11,16,32,0)', 'rgba(11,16,32,0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.recBadge}>
          <Badge
            label={store.isNiche ? 'NICHE' : 'TOP PICK'}
            tone={store.isNiche ? 'warning' : 'brand'}
            size="sm"
          />
        </View>
      </View>
      <View style={styles.recInfo}>
        <Text variant="title" weight="bold" color={colors.text} numberOfLines={1}>
          {store.name}
        </Text>
        <Rating value={store.rating} reviews={store.reviews} size={11} />
        <View style={styles.metaRow}>
          <Icon name="clock" size={12} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 3 }}>
            {formatMinutes(store.deliveryMins)}
          </Text>
          <View style={styles.dot} />
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ flex: 1 }}>
            {store.road}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Popular store card - compact horizontal tile for the rail: image left,
 * name / road / house / city right.
 */
export function PopularStoreCard({ store, onPress }: StoreCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(store);
      }}
      style={({ pressed }) => [styles.popCard, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.popThumb}>
        <SmartImage source={store.cover} placeholderIcon="store" style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.popInfo}>
        <View style={styles.popTitleRow}>
          <Text variant="title" weight="bold" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
            {store.name}
          </Text>
          {store.isNiche ? <Badge label="NICHE" tone="warning" size="sm" /> : null}
        </View>
        <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 3 }}>
          {store.road}
        </Text>
        <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
          {store.house} · {store.city}
        </Text>
        <View style={styles.popMeta}>
          <Rating value={store.rating} reviews={store.reviews} size={11} />
          <View style={styles.dot} />
          <Icon name="clock" size={11} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 2 }}>
            {formatMinutes(store.deliveryMins)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Store grid card for the "All stores" bottom section and store list pages:
 * image, name, address, rating, delivery time and item count.
 */
export function StoreGridCard({
  store,
  itemCount,
  onPress,
}: StoreCardProps & { itemCount: number }): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(store);
      }}
      style={({ pressed }) => [styles.gridCard, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.gridCoverWrap}>
        <SmartImage source={store.cover} placeholderIcon="store" style={styles.gridCover} />
        {store.isNiche ? (
          <View style={styles.gridBadge}>
            <Badge label="NICHE" tone="warning" size="sm" />
          </View>
        ) : null}
      </View>
      <View style={styles.gridInfo}>
        <Text variant="title" weight="bold" color={colors.text} numberOfLines={1}>
          {store.name}
        </Text>
        <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 3 }}>
          {store.road}
        </Text>
        <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
          {store.house} · {store.city}
        </Text>
        <View style={styles.gridFoot}>
          <Rating value={store.rating} reviews={store.reviews} size={11} />
          <View style={styles.dot} />
          <Text variant="caption" color={colors.textTertiary}>
            {formatMinutes(store.deliveryMins)}
          </Text>
          <View style={styles.gridArrow}>
            <Icon name="arrowRight" size={14} color={colors.brand[700]} />
          </View>
        </View>
        <Text variant="overline" color={colors.brand[700]} style={{ marginTop: 6 }}>
          {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
        </Text>
      </View>
    </Pressable>
  );
}

export function StoreCardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'rec' | 'pop' }): React.ReactElement {
  return <View style={[variant === 'pop' ? styles.popCard : variant === 'rec' ? styles.recCard : styles.gridCard, styles.skeleton]} />;
}

/** Shape-faithful skeleton for the recommended-store rail (cover + lines). */
export function RecommendedStoreCardSkeleton(): React.ReactElement {
  return (
    <View style={[styles.recCard, { padding: 0 }]}>
      <Skeleton height={110} radius={0} />
      <View style={styles.recInfo}>
        <Skeleton width="70%" height={13} />
        <Skeleton width="45%" height={11} style={{ marginTop: 6 }} />
        <Skeleton width="55%" height={10} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

/** Shape-faithful skeleton for the popular-store row rail. */
export function PopularStoreCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.popCard}>
      <Skeleton width={74} height={74} radius={radius.md} />
      <View style={styles.popInfo}>
        <Skeleton width="80%" height={13} />
        <Skeleton width="60%" height={10} style={{ marginTop: 6 }} />
        <Skeleton width="45%" height={10} style={{ marginTop: 4 }} />
        <Skeleton width="55%" height={11} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

/** Shape-faithful skeleton for the grid store card (2-column lists). */
export function StoreGridCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.gridCard}>
      <Skeleton height={116} radius={0} />
      <View style={styles.gridInfo}>
        <Skeleton width="75%" height={13} />
        <Skeleton width="60%" height={10} style={{ marginTop: 6 }} />
        <Skeleton width="40%" height={10} style={{ marginTop: 4 }} />
        <Skeleton width="50%" height={12} style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Recommended (rail tile)
  recCard: {
    width: 196,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  cover: {
    width: '100%',
    height: 110,
  },
  recBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  recInfo: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginHorizontal: 6,
  },

  // Popular (compact row)
  popCard: {
    width: 268,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  popThumb: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.brand[50],
  },
  popInfo: {
    flex: 1,
    marginLeft: 12,
  },
  popTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  // Grid (2-column, bottom all-stores)
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridCoverWrap: {
    position: 'relative',
    width: '100%',
    height: 116,
  },
  gridCover: {
    width: '100%',
    height: 116,
  },
  gridBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  gridInfo: {
    padding: 12,
  },
  gridFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  gridArrow: {
    marginLeft: 'auto',
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeleton: {
    backgroundColor: colors.brand[50],
    opacity: 0.5,
  },
});
