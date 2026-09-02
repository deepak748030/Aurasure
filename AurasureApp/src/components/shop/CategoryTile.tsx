import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { Skeleton } from '../ui/Skeleton';
import type { ShopCategory } from '@/types';

interface CategoryTileProps {
  category: ShopCategory;
  itemCount: number;
  onPress: (category: ShopCategory) => void;
}

/**
 * Big category tile for the browsable category rail: full-bleed image,
 * name + item count on a bottom gradient, tap opens every item of the
 * category (e.g. all sunglasses).
 */
export function CategoryTile({ category, itemCount, onPress }: CategoryTileProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(category);
      }}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.imageWrap}>
        <SmartImage
          source={category.image ?? null}
          placeholderIcon={category.icon}
          style={StyleSheet.absoluteFill}
          tint={colors.brand[100]}
        />
        <LinearGradient
          colors={['rgba(11,16,32,0.02)', 'rgba(11,16,32,0.72)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.content}>
        <Text variant="title" weight="bold" color={colors.white} numberOfLines={1}>
          {category.name}
        </Text>
        <View style={styles.foot}>
          <Text variant="overline" color="rgba(255,255,255,0.85)">
            {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
          </Text>
          <View style={styles.arrow}>
            <Icon name="arrowRight" size={14} color={colors.brand[700]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Shape-faithful skeleton for the big "Shop by category" tiles. */
export function CategoryTileSkeleton(): React.ReactElement {
  return (
    <View style={[styles.tile, { backgroundColor: colors.ink[50] }]}>
      <Skeleton height={116} radius={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 168,
    height: 116,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.brand[50],
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  arrow: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
