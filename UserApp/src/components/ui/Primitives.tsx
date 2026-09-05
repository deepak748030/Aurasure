import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { SmartImage } from './SmartImage';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { money as inr } from '@/lib/format';

/* ------------------------------- Chip / tag ------------------------------ */

export function Chip({
  label,
  icon,
  selected,
  onPress,
  size = 'md',
  right,
  style,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  const height = size === 'sm' ? 30 : 36;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        if (!onPress) return;
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? 10 : 13,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: selected ? c.primary : c.surface,
          borderWidth: 1,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 13 : 15} color={selected ? c.onPrimary : c.textSecondary} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'subtitle'} weight="semibold" color={selected ? c.onPrimary : c.text} numberOfLines={1}>
        {label}
      </Text>
      {right}
    </Pressable>
  );
}

/** Tiny corner tag: "FLAT 20% OFF", "NEW", "CLOSED"… */
export function Tag({
  label,
  tone = 'primary',
  icon,
  style,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'muted' | 'info';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  const bg =
    tone === 'success'
      ? c.successBg
      : tone === 'danger'
        ? c.dangerBg
        : tone === 'warning'
          ? c.warningBg
          : tone === 'info'
            ? c.infoBg
            : tone === 'muted'
              ? c.surfaceAlt
              : c.primarySoft;
  const fg =
    tone === 'success'
      ? c.success
      : tone === 'danger'
        ? c.danger
        : tone === 'warning'
          ? c.warning
          : tone === 'info'
            ? c.info
            : tone === 'muted'
              ? c.textSecondary
              : c.primary;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.sm, backgroundColor: bg, flexShrink: 1, minWidth: 0 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={10} color={fg} /> : null}
      <Text variant="micro" weight="semibold" color={fg} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/* --------------------------------- rating -------------------------------- */

export function RatingPill({
  value,
  count,
  suffix,
  compact,
}: {
  value: number;
  count?: number;
  suffix?: string;
  compact?: boolean;
}): React.ReactElement {
  const c = useColors();
  const v = Number(value) || 0;
  const tone = v >= 4.5 ? c.success : v >= 4 ? c.primary : v >= 3 ? c.warning : c.danger;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, rowGap: 2, flexWrap: 'wrap', minWidth: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          flexShrink: 0,
          backgroundColor: v >= 4.5 ? c.successBg : c.surfaceAlt,
          paddingHorizontal: compact ? 5 : 7,
          paddingVertical: compact ? 2 : 3,
          borderRadius: radius.sm,
        }}
      >
        <Icon name="star" size={compact ? 10 : 12} color={tone} filled />
        <Text variant={compact ? 'micro' : 'caption'} weight="semibold" color={tone} numberOfLines={1}>
          {v > 0 ? v.toFixed(1) : 'New'}
        </Text>
      </View>
      {typeof count === 'number' && count > 0 ? (
        <Text variant="caption" tone="faint" numberOfLines={1}>
          ({count.toLocaleString('en-IN')})
        </Text>
      ) : null}
      {suffix ? (
        <Text variant="caption" tone="faint" numberOfLines={1} style={{ flexShrink: 1, minWidth: 0 }}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

export function VegMark({ veg }: { veg: boolean }): React.ReactElement {
  const c = useColors();
  const color = veg ? c.veg : c.nonVeg;
  return (
    <View
      accessibilityLabel={veg ? 'Vegetarian' : 'Non-vegetarian'}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        borderWidth: 1.2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

/* ---------------------------------- price -------------------------------- */

export function Price({
  price,
  mrp,
  size = 'md',
  trailing,
}: {
  price: number;
  mrp?: number;
  size?: 'sm' | 'md' | 'lg';
  trailing?: string;
}): React.ReactElement {
  const c = useColors();
  const strike = mrp && mrp > price;
  const variant = size === 'lg' ? 'h3' : size === 'sm' ? 'title' : 'subtitle';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexShrink: 1, minWidth: 0 }}>
      <Text variant={variant} weight="semibold" color={c.text} numberOfLines={1}>
        {inr(price)}
      </Text>
      {strike ? (
        <Text variant="caption" tone="faint" numberOfLines={1} style={{ textDecorationLine: 'line-through' }}>
          {inr(mrp ?? 0)}
        </Text>
      ) : null}
      {trailing ? (
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------ section header --------------------------- */

/**
 * The reference app marks every home section with a 4px primary bar next to the
 * title - kept here so section titles read the same everywhere.
 */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
}): React.ReactElement {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.edge,
        paddingTop: spacing.section,
        paddingBottom: spacing.sm,
      }}
    >
      <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: c.primary }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {icon ? <Icon name={icon} size={15} color={c.primary} /> : null}
          <Text variant="h3" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic.light();
            onAction?.();
          }}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 }}
        >
          <Text variant="caption" weight="semibold" color={c.primary} numberOfLines={1}>
            {actionLabel}
          </Text>
          <Icon name="chevronRight" size={13} color={c.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* -------------------------------- dividers ------------------------------- */

export function Divider({ inset = true }: { inset?: boolean }): React.ReactElement {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.divider, marginLeft: inset ? spacing.edge : 0 }} />;
}

