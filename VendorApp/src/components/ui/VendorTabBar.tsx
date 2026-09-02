import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Orders', label: 'Orders', icon: 'orders' },
  { key: 'Menu', label: 'Menu', icon: 'utensils' },
  { key: 'More', label: 'More', icon: 'menu' },
];

export function VendorTabBar({ state, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const def = TABS.find((t) => t.key === route.name);
        if (!def) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              haptic.light();
              navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <Icon name={def.icon} size={22} color={focused ? '#A4006B' : '#6E6577'} filled={focused} />
            <Text variant="caption" weight={focused ? 'bold' : 'medium'} color={focused ? '#A4006B' : '#6E6577'}>
              {def.label}
            </Text>
            <View style={[styles.dot, { backgroundColor: focused ? '#A4006B' : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#F5EAF3',
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  dot: { width: 14, height: 3, borderRadius: 2, marginTop: 4 },
});
