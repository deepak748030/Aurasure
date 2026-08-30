import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMockQuery } from '../../hooks/useMockQuery';
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

export function OrdersScreen({ navigation }: Props): React.ReactElement {
  const { module } = useApp();
  // Orders are shared history, but each module only shows its own.
  const { data, loading, refreshing, refresh } = useMockQuery(() => orders.filter((o) => o.module === module));
  const [list, setList] = useState<Order[]>(data);

  // keep local list in sync after refresh
  React.useEffect(() => setList(data), [data]);

  const open = (o: Order): void => {
    haptic.light();
    navigation.navigate('OrderDetail', { orderId: o.id });
  };

  return (
    <Screen title="Your Orders" subtitle={`${list.length} orders`} refreshing={refreshing} onRefresh={refresh}>
      {loading ? (
        [1, 2, 3].map((k) => (
          <View key={k} style={{ marginBottom: 12 }}>
            <View style={[styles.card, { padding: 14 }]}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="70%" height={11} style={{ marginTop: 10 }} />
              <Skeleton width="50%" height={13} style={{ marginTop: 10 }} />
            </View>
          </View>
        ))
      ) : list.length === 0 ? (
        <EmptyState icon="receipt" title="No orders yet" subtitle="Your orders will appear here once you place one." actionLabel="Browse food" onAction={() => switchTab('Home')} />
      ) : (
        list.map((o) => (
          <Pressable key={o.id} onPress={() => open(o)} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.96 : 1 }]}>
            <View style={styles.cardTop}>
              <View style={[styles.modIcon, { backgroundColor: o.module === 'food' ? colors.food[50] : colors.brand[50] }]}>
                <Icon name={o.module === 'food' ? 'utensils' : 'bag'} size={18} color={o.module === 'food' ? colors.food[600] : colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="bold" color={colors.text}>
                  {o.code}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {o.items.length} item(s) · {formatINR(o.total)}
                </Text>
              </View>
              <Badge label={STATUS_LABEL[o.status]} tone={STATUS_TONE[o.status]} />
            </View>
            <View style={styles.cardFoot}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="clock" size={14} color={colors.textTertiary} />
                <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 6 }}>
                  {o.status === 'delivered' || o.status === 'cancelled' ? 'Completed' : `Arriving in ${o.etaMinutes} min`}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
        ))
      )}
      <View style={{ height: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  modIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 },
});
