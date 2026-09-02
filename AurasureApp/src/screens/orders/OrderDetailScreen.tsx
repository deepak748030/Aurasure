import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SmartImage } from '../../components/ui/SmartImage';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAppQuery } from '../../hooks/useAppQuery';
import { cancelOrder, fetchOrder } from '@/api/account';
import { isApiEnabled } from '@/api/config';
import { ApiError } from '@/api/client';
import { orders } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
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

  // Local cancel overrides: the moment the user cancels we show the cancelled
  // state instantly (demo mode) while the server state catches up on refresh.
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const raw = data;
  const order: Order | undefined =
    raw && cancelledIds.includes(raw.id) ? { ...raw, status: 'cancelled' } : raw;

  const currentIndex = order ? STEPS.indexOf(order.status) : -1;
  const cancellable = Boolean(order) && (order!.status === 'placed' || order!.status === 'confirmed');

  useEffect(() => {
    if (data && data.status === 'cancelled') {
      setCancelledIds((prev) => (prev.includes(data.id) ? prev : [...prev, data.id]));
    }
  }, [data]);

  const doCancel = async (): Promise<void> => {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelOrder(orderId);
      haptic.success();
      setCancelledIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
      setConfirming(false);
      // When a live server is connected, pull the authoritative (refunded) state.
      if (isApiEnabled) refresh();
      else setCancelledIds((prev) => (updated.status === 'cancelled' && !prev.includes(orderId) ? [...prev, orderId] : prev));
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'Could not cancel this order right now.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen
      title="Order details"
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {loading && !order ? (
        <View>
          <Card>
            <Skeleton width="45%" height={16} />
            <Skeleton width="30%" height={11} style={{ marginTop: 8 }} />
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              {[0, 1, 2, 3, 4].map((k) => (
                <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                  <Skeleton width={26} height={26} radius={13} />
                  <Skeleton width="70%" height={9} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          </Card>
          <Card variant="alt" style={{ marginTop: 14 }}>
            {[1, 2].map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', marginTop: k > 1 ? 12 : 0 }}>
                <Skeleton width={48} height={48} radius={6} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width="70%" height={12} />
                  <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : order ? (
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
              <Badge
                label={STEP_LABEL[order.status] ?? order.status}
                tone={order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'brand'}
              />
            </View>

            {order.status !== 'cancelled' ? (
              <>
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

                <View style={styles.etaRow}>
                  <Icon name="clock" size={14} color={colors.brand[600]} />
                  <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                    {order.etaMinutes > 0
                      ? order.status === 'delivered'
                        ? 'Delivered on time'
                        : `Arriving in ~${order.etaMinutes} min`
                      : 'Preparing your order'}
                  </Text>
                </View>

                {order.payBy === 'wallet' || (order.walletPaid ?? 0) > 0 ? (
                  <View style={styles.chipRow}>
                    <View style={styles.metaChip}>
                      <Icon name="wallet" size={12} color="#B07000" />
                      <Text variant="overline" weight="bold" color="#B07000" style={{ marginLeft: 4 }}>
                        PAID VIA WALLET
                      </Text>
                    </View>
                    <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 10 }}>
                      {formatINR(order.walletPaid ?? 0)} deducted
                    </Text>
                  </View>
                ) : null}

                {(order.loyaltyEarned ?? 0) > 0 ? (
                  <View style={styles.chipRow}>
                    <View style={[styles.metaChip, { backgroundColor: '#FFF7E0' }]}>
                      <Icon name="star" size={12} color="#B8860B" filled />
                      <Text variant="overline" weight="bold" color="#B8860B" style={{ marginLeft: 4 }}>
                        +{order.loyaltyEarned} POINTS EARNED
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Text variant="body" color={colors.danger}>
                  This order was cancelled.
                </Text>
                {(order.walletPaid ?? 0) > 0 ? (
                  <Text variant="caption" color={colors.success} style={{ marginTop: 6 }}>
                    {formatINR(order.walletPaid ?? 0)} was refunded to your wallet.
                  </Text>
                ) : null}
              </View>
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

          {order.instructions ? (
            <Card variant="alt" style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="info" size={15} color="#9C005E" />
                <Text variant="overline" weight="bold" color="#8B0057" style={{ marginLeft: 6 }}>
                  IF AN ITEM IS UNAVAILABLE
                </Text>
              </View>
              <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6 }}>
                {order.instructions}
              </Text>
            </Card>
          ) : null}

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
                <Text variant="body" color={colors.success}>
                  {order.couponCode ? `Coupon ${order.couponCode}` : 'Discount'}
                </Text>
                <Text variant="body" color={colors.success}>-{formatINR(order.discount)}</Text>
              </View>
            ) : null}
            <View style={[styles.billRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
              <Text variant="title" weight="bold" color={colors.text}>Total</Text>
              <Text variant="title" weight="bold" color={colors.text}>{formatINR(order.total)}</Text>
            </View>
          </Card>

          {cancellable ? (
            <View style={{ marginTop: 14 }}>
              <Button
                title={cancelling ? 'Cancelling…' : 'Cancel order'}
                variant="danger"
                size="lg"
                loading={cancelling}
                leftIcon="x"
                onPress={() => {
                  haptic.medium();
                  setCancelError(null);
                  setConfirming(true);
                }}
              />
              <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 8 }}>
                {!isApiEnabled
                  ? 'Cancelling refunds your wallet & reverses earned points instantly.'
                  : 'Wallet money is refunded and earned points are reversed on cancel.'}
              </Text>
            </View>
          ) : null}
          {cancelError ? (
            <Text variant="caption" color={colors.danger} style={{ textAlign: 'center', marginTop: 10 }}>
              {cancelError}
            </Text>
          ) : null}
          <View style={{ height: 8 }} />
        </>
      ) : (
        <View>
          <Card>
            <Skeleton width="45%" height={16} />
            <Skeleton width="30%" height={11} style={{ marginTop: 8 }} />
            <Skeleton width="80%" height={11} style={{ marginTop: 14 }} />
          </Card>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 18 }}>
            Order not found.
          </Text>
        </View>
      )}

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} title="Cancel this order?">
        <View>
          <View style={styles.warnIcon}>
            <Icon name="circleAlert" size={30} color={colors.warning} />
          </View>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
            Cancelling is instant and cannot be undone. Wallet-paid orders get their money refunded automatically.
          </Text>
          <Button
            title={cancelling ? 'Cancelling…' : 'Yes, cancel order'}
            variant="danger"
            size="lg"
            loading={cancelling}
            fullWidth
            style={{ marginTop: 18 }}
            onPress={() => void doCancel()}
          />
          <Button title="Keep order" variant="ghost" size="lg" fullWidth style={{ marginTop: 8 }} onPress={() => setConfirming(false)} />
        </View>
      </BottomSheet>
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
  etaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, backgroundColor: colors.brand[50], borderRadius: radius.sm, paddingVertical: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0E0',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  warnIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
