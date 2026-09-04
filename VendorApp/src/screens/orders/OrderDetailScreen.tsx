import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { vendorApi, type VendorOrder } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const STATUS_COLORS: Record<string, string> = {
  placed: '#2563EB',
  confirmed: '#0891B2',
  preparing: '#D97706',
  out_for_delivery: '#7C3AED',
  delivered: '#16A34A',
  cancelled: '#EF4444',
};

const STATUS_BG: Record<string, string> = {
  placed: '#EFF6FF',
  confirmed: '#ECFEFF',
  preparing: '#FFFBEB',
  out_for_delivery: '#F5F3FF',
  delivered: '#F0FDF4',
  cancelled: '#FEF2F2',
};

function StatusBadge({ status }: { status: string }) {
  const label = status === 'out_for_delivery' ? 'Out for delivery' : status.replace(/_/g, ' ');
  return (
    <View
      style={{
        backgroundColor: STATUS_BG[status] ?? '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <Text
        variant="caption"
        weight="bold"
        style={{ color: STATUS_COLORS[status] ?? colors.textSecondary, textTransform: 'capitalize' }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function OrderDetailScreen({ route, navigation }: Props): React.ReactElement {
  const { orderId } = route.params;
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      const data = await vendorApi.orders();
      const found = data.orders.find((o) => o.id === orderId);
      if (found) setOrder(found);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    timerRef.current = setInterval(() => void loadOrder(), 12000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadOrder]);

  const act = async (status: string) => {
    if (!order) return;
    setActing(true);
    try {
      const data = await vendorApi.advance(order.id, status);
      setOrder(data.order);
      haptic.success();
      if (status === 'cancelled') {
        navigation.goBack();
      }
    } catch (e) {
      haptic.error();
      Alert.alert('Error', e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const confirmReject = () => {
    Alert.alert('Reject Order?', 'This will cancel the order and notify the customer.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => void act('cancelled') },
    ]);
  };

  if (loading) {
    return (
      <Screen
        title={`Order`}
        headerLeft={
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <Icon name="chevronLeft" size={26} color={colors.text} />
          </TouchableOpacity>
        }
      >
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen
        title="Order"
        headerLeft={
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <Icon name="chevronLeft" size={26} color={colors.text} />
          </TouchableOpacity>
        }
      >
        <Text color={colors.danger}>{error || 'Order not found'}</Text>
      </Screen>
    );
  }

  const placedDate = new Date(order.placedAt);
  const dateStr = placedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = placedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <Screen
      title={`Order #${order.code}`}
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </TouchableOpacity>
      }
      headerRight={<StatusBadge status={order.status} />}
    >
      {/* Date & Time */}
      <SectionCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="calendar" size={18} color={colors.brand[600]} />
            <Text variant="bodySm" color={colors.textSecondary}>{dateStr}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="clock" size={18} color={colors.brand[600]} />
            <Text variant="bodySm" color={colors.textSecondary}>{timeStr}</Text>
          </View>
        </View>
      </SectionCard>

      {/* Order items */}
      <SectionCard>
        <Text variant="title" weight="semibold" style={{ marginBottom: 10 }}>Items Ordered</Text>
        {order.items.map((item, i) => (
          <View
            key={`${item.name}-${i}`}
            style={[
              styles.itemRow,
              i < order.items.length - 1 ? { borderBottomWidth: 1, borderColor: colors.border } : null,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.qtyBadge}>
                <Text variant="caption" weight="bold" color={colors.brand[700]}>{item.qty}×</Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>{item.name}</Text>
            </View>
            <Text variant="title" weight="semibold">₹{Math.round(item.qty * item.unitPrice)}</Text>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderColor: colors.border, marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="title" weight="bold">Total</Text>
          <Text variant="title" weight="bold" style={{ color: colors.brand[700] }}>₹{Math.round(order.total)}</Text>
        </View>
      </SectionCard>

      {/* Payment */}
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="wallet" size={20} color={colors.brand[600]} />
          <View>
            <Text variant="caption" color={colors.textSecondary}>Payment Method</Text>
            <Text variant="title" weight="semibold" style={{ textTransform: 'capitalize' }}>
              {(order.payBy || 'COD').replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Special instructions */}
      {order.instructions ? (
        <SectionCard>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Icon name="info" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="semibold" color={colors.warning}>Special Instructions</Text>
              <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>{order.instructions}</Text>
            </View>
          </View>
        </SectionCard>
      ) : null}

      {/* Delivery info */}
      {order.delivery ? (
        <SectionCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="bike" size={20} color={colors.brand[600]} />
            <Text variant="title" weight="semibold">Delivery</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Text variant="caption" color={colors.textSecondary}>Pickup OTP</Text>
            <View style={styles.otpBox}>
              <Text variant="h2" weight="extrabold" style={{ color: colors.brand[700], letterSpacing: 4 }}>
                {order.delivery.pickupOtp}
              </Text>
            </View>
          </View>
          {order.delivery.riderName ? (
            <View style={styles.deliveryRow}>
              <Icon name="user" size={16} color={colors.textSecondary} />
              <Text variant="bodySm" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                {order.delivery.riderName}
                {order.delivery.riderPhone ? ` · ${order.delivery.riderPhone}` : ''}
              </Text>
              <View style={{ marginLeft: 'auto' }}>
                <Text variant="caption" weight="bold" style={{ color: STATUS_COLORS[order.delivery.state] ?? colors.textSecondary, textTransform: 'capitalize' }}>
                  {order.delivery.state.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="bodySm" color={colors.textSecondary}>Waiting for a rider to accept…</Text>
          )}
        </SectionCard>
      ) : null}

      {/* Action buttons */}
      {acting ? (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <View style={{ gap: 10, paddingTop: 4, paddingBottom: 12 }}>
          {order.status === 'placed' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Accept" size="md" onPress={() => void act('confirmed')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Reject" size="md" variant="danger" onPress={confirmReject} />
              </View>
            </View>
          ) : null}
          {order.status === 'confirmed' ? (
            <Button title="Start Preparing" size="md" leftIcon="chef" onPress={() => void act('preparing')} />
          ) : null}
          {order.status === 'preparing' ? (
            <Button title="Ready for Pickup" size="md" leftIcon="circleCheck" onPress={() => void act('out_for_delivery')} />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  qtyBadge: {
    backgroundColor: colors.brand[50],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpBox: {
    backgroundColor: colors.brand[50],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
});
