import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { haptic } from '@/lib/haptics';
import { colors } from '@/theme/colors';
import type { IconName } from '@/types';
const TABS: { key: string; label: string; icon: IconName }[] = [{ key: 'Home', label: 'Home', icon: 'home' }, { key: 'Orders', label: 'Orders', icon: 'orders' }, { key: 'Menu', label: 'Menu', icon: 'utensils' }, { key: 'More', label: 'More', icon: 'menu' }];
export function VendorTabBar({ state, navigation, descriptors }: BottomTabBarProps): React.ReactElement { const insets = useSafeAreaInsets(); return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>{state.routes.map((route, index) => { const def = TABS.find((tab) => tab.key === route.name); if (!def) return null; const focused = state.index === index; const badge = descriptors[route.key]?.options.tabBarBadge; return <Pressable key={route.key} onPress={() => { haptic.light(); navigation.navigate(route.name); }} style={styles.tab}><View style={{ position: 'relative' }}><Icon name={def.icon} size={22} color={focused ? colors.brand[700] : colors.textTertiary} filled={focused} />{badge != null ? <View style={styles.badge}><Text variant="caption" weight="bold" color={colors.white}>{Number(badge) > 9 ? '9+' : badge}</Text></View> : null}</View><Text variant="caption" weight={focused ? 'bold' : 'medium'} color={focused ? colors.brand[700] : colors.textSecondary}>{def.label}</Text><View style={[styles.dot, { backgroundColor: focused ? colors.brand[600] : 'transparent' }]} /></Pressable>; })}</View>; }
const styles = StyleSheet.create({ bar: { flexDirection: 'row', backgroundColor: colors.surface, paddingTop: 9, borderTopWidth: 1, borderColor: colors.border }, tab: { flex: 1, alignItems: 'center', gap: 3 }, dot: { width: 16, height: 3, borderRadius: 2, marginTop: 3 }, badge: { position: 'absolute', top: -5, right: -9, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: colors.surface } });
