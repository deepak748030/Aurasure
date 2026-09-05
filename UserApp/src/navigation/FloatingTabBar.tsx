import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from '@/lib/icons';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { useCart } from '@/context/CartContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * The reference app's bottom bar: a floating rounded pill with four tabs and a
 * raised centre action. Same shape here — Home · Favourite · [Cart FAB] ·
 * Orders · Menu — with the cart count on the FAB.
 */

const LABELS: Record<string, { label: string; icon: IconName }> = {
  Home: { label: 'Home', icon: 'home' },
  Favorites: { label: 'Saved', icon: 'heart' },
  Orders: { label: 'Orders', icon: 'orders' },
  Menu: { label: 'Menu', icon: 'menu' },
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => route.name !== 'Cart');
  const { totalCartCount } = useCart();

  const goTo = (name: string): void => {
    haptic.light();
    const index = state.routes.findIndex((r) => r.name === name);
    if (index >= 0) navigation.navigate(state.routes[index]?.name ?? name);
  };

  const cell = (name: string): React.ReactNode => {
    const meta = LABELS[name] ?? { label: name, icon: 'grid' as IconName };
    const focused = state.routes[state.index]?.name === name;
    return (
      <Pressable
        key={name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => goTo(name)}
        style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.plate, focused && { backgroundColor: c.primarySoft }]}>
          <Icon name={meta.icon} size={19} color={focused ? c.primary : c.textTertiary} filled={focused} />
        </View>
        <Text variant="micro" weight={focused ? 'bold' : 'medium'} color={focused ? c.primary : c.textTertiary}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6) }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: c.tabBar,
            borderColor: c.tabBarBorder,
            shadowColor: c.isDark ? 'transparent' : c.primary,
          },
        ]}
      >
        <View style={styles.row}>{routes.slice(0, 2).map((route) => cell(route.name))}</View>

        <View style={styles.fabSlot}>
          <CartFab onPress={() => goTo('Cart')} badge={totalCartCount} />
        </View>

        <View style={styles.row}>{routes.slice(2).map((route) => cell(route.name))}</View>
      </View>
    </View>
  );
}

function CartFab({ onPress, badge }: { onPress: () => void; badge: number }): React.ReactElement {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cart"
      onPress={() => {
        haptic.medium();
        onPress();
      }}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: c.primary,
          shadowColor: c.primary,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Icon name="cart" size={24} color={c.onPrimary} />
      {badge > 0 ? (
        <View style={[styles.badge, { borderColor: c.tabBar }]}>
          <Text variant="micro" weight="bold" color={c.white}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Used by the cart tab host to know it is the centre action (never visible). */
export const CART_TAB_HIDDEN = true;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: 6 },
  pill: {
    height: 64,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: { flexDirection: 'row', flex: 1, justifyContent: 'space-around' },
  cell: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 46 },
  plate: {
    width: 38,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSlot: { width: 66, height: '100%', alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 58,
    height: 58,
    transform: [{ translateY: -8 }],
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: '#E84D4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
