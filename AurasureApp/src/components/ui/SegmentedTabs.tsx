import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors, type Palette } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/** Underline-free pill segmented control used by orders / coupons / favourites. */
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  scrollable,
  style,
}: {
  tabs: { key: T; label: string; count?: number; icon?: IconName }[];
  active: T;
  onChange: (key: T) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}): React.ReactElement {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const body = tabs.map((tab) => {
    const on = tab.key === active;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => {
          haptic.selection();
          onChange(tab.key);
        }}
        style={[styles.tab, { backgroundColor: on ? c.primary : 'transparent' }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {tab.icon ? <Icon name={tab.icon} size={13} color={on ? c.onPrimary : c.textSecondary} /> : null}
          <Text variant="caption" weight="semibold" color={on ? c.onPrimary : c.textSecondary} numberOfLines={1}>
            {tab.count !== undefined ? `${tab.label} · ${tab.count}` : tab.label}
          </Text>
        </View>
      </Pressable>
    );
  });

  const inner = <View style={styles.row}>{body}</View>;
  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.edge, gap: 6 }} style={style}>
        {body}
      </ScrollView>
    );
  }
  return <View style={[styles.wrap, style]}>{inner}</View>;
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: spacing.edge, paddingTop: spacing.sm },
    row: { flexDirection: 'row', gap: 6, padding: 3, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
    tab: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  });
}
