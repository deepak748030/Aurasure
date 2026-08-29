import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Icon } from '@/lib/icons';
import { Skeleton } from '../ui/Skeleton';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { FoodItem } from '@/types';

interface DishCardProps {
  item: FoodItem;
  onPress: (item: FoodItem) => void;
}

export function DishCard({ item, onPress }: DishCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(item);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
    >
      <View style={styles.thumbWrap}>
        <SmartImage source={item.image} placeholderIcon="utensils" style={styles.thumb} tint={colors.food[100]} />
        {!item.isVeg ? (
          <View style={styles.nonVeg}>
            <View style={styles.dot} />
          </View>
        ) : (
          <View style={styles.veg}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text variant="title" weight="semibold" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
            {item.name}
          </Text>
          {item.isBestseller ? <Icon name="flame" size={15} color={colors.food[500]} style={{ marginLeft: 6 }} /> : null}
        </View>
        <Text variant="caption" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 3 }}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Icon name="star" size={12} color={colors.star} filled />
          <Text variant="caption" color={colors.textSecondary} weight="semibold" style={{ marginLeft: 4 }}>
            {item.rating.toFixed(1)}
          </Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 10 }}>
            {item.prepTime} min
          </Text>
        </View>
      </View>
      <View style={styles.priceCol}>
        <Text variant="title" weight="bold" color={colors.text}>
          {formatINR(item.price)}
        </Text>
        <Pressable
          onPress={() => {
            haptic.medium();
            onPress(item);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={colors.brandGradient} style={styles.addBtnGrad}>
            <Icon name="plus" size={18} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function DishCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <Skeleton width={84} height={84} radius={radius.md} />
      <View style={styles.info}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="95%" height={10} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.priceCol}>
        <Skeleton width={44} height={14} />
        <Skeleton width={34} height={34} radius={radius.pill} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
  },
  veg: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  nonVeg: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 10,
    width: 64,
  },
  addBtn: {
    marginTop: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  addBtnGrad: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
