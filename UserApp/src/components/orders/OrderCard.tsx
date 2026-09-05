import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Tag } from '@/components/ui/Primitives';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { dayLabel, money, relative } from '@/lib/format';
import { isRunning, statusLabel } from '@/api/orders';
import { statusIcon } from './TrackingStepper';
import type { Order } from '@/types';

/** Order row used by the Orders tab and profile "recent orders". */
export function OrderCard({ order, onPress, onReorder }: { order: Order; onPress: () => void; onReorder?: () => void }): React.ReactElement {
  const c = useColors();
  const running = isRunning(order);
  const tone = order.status === 'cancelled' ? c.danger : order.status === 'delivered' ? c.success : c.primary;
  const items = order.items.slice(0, 3);
  const extra = order.items.length - items.length;
  const progress = running ? Math.min(100, (['placed', 'confirmed', 'preparing', 'out_for_delivery'].indexOf(order.status) + 1) * 25) : order.status === 'delivered' ? 100 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.96 : 1 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={[styles.plate, { backgroundColor: order.status === 'cancelled' ? c.dangerBg : order.status === 'delivered' ? c.successBg : c.primarySoft }]}>
          <Icon name={statusIcon(order.status)} size={16} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" weight="bold">
            {order.code}
          </Text>
          <Text variant="micro" tone="muted">
            {dayLabel(order.placedAt)} · {relative(order.placedAt)}
          </Text>
        </View>
        <Tag label={statusLabel(order.status)} tone={running ? 'primary' : order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'muted'} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        {items.map((line) => (
          <View key={line.id} style={{ width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
            <SmartImage source={line.image} name={line.name} style={{ width: 44, height: 44 }} radiusOverride={radius.sm} />
          </View>
        ))}
        {extra > 0 ? (
          <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="micro" weight="bold" tone="muted">
              +{extra}
            </Text>
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2, marginLeft: 2 }}>
          <Text variant="bodySm" weight="semibold" numberOfLines={1}>
            {order.items.map((line) => line.name).join(', ')}
          </Text>
          <Text variant="micro" tone="faint">
            {order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.module === 'food' ? 'Food' : 'Shop'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="title" weight="bold">
            {money(order.total)}
          </Text>
          <Text variant="micro" tone="faint">
            {order.payBy === 'wallet' ? 'Wallet' : 'Cash'}
          </Text>
        </View>
      </View>

      {running ? (
        <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
          </View>
          <Text variant="micro" tone="faint">
            {progress}%
          </Text>
        </View>
      ) : null}

      {onReorder && !running ? (
        <Pressable accessibilityRole="button" onPress={onReorder} hitSlop={6} style={({ pressed }) => [styles.reorder, { borderColor: c.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="refresh" size={14} color={c.primary} />
          <Text variant="caption" weight="bold" color={c.primary}>
            Reorder
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.edge, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, gap: 2 },
  plate: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: radius.pill },
  reorder: { alignSelf: 'flex-start', marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
});
