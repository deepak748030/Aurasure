import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * The row primitive for every vertical list (addresses, orders, wallet
 * history, settings, search results…). Rows are deliberately flush:
 * `marginTop` is `spacing.listGap` = 0 and the separation comes from a hairline
 * divider, which is what keeps long lists scannable at zero gap.
 */

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: IconName;
  iconTone?: 'primary' | 'success' | 'danger' | 'warning' | 'muted';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  /** Hidden divider for the last row of a group. */
  last?: boolean;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
  badge?: string;
}

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  iconTone = 'primary',
  leading,
  trailing,
  onPress,
  onLongPress,
  selected,
  last,
  card,
  style,
  badge,
}: ListRowProps): React.ReactElement {
  const c = useColors();
  const toneColor =
    iconTone === 'success' ? c.success : iconTone === 'danger' ? c.danger : iconTone === 'warning' ? c.warning : iconTone === 'muted' ? c.textSecondary : c.primary;
  const toneBg =
    iconTone === 'success' ? c.successBg : iconTone === 'danger' ? c.dangerBg : iconTone === 'warning' ? c.warningBg : iconTone === 'muted' ? c.surfaceAlt : c.primarySoft;

  const inner = (
    <View style={[styles.row, selected && { backgroundColor: c.primaryFaint }]}>
      {leading ??
        (icon ? (
          <View style={[styles.plate, { backgroundColor: toneBg }]}>
            <Icon name={icon} size={17} color={toneColor} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="title" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {badge ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, backgroundColor: toneBg, flexShrink: 0 }}>
              <Text variant="micro" weight="semibold" color={toneColor} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text variant="bodySm" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevronRight" size={16} color={c.textTertiary} /> : null)}
    </View>
  );

  return (
    <View style={[card && { backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, style]}>
      {onPress || onLongPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!onPress) return;
            haptic.light();
            onPress();
          }}
          onLongPress={onLongPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
      {last ? null : <View style={styles.divider} />}
    </View>
  );
}

/** Section wrapper: title + flush rows, zero gaps inside. */
export function ListSection({
  title,
  action,
  onAction,
  children,
  style,
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  return (
    <View style={[{ marginTop: spacing.lg }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.edge, paddingBottom: spacing.xs }}>
          <Text variant="overline" tone="faint" style={{ flex: 1 }}>
            {title.toUpperCase()}
          </Text>
          {action ? (
            <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
              <Text variant="caption" weight="semibold" color={c.primary} numberOfLines={1}>
                {action}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

/** Horizontal strip of key/value chips (order totals, filter summaries). */
export function MetaRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'success' | 'danger' | 'muted' }): React.ReactElement {
  const c = useColors();
  const color = tone === 'success' ? c.success : tone === 'danger' ? c.danger : strong ? c.text : c.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text variant="bodySm" tone={strong ? 'default' : 'muted'}>
        {label}
      </Text>
      <Text variant={strong ? 'title' : 'bodySm'} weight={strong ? 'bold' : 'medium'} color={color}>
        {value}
      </Text>
    </View>
  );
}

export const rowDividerHeight = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    minHeight: 64,
  } as ViewStyle,
  plate: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120, 100, 118, 0.16)', marginLeft: 54 },
});
