import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { IconButton } from '@/components/ui/Button';
import { useColors, type Palette } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { haptic } from '@/lib/haptics';
import type { ModuleKey } from '@/types';

/**
 * `module_header_with_background_widget.dart`: gradient panel holding the
 * deliver-to row, the notification bell, the module switch and the search
 * entry. It sits above the scroll view (sticky), exactly like the reference.
 */
export function HomeHeader({
  module,
  greeting,
  onSearch,
  onBell,
  onCart,
  onLocation,
  bellBadge,
  style,
}: {
  module: ModuleKey;
  greeting: string;
  onSearch: () => void;
  onBell?: () => void;
  onCart?: () => void;
  onLocation?: () => void;
  bellBadge?: number;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const sheet = useSheet();
  const { selectedAddress, setModule, module: active, isLoggedIn, deliveryEtaLabel } = useSession();
  const CHIP = c.isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)';
  // Dark mode must use light-on-dark secondary text; the old dark rgba value
  // made the search placeholder and header metadata look black.
  const SOFT = c.isDark ? 'rgba(246,241,244,0.82)' : 'rgba(255,255,255,0.86)';

  const switchModule = async (): Promise<void> => {
    const next = await sheet.pick({
      title: 'Browse mode',
      subtitle: 'Menus, carts and offers follow the mode you pick',
      options: [
        { label: 'Food', value: 'food', description: 'Restaurants and cloud kitchens', icon: 'utensils' },
        { label: 'Shop', value: 'shop', description: 'Grocery, fashion, pharmacy and more', icon: 'store' },
      ],
    });
    if (!next || next === active) return;
    setModule(next as ModuleKey);
    haptic.selection();
  };

  return (
    <View style={[styles.hero, { backgroundColor: c.primary }, style]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
          onPress={() => {
            haptic.light();
            (onLocation ?? onSearch)();
          }}
          style={({ pressed }) => [styles.greetCard, pressed && { opacity: 0.86 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text variant="overline" color={SOFT}>
              DELIVER TO
            </Text>
            <Icon name="chevronDown" size={13} color={SOFT} />
          </View>
          <Text variant="subtitle" weight="semibold" color={c.onPrimary} numberOfLines={1}>
            {selectedAddress ? selectedAddress.label : isLoggedIn ? 'Add delivery address' : 'Choose location'}
          </Text>
          <Text variant="micro" color={SOFT} numberOfLines={1}>
            {selectedAddress ? shorten(selectedAddress.line) : greeting}
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <IconButton name="bell" tone="translucent" iconSize={19} badge={bellBadge} onPress={onBell} accessibilityLabel="Notifications" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.moduleRow}>
          {(['food', 'shop'] as ModuleKey[]).map((item) => {
            const on = active === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  if (on) void switchModule();
                  else setModule(item);
                  haptic.selection();
                }}
                onLongPress={() => void switchModule()}
                style={[styles.moduleChip, { backgroundColor: on ? c.onPrimary : CHIP }]}
              >
                <Icon name={item === 'food' ? 'utensils' : 'store'} size={15} color={on ? c.primary : c.onPrimary} />
                <Text variant="caption" weight="semibold" color={on ? c.primary : c.onPrimary}>
                  {item === 'food' ? 'Food' : 'Shop'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="clock" size={12} color={SOFT} />
          <Text variant="micro" color={SOFT}>
            {deliveryEtaLabel}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={() => {
          haptic.light();
          onSearch();
        }}
        style={({ pressed }) => [styles.search, pressed && { opacity: 0.92 }]}
      >
        <Icon name="search" size={17} color={SOFT} />
        <Text variant="subtitle" color={SOFT} numberOfLines={1} style={{ flex: 1 }}>
          {module === 'food' ? 'Search dishes and restaurants' : 'Search products and stores'}
        </Text>
        <View style={styles.searchGlyph}>
          <Icon name="sliders" size={14} color={c.primary} />
        </View>
      </Pressable>

    </View>
  );
}

function shorten(value: string): string {
  return value.length > 44 ? `${value.slice(0, 44)}…` : value;
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.edge, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    greetCard: { flex: 1, gap: 1, minHeight: 54 },
    actions: { flexDirection: 'row', alignItems: 'center' },
    moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    moduleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 46,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: c.isDark ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.24)',
    },
    searchGlyph: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: c.isDark ? 'rgba(0,0,0,0.22)' : c.white, alignItems: 'center', justifyContent: 'center' },
  });
}
