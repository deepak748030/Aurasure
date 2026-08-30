import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useModuleCart } from '@/hooks/useModuleCart';
import { switchTab } from '@/navigation/RootNavigation';

/** Header shortcut to the Cart tab, badged with the active module's line count. */
export function CartButton(): React.ReactElement {
  const { count } = useModuleCart();
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        switchTab('Cart');
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Cart, ${count} items` : 'Cart'}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name="cart" size={20} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text variant="caption" color={colors.white} weight="bold" style={{ fontSize: 10, lineHeight: 14 }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.food[600],
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
