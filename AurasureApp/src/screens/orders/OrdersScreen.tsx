import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchOrders } from '@/api/account';
import { orders } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { switchTab } from '@/navigation/RootNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Order, OrderStatus } from '@/types';
import type { OrdersStackParamList } from '../../navigation/types';
import { useApp } from '@/context/AppContext';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Orders'>;

const STATUS_TONE: Record<OrderStatus, 'brand' | 'warning' | 'food' | 'success' | 'danger' | 'neutral'> = {
  placed: 'brand',
  confirmed: 'brand',
  preparing: 'warning',
  out_for_delivery: 'food',
  delivered: 'success',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Short progress caption under each order card (no bogus "0 min" ETAs). */
function progressCaption(o: Order): string {
  if (o.status === 'delivered') return 'Completed';
  if (o.status === 'cancelled') return 'Cancelled';
  if (o.etaMinutes > 0) return `Arriving in ~${o.etaMinutes} min`;
  switch (o.status) {
    case 'placed':
      return 'Waiting for the store to confirm';
    case 'confirmed':
      return 'Store confirmed';
    case 'preparing':
      return 'Being prepared';
    case 'out_for_delivery':
      return 'On the way';
  }
}

export function OrdersScreen({ navigation }: Props): React.ReactElement {
  const { module } = useApp();
  // Orders are shared history, but each module only shows its own.
  const { data, loading, refreshing, refresh } = useAppQuery(
    () => fetchOrders(module),
    () => orders.filter((o) => o.module === module),
    { deps: [module] },
  );
  const [list, setList] = useState<Order[]>(data);

  // keep local list in sync after refresh
  React.useEffect(() => setList(data), [data]);

  // Re-sync when the screen regains focus: orders may have been placed or
  // cancelled while the user was elsewhere (checkout, order details, admin).
  useFocusEffect(
    React.useCallback(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]),
  );

  const open = (o: Order): void => {
    haptic.light();
    navigation.navigate('OrderDetail', { orderId: o.id });
  };

  return (
    <Screen title="Your Orders" subtitle={`${list.length} orders`} refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        <View style={styles.listCard}>
          {[1, 2, 3].map((k, i) => (
            <View key={k} style={[styles.row, i > 0 ? styles.rowDivider : null]}>
              <View style={[styles.modIcon, { backgroundColor: colors.surfaceAlt }]} />
              <View style={{ flex: 1 }}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="30%" height={11} style={{ marginTop: 8 }} />
                <Skeleton width="55%" height={11} style={{ marginTop: 8 }} />
              </View>
            </View>
          ))}
        </View>
      ) : list.length === 0 ? (
        <EmptyState icon="receipt" title="No orders yet" subtitle="Your orders will appear here once you place one." actionLabel={module === 'food' ? 'Browse food' : 'Browse store'} onAction={() => switchTab('Home')} />
      ) : (
        <View style={styles.listCard}>
          {list.map((o, i) => (
            <Pressable
              key={o.id}
              onPress={() => open(o)}
              style={({ pressed }) => [
                styles.row,
                i > 0 ? styles.rowDivider : null,
                { backgroundColor: pressed ? '#FBF5FA' : 'transparent' },
              ]}
            >
              <View style={[styles.modIcon, { backgroundColor: o.module === 'food' ? colors.food[50] : colors.brand[50] }]}>
                <Icon name={o.module === 'food' ? 'utensils' : 'bag'} size={18} color={o.module === 'food' ? colors.food[600] : colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowHeadline}>
                  <Text variant="subtitle" weight="bold" color={colors.text} style={{ flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {o.code}
                  </Text>
                  <Badge label={STATUS_LABEL[o.status]} tone={STATUS_TONE[o.status]} />
                </View>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>
                  {o.items.length} item(s) · {formatINR(o.total)}
                </Text>
                <View style={styles.rowFoot}>
                  <Icon name="clock" size={13} color={colors.textTertiary} />
                  <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 6, flex: 1 }} numberOfLines={1}>
                    {progressCaption(o)}
                  </Text>
                  <Icon name="chevronRight" size={18} color={colors.textTertiary} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // All orders live inside one grouped card: no gaps between orders, each one
  // divided from the next by a single hairline rule (like a settings list).
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowHeadline: { flexDirection: 'row', alignItems: 'center' },
  rowFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  modIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
