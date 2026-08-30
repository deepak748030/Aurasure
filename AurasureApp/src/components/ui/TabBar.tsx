import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { layout, radius } from '@/theme/tokens';
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
  { key: 'Likes', label: 'Favourite', icon: 'heart' },
  { key: 'Cart', label: '', icon: 'cart' },
  { key: 'Orders', label: 'Orders', icon: 'orders' },
  { key: 'Menu', label: 'Menu', icon: 'menu' },
];

const CENTER_COLOR = '#A4006B';
// Unfocused ink. colors.textTertiary (#98A1B3) is too light against the plum
// bar - the outline glyphs disappeared into it at 22px.
const IDLE_COLOR = '#6E6577';
const ICON_SIZE = 23;

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

          if (def.key === 'Cart') {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.centerTab} accessibilityRole="button" accessibilityState={{ selected: isFocused }}>
                <LinearGradient colors={[CENTER_COLOR, '#6E003F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centerButton}>
                  <Icon name={def.icon} size={28} color={colors.white} filled />
                  {badge > 0 ? (
                    <View style={styles.centerBadge}>
                      <Text variant="caption" weight="bold" color={colors.white} style={{ fontSize: 9, lineHeight: 12 }}>
                        {badge > 99 ? '99+' : badge}
                      </Text>
                    </View>
                  ) : null}
                </LinearGradient>
                {isFocused ? (
                  <Text variant="caption" weight="bold" color={CENTER_COLOR} style={{ marginTop: 4 }}>
                    Cart
                  </Text>
                ) : null}
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: isFocused }}>
              <View style={styles.iconBox}>
                <Icon
                  name={def.icon}
                  size={ICON_SIZE}
                  color={isFocused ? CENTER_COLOR : IDLE_COLOR}
                  filled={isFocused}
                />
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
                color={isFocused ? CENTER_COLOR : IDLE_COLOR}
                weight={isFocused ? 'bold' : 'medium'}
                style={{ marginTop: 2 }}
              >
                {def.label}
              </Text>
              <View style={[styles.indicator, { backgroundColor: isFocused ? CENTER_COLOR : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Purple tab bar with a raised center cart button, matching the live app.
  container: {
    backgroundColor: '#F5EAF3',
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    // Matches the 6px screen gutter so the tab row lines up with every screen.
    paddingHorizontal: layout.contentHorizontalPadding,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5EAF3',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 46,
    height: 30,
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
    backgroundColor: CENTER_COLOR,
    borderWidth: 2,
    borderColor: '#F5EAF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 14,
    height: 3,
    borderRadius: radius.xs,
    marginTop: 4,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#F5EAF3',
  },
  centerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: CENTER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
