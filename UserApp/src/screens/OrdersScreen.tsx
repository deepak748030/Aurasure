import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { OrderCard } from '@/components/orders/OrderCard';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/Primitives';
import { useQuery } from '@/hooks/useQuery';
import { listOrders } from '@/api/orders';
import { useCart, buildLine, type Selection } from '@/context/CartContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';
import type { Order, OrderStatus } from '@/types';

type Tab = 'running' | 'past' | 'cancelled';

export function OrdersScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { isLoggedIn } = useSession();
  const [tab, setTab] = useState<Tab>('running');

  const ordersQuery = useQuery<{ orders: Order[] }>(
    useCallback(
      async () => {
        const result = await listOrders({ status: tab === 'running' ? 'running' : undefined, limit: 30 });
        return { orders: result.orders };
      },
      [tab],
    ),
  );

  const rows = useMemo(() => {
    const all = ordersQuery.data?.orders ?? [];
    if (tab === 'running') return all.filter((order) => ['placed', 'confirmed', 'preparing', 'out_for_delivery'].includes(order.status));
    if (tab === 'cancelled') return all.filter((order) => order.status === 'cancelled');
    return all.filter((order) => order.status === 'delivered');
  }, [ordersQuery.data, tab]);

  const reorder = async (order: Order): Promise<void> => {
    if (!isLoggedIn) {
      sheet.show({ title: 'Sign in first', message: 'Reorder needs your account so we can rebuild the cart.', icon: 'user', tone: 'info', dismissLabel: 'Later', actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }] });
      return;
    }
    const module = order.module;
    cart.clear(module);
    order.items.forEach((line) => {
      const selection: Selection = {
        item: { id: line.refId, name: line.name, price: line.unitPrice, image: line.image } as never,
        qty: line.qty,
        outletName: order.outletId ?? undefined,
      };
      const built = { ...buildLine(module, selection), outletId: order.outletId ?? '', outletName: order.outletId ? `Outlet ${order.outletId.slice(-4)}` : 'Aurasure' };
      cart.add(module, built);
    });
    haptic.success();
    sheet.show({
      title: 'Added to your cart',
      message: `${order.items.length} item${order.items.length === 1 ? '' : 's'} from ${order.code} are in the cart. Prices are confirmed by the store at checkout.`,
      icon: 'cart',
      tone: 'success',
      dismissLabel: 'Keep shopping',
      actions: [{ label: 'Review cart', onPress: () => navigation.navigate('Cart'), variant: 'primary' }],
    });
  };

  if (!isLoggedIn) {
    return (
      <Screen title="Your orders" subtitle="Sign in to see the history">
        <EmptyState
          icon="orders"
          title="Not signed in"
          subtitle="Log in and every order you place shows up here with live tracking."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Auth', { mode: 'login' })}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Your orders" subtitle={rows.length > 0 ? `${rows.length} order${rows.length === 1 ? '' : 's'}` : 'Nothing yet'} padded={false} onRefresh={ordersQuery.refresh} refreshing={ordersQuery.refreshing}>
      <View style={{ paddingBottom: spacing.xs }}>
        <SegmentedTabs
          tabs={[
            { key: 'running', label: 'Running' },
            { key: 'past', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
          active={tab}
          onChange={(next) => setTab(next as Tab)}
        />
      </View>

      {ordersQuery.loading ? (
        <SkeletonList rows={4} thumb={32} />
      ) : ordersQuery.error ? (
        <ErrorState message={ordersQuery.error.message} onRetry={ordersQuery.refresh} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={tab === 'cancelled' ? 'circleX' : tab === 'past' ? 'package' : 'clock'}
          title={tab === 'running' ? 'No order in progress' : tab === 'past' ? 'No completed orders yet' : 'Nothing cancelled'}
          subtitle={tab === 'running' ? 'When you place an order its status shows up here.' : tab === 'past' ? 'Delivered orders land here with the receipt.' : 'Cancelled orders are kept for your records.'}
          actionLabel={tab === 'running' ? 'Browse food' : undefined}
          onAction={tab === 'running' ? () => navigation.navigate('Tabs') : undefined}
        />
      ) : (
        <View style={{ paddingBottom: spacing.lg }}>
          {rows.map((order) => (
            <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { id: order.id })} onReorder={() => void reorder(order)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

export const ORDER_TAB_STATUSES: Record<Tab, OrderStatus[]> = {
  running: ['placed', 'confirmed', 'preparing', 'out_for_delivery'],
  past: ['delivered'],
  cancelled: ['cancelled'],
};
