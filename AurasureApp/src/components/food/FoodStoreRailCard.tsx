import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Restaurant } from '@/types';

interface FoodStoreRailCardProps {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
}

/**
 * Horizontal food store card (New on Aurasure / Best stores nearby):
 * cover photo, NEW + Closed Now pills, distance / ETA strip and a
 * "Delivery Available / Visit" action.
 */
export function FoodStoreRailCard({ restaurant, onPress }: FoodStoreRailCardProps): React.ReactElement {
  const distance = restaurant.distanceKm >= 100 ? '100+ km' : `${restaurant.distanceKm.toFixed(1)} km`;

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(restaurant);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.coverWrap}>
        <SmartImage source={restaurant.cover} placeholderIcon="utensils" style={styles.cover} />
        <LinearGradient colors={['rgba(11,16,32,0)', 'rgba(11,16,32,0.62)']} style={StyleSheet.absoluteFill} />
        <View style={styles.topRow}>
          {restaurant.isNew ? (
            <View style={styles.newPill}>
              <Text variant="overline" color={colors.white} weight="bold">
                NEW
              </Text>
            </View>
          ) : (
            <View />
          )}
          {restaurant.isClosed ? (
            <View style={styles.closedPill}>
              <Text variant="overline" color={colors.white} weight="bold">
                CLOSED NOW
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaStrip}>
          <View style={styles.metaItem}>
            <Icon name="mapPin" size={12} color={colors.white} />
            <Text variant="overline" color={colors.white} weight="semibold" style={{ marginLeft: 4 }}>
              {distance}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock" size={12} color={colors.white} />
            <Text variant="overline" color={colors.white} weight="semibold" style={{ marginLeft: 4 }}>
              {formatMinutes(restaurant.deliveryTime)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={styles.logo}>
            <SmartImage source={restaurant.cover} placeholderIcon="store" style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text variant="title" weight="bold" color={colors.text} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {restaurant.line ?? restaurant.cuisines.join(' · ')}
            </Text>
          </View>
        </View>
        <View style={styles.footRow}>
          {restaurant.isClosed ? (
            <View style={styles.offPill}>
              <Text variant="overline" color={colors.textTertiary} weight="bold">
                OPEN TOMORROW
              </Text>
            </View>
          ) : (
            <View style={styles.availPill}>
              <Icon name="check" size={10} color={colors.success} style={{ marginRight: 4 }} />
              <Text variant="overline" color={colors.success} weight="bold">
                DELIVERY AVAILABLE
              </Text>
            </View>
          )}
          <View style={styles.visit}>
            <Icon name="arrowRight" size={13} color={colors.white} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 250,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    height: 124,
    backgroundColor: colors.food[50],
  },
  cover: {
    width: '100%',
    height: 124,
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  newPill: {
    backgroundColor: colors.food[500],
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  closedPill: {
    backgroundColor: '#C81E1E',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  metaStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(11,16,32,0.35)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  info: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  offPill: {
    backgroundColor: colors.ink[100],
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  visit: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.food[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
