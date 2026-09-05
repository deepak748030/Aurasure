import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Price, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { CartPill } from '@/components/cards/Cards';
import { needsChoices } from '@/hooks/useCartActions';
import type { CatalogItem, ModuleKey } from '@/types';

/**
 * Compact item row for search, category and see-all lists. Zero vertical gap
 * between rows; separated by a hairline; full-bleed.
 */
export function ItemRow({
  item,
  module,
  qty,
  favorite,
  onFavorite,
  onOpen,
  onAdd,
  onInc,
  onDec,
  last,
  outletName,
  showImage = true,
}: {
  item: CatalogItem;
  module: ModuleKey;
  qty: number;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  last?: boolean;
  outletName?: string;
  showImage?: boolean;
}): React.ReactElement {
  const c = useColors();
  const unavailable = module === 'food' ? item.isAvailable === false : item.inStock === false;
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: c.divider }}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}>
        {showImage ? (
          <View style={{ width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
            <SmartImage source={item.image} name={item.name} style={{ width: 72, height: 72 }} radiusOverride={radius.md} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {module === 'food' ? <VegMark veg={Boolean(item.isVeg)} /> : null}
            <Text variant="title" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
              {item.name}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Favourite" onPress={onFavorite} hitSlop={8} style={{ padding: 2 }}>
              <Icon name="heart" size={15} color={favorite ? c.danger : c.textTertiary} filled={favorite} />
            </Pressable>
          </View>
          {outletName ? (
            <Text variant="micro" tone="faint" numberOfLines={1}>
              {outletName}
            </Text>
          ) : null}
          {item.description ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {item.rating > 0 ? <RatingPill value={item.rating} count={item.reviews} compact /> : null}
            {item.isBestseller ? <Tag label="Bestseller" tone="warning" /> : null}
            {unavailable ? <Tag label="Unavailable" tone="danger" /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Price price={item.price} mrp={item.mrp} size="sm" />
            <View style={{ flex: 1 }} />
            {unavailable ? null : needsChoices(item) && qty === 0 ? (
              <Pressable accessibilityRole="button" onPress={onAdd} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: radius.pill, borderWidth: 1.2, borderColor: c.primary }}>
                <Icon name="sliders" size={12} color={c.primary} />
                <Text variant="micro" weight="bold" color={c.primary}>
                  CHOOSE
                </Text>
              </Pressable>
            ) : (
              <CartPill qty={qty} onAdd={onAdd} onInc={onInc} onDec={onDec} />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
});
