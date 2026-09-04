import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { vendorApi, type VendorOrder } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  placed: { label: 'New', color: '#2563EB', bg: '#EFF6FF' },
  confirmed: { label: 'Confirmed', color: '#0891B2', bg: '#ECFEFF' },
  preparing: { label: 'Preparing', color: '#D97706', bg: '#FFFBEB' },
  out_for_delivery: { label: 'Out for delivery', color: '#7C3AED', bg: '#F5F3FF' },
  delivered: { label: 'Delivered', color: '#16A34A', bg: '#F0FDF4' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2' },
};

const RUNNING_STATUSES = ['placed', 'confirmed', 'preparing', 'out_for_delivery'];
const HISTORY_STATUSES = ['delivered', 'cancelled'];

const FILTER_TABS = [
  { key: 'running', label: 'Running' },
  { key: 'history', label: 'History' },
];

function OrderCard({ order, onPress }: { order: VendorOrder; onPress: () => void }) {
  const sc = STATUS_CONFIG[order.status];
  const dateStr = new Date(order.placedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={() => { haptic.light(); onPress(); }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="title" weight="bold">#{order.code}</Text>
          <Text variant="caption" color={colors.textTertiary}>· {dateStr}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc?.bg ?? colors.surfaceAlt }]}>
          <Text
            variant="caption"
            weight="bold"
            style={{ color: sc?.color ?? colors.textSecondary, textTransform: 'capitalize' }}
          >
            {sc?.label ?? order.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {/* Items */}
      <Text
        variant="bodySm"
        color={colors.textSecondary}
        numberOfLines={2}
        style={{ marginTop: 6 }}
      >
        {order.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
      </Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="rupee" size={14} color={colors.textSecondary} />
          <Text variant="title" weight="bold">₹{Math.round(order.total)}</Text>
          <Text variant="caption" color={colors.textTertiary}>
            · {(order.payBy || 'COD').replace(/_/g, ' ')}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      </View>

      {/* Special note */}
      {order.instructions ? (
        <View style={styles.noteRow}>
          <Icon name="info" size={13} color={colors.warning} />
          <Text variant="caption" color={colors.warning} numberOfLines={1} style={{ flex: 1 }}>
            {order.instructions}
          </Text>
        </View>
      ) : null}

      {/* Rider OTP pill */}
      {order.status === 'out_for_delivery' && order.delivery?.pickupOtp ? (
        <View style={styles.otpRow}>
          <Icon name="bike" size={14} color={colors.brand[600]} />
          <Text variant="caption" weight="bold" color={colors.brand[700]} style={{ marginLeft: 6 }}>
            OTP: {order.delivery.pickupOtp}
          </Text>
          {order.delivery.riderName ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 4 }}>
              · {order.delivery.riderName}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function OrdersScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<'running' | 'history'>('running');
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await vendorApi.orders();
      setOrders(data.orders);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => void load(true), 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const displayed = orders.filter((o) =>
    tab === 'running'
      ? RUNNING_STATUSES.includes(o.status)
      : HISTORY_STATUSES.includes(o.status),
  );

  const newCount = orders.filter((o) => o.status === 'placed').length;

  return (
    <Screen
      title="Orders"
      subtitle={newCount > 0 ? `${newCount} new ticket${newCount > 1 ? 's' : ''} waiting` : undefined}
      scroll={false}
      padded={false}
    >
      {/* Filter tab bar */}
      <View style={styles.tabBar}>
        {FILTER_TABS.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === 'running'
              ? orders.filter((o) => RUNNING_STATUSES.includes(o.status)).length
              : orders.filter((o) => HISTORY_STATUSES.includes(o.status)).length;
          return (
            <Pressable
              key={t.key}
              onPress={() => { haptic.selection(); setTab(t.key as typeof tab); }}
              style={[styles.tabItem, active && styles.tabItemActive]}
            >
              <Text
                variant="subtitle"
                weight={active ? 'bold' : 'medium'}
                color={active ? colors.white : colors.textSecondary}
              >
                {t.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.30)' : colors.brand[100] }]}>
                  <Text variant="caption" weight="bold" color={active ? colors.white : colors.brand[700]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text variant="bodySm" color={colors.danger}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[
            { paddingTop: 0, paddingBottom: 32 },
            displayed.length === 0 && { flex: 1 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 'running' ? 'orders' : 'receipt'}
              title={tab === 'running' ? 'No active tickets' : 'No order history'}
              subtitle={
                tab === 'running'
                  ? 'New orders appear the moment a customer pays.'
                  : 'Completed and cancelled orders will show here.'
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: colors.brand[600],
  },
  tabBadge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.brand[50],
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.brand[100],
  },
});
