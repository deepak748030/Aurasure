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
  { key: 'Home',     label: 'Home',     icon: 'home' },
  { key: 'Tasks',    label: 'Tasks',    icon: 'orders' },
  { key: 'Earnings', label: 'Earnings', icon: 'rupee' },
  { key: 'Profile',  label: 'Profile',  icon: 'user' },
];

const ACTIVE = '#16A34A';   // Green — rider online feel
const INACTIVE = '#6E7580';

export function RiderTabBar({ state, navigation, descriptors }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const def = TABS.find((t) => t.key === route.name);
        if (!def) return null;
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        // @ts-ignore
        const badge = options.tabBarBadge as number | string | undefined;

        return (
          <Pressable
            key={route.key}
            onPress={() => { haptic.light(); navigation.navigate(route.name); }}
            style={styles.tab}
          >
            <View style={{ position: 'relative' }}>
              {focused ? (
                <View style={styles.activeIconBg}>
                  <Icon name={def.icon} size={20} color={ACTIVE} filled />
                </View>
              ) : (
                <Icon name={def.icon} size={22} color={INACTIVE} />
              )}
              {badge != null && Number(badge) > 0 ? (
                <View style={styles.badge}>
                  <Text variant="caption" weight="bold" color="#fff" style={{ fontSize: 10, lineHeight: 14 }}>
                    {Number(badge) > 9 ? '9+' : badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="caption" weight={focused ? 'bold' : 'medium'} color={focused ? ACTIVE : INACTIVE}>
              {def.label}
            </Text>
            {focused ? <View style={styles.dot} /> : <View style={{ height: 3, marginTop: 4 }} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#EAF5EA',   // Soft green tint — rider theme
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  activeIconBg: {
    width: 40,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#16A34A18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 14, height: 3, borderRadius: 2, backgroundColor: ACTIVE, marginTop: 4 },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 18, height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2, borderColor: '#EAF5EA',
  },
});
