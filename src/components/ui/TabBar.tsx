import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { TAB_BAR_BOTTOM_PADDING, TAB_BAR_HEIGHT } from '@/lib/layout';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import { useModuleCart } from '@/hooks/useModuleCart';
import type { IconName } from '@/types';
import type { MainTabsParamList } from '@/navigation/types';

interface TabDef {
  key: keyof MainTabsParamList;
  label: string;
  icon: IconName;
}

/** Same five tabs for both modules - Home is the only screen that swaps. */
const TABS: TabDef[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Likes', label: 'Likes', icon: 'heart' },
  { key: 'Cart', label: 'Cart', icon: 'cart' },
  { key: 'Orders', label: 'Orders', icon: 'receipt' },
  { key: 'Menu', label: 'Menu', icon: 'menu' },
];

export function TabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const { module } = useApp();
  const { count } = useModuleCart();

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: kbHeight,
      duration: 220,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [kbHeight, translateY]);

  const active = module === 'food' ? colors.food[600] : colors.brand[600];

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + TAB_BAR_BOTTOM_PADDING, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const def = TABS.find((t) => t.key === route.name);
          if (!def) return null;
          const isFocused = state.index === index;
          const onPress = (): void => {
            haptic.light();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          const badge = def.key === 'Cart' ? count : 0;
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: isFocused }}>
              <View style={styles.iconBox}>
                <Icon name={def.icon} size={22} color={isFocused ? active : colors.textTertiary} filled={isFocused} />
                {badge > 0 ? (
                  <View style={styles.badge}>
                    <Text variant="caption" weight="bold" color={colors.white} style={{ fontSize: 9, lineHeight: 12 }}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                variant="caption"
                color={isFocused ? active : colors.textTertiary}
                weight={isFocused ? 'bold' : 'medium'}
                style={{ marginTop: 2 }}
              >
                {def.label}
              </Text>
              <View style={[styles.indicator, { backgroundColor: isFocused ? active : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Flat bar: solid surface with a hairline rule on top - no blur, no shadow.
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.food[600],
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 14,
    height: 3,
    borderRadius: radius.xs,
    marginTop: 4,
  },
});
