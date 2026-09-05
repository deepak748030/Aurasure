import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Icon } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { ModuleKey } from '@/types';

/**
 * Sticky "N items · total · View cart" strip that the reference app floats
 * above the content while you browse a store or menu.
 */
export function CartBar({
  count,
  total,
  module,
  onPress,
  label = 'View cart',
}: {
  count: number;
  total: number;
  module: ModuleKey;
  onPress: () => void;
  label?: string;
}): React.ReactElement | null {
  const c = useColors();
  if (count <= 0) return null;
  return (
    <View style={{ padding: spacing.edge, paddingBottom: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} · ${count} items · ${money(total)}`}
        onPress={() => {
          haptic.light();
          onPress();
        }}
        style={({ pressed }) => [styles.bar, { backgroundColor: c.primary, opacity: pressed ? 0.94 : 1 }]}
      >
        <View style={[styles.count, { backgroundColor: c.onPrimary }]}>
          <Text variant="caption" weight="bold" color={c.primary}>
            {count}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" weight="bold" color={c.onPrimary} numberOfLines={1}>
            {label}
          </Text>
          <Text variant="micro" color={c.isDark ? 'rgba(34,3,15,0.72)' : 'rgba(255,255,255,0.8)'} numberOfLines={1}>
            {money(total)} · {module === 'food' ? 'cart' : 'bag'} total
          </Text>
        </View>
        <Icon name="arrowRight" size={18} color={c.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  count: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
