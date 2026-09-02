import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SmartImage } from '../ui/SmartImage';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { FoodCategory } from '@/types';

interface FoodCategoryCirclesProps {
  items: FoodCategory[];
  activeId?: string;
  onSelect: (id: string) => void;
}

/** Skeleton twin of the circle rail - same geometry, shown while loading. */
export function FoodCategoryCirclesSkeleton(): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: layout.contentHorizontalPadding, gap: 4 }}
      style={{ marginHorizontal: -layout.contentHorizontalPadding }}
    >
      {[1, 2, 3, 4, 5].map((k) => (
        <View key={k} style={styles.item}>
          <Skeleton width={68} height={68} radius={34} />
          <Skeleton width={46} height={10} radius={5} style={{ marginTop: 8 }} />
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Image-based category row (Biryani, Chowmin, Pizza...): round photo with a
 * brand ring when selected, name underneath. Tapping toggles the filter.
 */
export function FoodCategoryCircles({ items, activeId, onSelect }: FoodCategoryCirclesProps): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: layout.contentHorizontalPadding, gap: 4 }}
      style={{ marginHorizontal: -layout.contentHorizontalPadding }}
    >
      {items.map((c) => {
        const active = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              haptic.selection();
              onSelect(c.id);
            }}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.circleWrap, active && styles.circleActive]}>
              <SmartImage source={c.image ?? null} placeholderIcon={c.icon} style={styles.circle} tint={colors.food[100]} />
            </View>
            <Text
              variant="caption"
              color={active ? colors.food[700] : colors.textSecondary}
              weight={active ? 'bold' : 'semibold'}
              numberOfLines={1}
              style={{ marginTop: 6 }}
            >
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const CIRCLE = 68;

const styles = StyleSheet.create({
  item: {
    width: 82,
    alignItems: 'center',
  },
  circleWrap: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    padding: 3,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  circle: {
    width: CIRCLE - 6,
    height: CIRCLE - 6,
    borderRadius: (CIRCLE - 6) / 2,
    backgroundColor: colors.food[50],
  },
  circleActive: {
    borderColor: colors.food[500],
  },
});
