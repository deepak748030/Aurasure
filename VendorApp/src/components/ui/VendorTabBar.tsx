import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { haptic } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import type { IconName } from '@/types';

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Orders', label: 'Orders', icon: 'orders' },
  { key: 'Menu', label: 'Menu', icon: 'utensils' },
  { key: 'More', label: 'More', icon: 'menu' },
];

const BRAND = '#A4006B';
const INACTIVE = '#6E6577';

export function VendorTabBar({ state, navigation, descriptors }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const def = TABS.find((t) => t.key === route.name);
        if (!def) return null;
        const focused = state.index === index;
        const options = descriptors[route.key]?.options;
        // @ts-ignore – tabBarBadge is standard RN Nav but types may lag
        const badge = options?.tabBarBadge as number | string | undefined;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              haptic.light();
              navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <View style={{ position: 'relative' }}>
              <Icon name={def.icon} size={22} color={focused ? BRAND : INACTIVE} filled={focused} />
              {badge != null && Number(badge) > 0 ? (
                <View style={styles.badge}>
                  <Text variant="caption" weight="bold" color={colors.white} style={{ fontSize: 10, lineHeight: 14 }}>
                    {Number(badge) > 9 ? '9+' : badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              weight={focused ? 'bold' : 'medium'}
              color={focused ? BRAND : INACTIVE}
            >
              {def.label}
            </Text>
            <View style={[styles.dot, { backgroundColor: focused ? BRAND : 'transparent' }]} />
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
    // Subtle top shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  dot: { width: 14, height: 3, borderRadius: 2, marginTop: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#F5EAF3',
  },
});
