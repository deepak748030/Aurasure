import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconBox } from '../ui/IconBox';
import { Text } from '../ui/Text';
import { colors } from '@/theme/colors';
import { radius, shadow } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { ShopCategory } from '@/types';

interface ShopCategoryCardProps {
  category: ShopCategory;
  onPress: (category: ShopCategory) => void;
  active?: boolean;
}

export function ShopCategoryCard({ category, onPress, active = false }: ShopCategoryCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(category);
      }}
      style={({ pressed }) => [
        styles.tile,
        active && { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
        { opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <IconBox icon={category.icon} size={52} radiusSize={16} tint={active ? colors.brand[100] : colors.surfaceAlt} iconColor={colors.brand[600]} />
      <Text variant="caption" color={colors.textSecondary} weight="semibold" style={{ marginTop: 8, textAlign: 'center' }}>
        {category.name}
      </Text>
    </Pressable>
  );
}

interface ShopCategoryRowProps {
  items: ShopCategory[];
  activeId?: string;
  onSelect: (category: ShopCategory) => void;
}

export function ShopCategoryRow({ items, activeId, onSelect }: ShopCategoryRowProps): React.ReactElement {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}>
      {items.map((c, i) => (
        <View key={c.id} style={{ marginRight: i === items.length - 1 ? 0 : 12 }}>
          <ShopCategoryCard category={c} onPress={onSelect} active={c.id === activeId} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 76,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
});
