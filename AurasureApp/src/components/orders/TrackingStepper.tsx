import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { statusLabel, statusMessage, stepIndex } from '@/api/orders';
import { dayLabel, timeOfDay } from '@/lib/format';
import type { Order, OrderStatus } from '@/types';

/**
 * Vertical tracking stepper - `features/order/widgets/tracking_stepper_widget.dart`:
 * placed → confirmed → preparing → (ready for handover / on the way) →
 * delivered, with the store's own wording for each stage.
 */
const STEPS: { key: OrderStatus | 'ready'; label: string; icon: IconName }[] = [
  { key: 'placed', label: 'Order placed', icon: 'receipt' },
  { key: 'confirmed', label: 'Order confirmed', icon: 'circleCheck' },
  { key: 'preparing', label: 'Preparing your order', icon: 'utensils' },
  { key: 'ready', label: 'Ready for handover', icon: 'package' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
];

export function statusIcon(status: OrderStatus): IconName {
  switch (status) {
    case 'placed':
      return 'receipt';
    case 'confirmed':
      return 'circleCheck';
    case 'preparing':
      return 'utensils';
    case 'out_for_delivery':
      return 'bike';
    case 'delivered':
      return 'home';
    case 'cancelled':
      return 'circleX';
  }
}

export function orderTone(status: OrderStatus): 'primary' | 'success' | 'danger' | 'warning' {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'placed') return 'warning';
  return 'primary';
}

export function TrackingStepper({ order }: { order: Order }): React.ReactElement {
  const c = useColors();
  const current = stepIndex(order.status);
  const cancelled = order.status === 'cancelled';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cancelled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cancelled, pulse]);

  const steps = STEPS.map((step) =>
    step.key === 'ready'
      ? { ...step, label: order.status === 'out_for_delivery' ? 'Out for delivery' : 'Ready for handover', icon: (order.status === 'out_for_delivery' ? 'bike' : 'package') as IconName }
      : step,
  );

  const reachedIndex = (index: number): boolean => {
    if (cancelled) return index === 0;
    // `ready` shares the out_for_delivery slot on the server.
    const stepValue = steps[index]?.key === 'ready' ? 3 : index;
    return stepValue <= current;
  };

  return (
    <View style={{ gap: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: spacing.md }}>
        <View style={{ width: 30, height: 30, borderRadius: radius.pill, backgroundColor: cancelled ? c.dangerBg : orderTone(order.status) === 'success' ? c.successBg : c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={statusIcon(order.status)} size={15} color={cancelled ? c.danger : orderTone(order.status) === 'success' ? c.success : c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" weight="semibold">
            {statusLabel(order.status)}
          </Text>
          <Text variant="micro" tone="muted">
            {statusMessage(order.status)}
          </Text>
        </View>
      </View>

      {steps.map((step, index) => {
        const done = reachedIndex(index);
        const active = !cancelled && index === current;
        const last = index === steps.length - 1;
        return (
          <View key={step.key} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <Animated.View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? (cancelled && index === 0 ? c.danger : c.primary) : c.surface,
                  borderWidth: 1.5,
                  borderColor: done ? (cancelled && index === 0 ? c.danger : c.primary) : c.borderStrong,
                  transform: active ? [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] : [],
                }}
              >
                {done ? <Icon name="check" size={11} color={c.white} /> : <Icon name={step.icon} size={11} color={c.textTertiary} />}
              </Animated.View>
              {!last ? <View style={{ flex: 1, width: 2, minHeight: 26, backgroundColor: done && reachedIndex(index + 1) ? c.primary : c.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md, gap: 2 }}>
              <Text variant="bodySm" weight={active ? 'bold' : 'semibold'} tone={done ? 'default' : 'muted'}>
                {step.label}
              </Text>
              {index === 0 ? (
                <Text variant="micro" tone="faint">
                  {dayLabel(order.placedAt)} · {timeOfDay(order.placedAt)}
                </Text>
              ) : null}
              {order.status === 'delivered' && order.deliveredAt && last ? (
                <Text variant="micro" tone="faint">
                  {dayLabel(order.deliveredAt)} · {timeOfDay(order.deliveredAt)}
                </Text>
              ) : null}
              {order.status === 'cancelled' && last ? (
                <Text variant="micro" color={c.danger} numberOfLines={2}>
                  {order.cancelReason || 'Cancelled at your request'}
                </Text>
              ) : null}
              {active && index === 3 ? (
                <Text variant="micro" tone="muted">
                  {order.deliveryPartnerName ? `${order.deliveryPartnerName} is on the way` : 'Looking for a rider near you'}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
