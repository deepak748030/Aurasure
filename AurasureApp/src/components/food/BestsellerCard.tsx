import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Rating } from '../ui/Rating';
import { Icon } from '@/lib/icons';
import { Skeleton } from '../ui/Skeleton';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR, discountPercent } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import type { FoodItem } from '@/types';

interface BestsellerCardProps {
  item: FoodItem;
  onPress: (item: FoodItem) => void;
}

export function BestsellerCard({ item, onPress }: BestsellerCardProps): React.ReactElement {
  const { module, isLiked, toggleLike } = useApp();
  const liked = isLiked(module, item.id);
  const off = item.mrp ? discountPercent(item.mrp, item.price) : 0;

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(item);
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
    >
      <View style={styles.thumbWrap}>
        <SmartImage source={item.image} placeholderIcon="sandwich" style={styles.thumb} tint={colors.food[100]} />
        <Pressable
          onPress={() => {
            haptic.medium();
            toggleLike(module, item.id);
          }}
          hitSlop={8}
          accessibilityRole="togglebutton"
          accessibilityState={{ checked: liked }}
          style={styles.likeBtn}
        >
          <Icon name="heart" size={16} color={liked ? colors.danger : colors.white} filled={liked} />
        </Pressable>
        {item.isBestseller ? (
          <View style={styles.flameBadge}>
            <Icon name="flame" size={11} color="#FF5A1F" />
            <Text variant="caption" color="#FF5A1F" weight="bold" style={{ marginLeft: 3 }}>
              Bestseller
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text variant="title" weight="bold" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
            {item.name}
          </Text>
          {item.isVeg ? <View style={[styles.vegMark, { borderColor: colors.success }]}><View style={[styles.vegDot, { backgroundColor: colors.success }]} /></View> : <View style={[styles.vegMark, { borderColor: colors.danger }]}><View style={[styles.vegDot, { backgroundColor: colors.danger }]} /></View>}
        </View>

        <View style={styles.metaRow}>
          <Rating value={item.rating} reviews={item.reviews} size={12} />
        </View>

        <View style={styles.priceRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text variant="title" weight="bold" color={colors.text}>
                {formatINR(item.price)}
              </Text>
              {item.mrp && item.mrp > item.price ? (
                <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 5, textDecorationLine: 'line-through' }}>
                  {formatINR(item.mrp)}
                </Text>
              ) : null}
            </View>
            {off > 0 ? (
              <Text variant="overline" color={colors.success} weight="bold">
                {off}% OFF
              </Text>
            ) : (
              <Text variant="caption" color={colors.textTertiary}>
                {item.prepTime} min
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => {
              haptic.medium();
              onPress(item);
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient colors={colors.brandGradient} style={styles.addBtnGrad}>
              <Icon name="plus" size={18} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function BestsellerCardSkeleton(): React.ReactElement {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={132} radius={0} />
      <View style={styles.info}>
        <Skeleton width="80%" height={15} />
        <Skeleton width="60%" height={11} style={{ marginTop: 8 }} />
        <Skeleton width="50%" height={11} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 172,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    height: 132,
  },
  thumb: {
    width: '100%',
    height: 132,
  },
  likeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E8',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  info: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vegMark: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaRow: {
    marginTop: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  addBtn: {
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