/**
 * Vertical gap helper. Lists pass 0 so rows touch (project rule); only
 * between-section spacing is allowed to be non-zero.
 */
export function Gap({ size = 0, horizontal }: { size?: number; horizontal?: boolean }): React.ReactElement {
  return <View style={horizontal ? { width: size } : { height: size }} />;
}

/* ----------------------------- quantity stepper -------------------------- */

/** 76×28 outlined stepper — the exact shape the 6amMart item card uses. */
export function QtyStepper({
  qty,
  onChange,
  compact,
  max = 20,
}: {
  qty: number;
  onChange: (next: number) => void;
  compact?: boolean;
  max?: number;
}): React.ReactElement {
  const c = useColors();
  const width = compact ? 76 : 104;
  const height = compact ? 28 : 34;
  const step = (delta: number): void => {
    const next = Math.max(0, Math.min(max, qty + delta));
    if (next === qty) return;
    haptic.selection();
    onChange(next);
  };
  return (
    <View
      style={{
        width,
        height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
        borderRadius: radius.pill,
        borderWidth: 1.2,
        borderColor: c.primary,
        backgroundColor: c.primaryFaint,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={() => step(-1)}
        style={{
          width: compact ? 22 : 28,
          height: compact ? 22 : 28,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: qty <= 0 ? 'transparent' : `${c.primary}22`,
        }}
      >
        <Icon name={qty <= 1 ? 'trash' : 'minus'} size={compact ? 12 : 14} color={c.primary} />
      </Pressable>
      <Text variant={compact ? 'caption' : 'title'} weight="semibold" color={c.primary}>
        {qty}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={() => step(1)}
        style={{
          width: compact ? 22 : 28,
          height: compact ? 22 : 28,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${c.primary}22`,
        }}
      >
        <Icon name="plus" size={compact ? 12 : 14} color={c.primary} />
      </Pressable>
    </View>
  );
}

/* -------------------------------- avatar --------------------------------- */

export function Avatar({
  name,
  size = 44,
  uri,
  ring,
}: {
  name: string;
  size?: number;
  uri?: string | null;
  ring?: boolean;
}): React.ReactElement {
  const c = useColors();
  if (uri) {
    return <SmartImage source={{ kind: 'uri', uri }} rounded style={{ width: size, height: size }} radiusOverride={radius.pill} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primarySoft,
        borderWidth: ring ? 2 : 0,
        borderColor: c.white,
      }}
    >
      {/* The fallback avatar fills the circle instead of leaving a small
          floating glyph or an empty inner ring. */}
      <Icon name="userRound" size={size * 0.62} color={c.primary} />
    </View>
  );
}

/* ------------------------------ empty / error ---------------------------- */

// Lives in its own leaf module so ErrorState can use it without a
// Primitives <-> ErrorState require cycle. Re-exported here so existing
// `from '@/components/ui/Primitives'` imports keep working.
export { EmptyState } from './EmptyState';

/* ------------------------------ thin progress ---------------------------- */

export function Progress({ value, tone }: { value: number; tone?: string }): React.ReactElement {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: tone ?? c.primary }} />
    </View>
  );
}

export { ErrorState } from './ErrorState';
