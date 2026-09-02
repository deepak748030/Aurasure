import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SmartImage } from '../../components/ui/SmartImage';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchOrder } from '@/api/account';
import { orders } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Order, OrderStatus } from '@/types';
import type { OrdersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

const STEPS: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
};

export function OrderDetailScreen({ route, navigation }: Props): React.ReactElement {
  const { orderId } = route.params;
  const { data, loading, refreshing, refresh } = useAppQuery<Order | undefined>(
    () => fetchOrder(orderId),
    () => orders.find((o) => o.id === orderId),
  );

  const order = data;
  const currentIndex = order ? STEPS.indexOf(order.status) : -1;

  return (
    <Screen
      title="Order details"
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {order ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text variant="title" weight="bold" color={colors.text}>
                  {order.code}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {order.module === 'food' ? 'Food delivery' : 'Shopping order'}
                </Text>
              </View>
              <Badge label={STEP_LABEL[order.status] ?? order.status} tone={order.status === 'delivered' ? 'success' : 'brand'} />
            </View>

            {order.status !== 'cancelled' ? (
              <View style={{ flexDirection: 'row', marginTop: 18 }}>
                {STEPS.map((s, i) => {
                  const done = i <= currentIndex;
                  const last = i === STEPS.length - 1;
                  return (
                    <View key={s} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={[styles.stepDot, done ? styles.stepDone : null]}>
                        <Icon name="check" size={14} color={done ? colors.white : colors.textTertiary} />
                      </View>
                      {!last ? <View style={[styles.stepLine, done ? styles.stepLineDone : null]} /> : null}
                      <Text variant="caption" color={done ? colors.text : colors.textTertiary} style={{ marginTop: 6, textAlign: 'center' }}>
                        {STEP_LABEL[s]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text variant="body" color={colors.danger} style={{ marginTop: 14 }}>
                This order was cancelled.
              </Text>
            )}
          </Card>

          <Card variant="alt" style={{ marginTop: 14 }}>
            <Text variant="title" weight="bold" color={colors.text}>
              Items
            </Text>
            {order.items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <SmartImage source={it.image} placeholderIcon={it.kind === 'food' ? 'utensils' : 'bag'} style={styles.itemImg} tint={colors.brand[50]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="subtitle" weight="semibold" color={colors.text} numberOfLines={1}>
                    {it.name}
                  </Text>
                  {it.meta ? <Text variant="caption" color={colors.textSecondary}>{it.meta}</Text> : null}
                  <Text variant="caption" color={colors.textTertiary}>
                    Qty {it.qty} · {formatINR(it.unitPrice * it.qty)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>

          <Card variant="alt" style={{ marginTop: 14 }}>
            <Text variant="title" weight="bold" color={colors.text}>
              Delivery address
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <Icon name="mapPin" size={16} color={colors.brand[600]} />
              <Text variant="body" color={colors.textSecondary} style={{ marginLeft: 8, flex: 1 }}>
                {order.address}
              </Text>
            </View>
          </Card>

          <Card variant="alt" style={{ marginTop: 14 }}>
            <View style={styles.billRow}>
              <Text variant="body" color={colors.textSecondary}>Item total</Text>
              <Text variant="body" color={colors.text}>{formatINR(order.itemTotal)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text variant="body" color={colors.textSecondary}>Delivery fee</Text>
              <Text variant="body" color={order.deliveryFee === 0 ? colors.success : colors.text}>{order.deliveryFee === 0 ? 'FREE' : formatINR(order.deliveryFee)}</Text>
            </View>
            {order.discount > 0 ? (
              <View style={styles.billRow}>
                <Text variant="body" color={colors.success}>Discount</Text>
                <Text variant="body" color={colors.success}>-{formatINR(order.discount)}</Text>
              </View>
            ) : null}
            <View style={[styles.billRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
              <Text variant="title" weight="bold" color={colors.text}>Total</Text>
              <Text variant="title" weight="bold" color={colors.text}>{formatINR(order.total)}</Text>
            </View>
          </Card>
          <View style={{ height: 8 }} />
        </>
      ) : (
        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 30 }}>
          Order not found.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  stepLine: {
    position: 'absolute' as const,
    top: 13,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  stepLineDone: { backgroundColor: colors.brand[600] },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  itemImg: { width: 48, height: 48, borderRadius: radius.sm },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
