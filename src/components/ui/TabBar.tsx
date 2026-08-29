import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { TAB_BAR_BOTTOM_PADDING, TAB_BAR_HEIGHT } from '@/lib/layout';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

interface TabDef {
  key: string;
  label: string;
  icon: IconName;
  accent: string;
}

const TABS: TabDef[] = [
  { key: 'Food', label: 'Food', icon: 'utensils', accent: colors.food[500] },
  { key: 'Shop', label: 'Mart', icon: 'bag', accent: colors.brand[600] },
  { key: 'Search', label: 'Search', icon: 'search', accent: colors.brand[600] },
  { key: 'Orders', label: 'Orders', icon: 'receipt', accent: colors.brand[600] },
  { key: 'Profile', label: 'Profile', icon: 'user', accent: colors.brand[600] },
];

export function TabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [kbHeight, setKbHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;

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

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + TAB_BAR_BOTTOM_PADDING, transform: [{ translateY }] },
      ]}
    >
      <BlurView style={StyleSheet.absoluteFill} intensity={80} tint="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.86)' }]} pointerEvents="none" />
      <View style={styles.border} pointerEvents="none" />
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
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View style={styles.iconWrap}>
                {isFocused ? (
                  <LinearGradient colors={colors.brandGradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                ) : null}
                <Icon
                  name={def.icon}
                  size={21}
                  color={isFocused ? colors.white : colors.textTertiary}
                  filled={isFocused}
                />
              </View>
              <Text
                variant="caption"
                color={isFocused ? colors.brand[700] : colors.textTertiary}
                weight={isFocused ? 'bold' : 'medium'}
                style={{ marginTop: 4 }}
              >
                {def.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Flat: the hairline rule below replaces the old drop shadow.
  container: {
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 54,
    height: 36,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
