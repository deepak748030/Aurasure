import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

/** Which order statuses belong under each tab. Declared before the component
 *  because the grouping below reads it during render (`const` is not hoisted). */
export const ORDER_TAB_STATUSES: Record<Tab, OrderStatus[]> = {
  running: ['placed', 'confirmed', 'preparing', 'out_for_delivery'],
  past: ['delivered'],
  cancelled: ['cancelled'],
};

export function OrdersScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { isLoggedIn } = useSession();
  const [tab, setTab] = useState<Tab>('running');

  /**
   * One fetch for every tab. Asking the server per-tab meant the "Running" tab
   * depended on `status=running` resolving server-side, and it re-fetched on
   * every tab tap; the three tabs are just three views of the same 30 rows, so
   * they are partitioned on the client instead.
   */
  const ordersQuery = useQuery<{ orders: Order[] }>(
    useCallback(async (signal: AbortSignal) => {
      const result = await listOrders({ limit: 50 }, signal);
      return { orders: result.orders };
    }, []),
    { enabled: isLoggedIn },
  );

  // Orders live in a bottom tab, so the screen stays mounted after the first
  // visit and `useQuery` would never run again — a freshly placed order simply
  // never appeared until the app was restarted. Refetch whenever the tab is
  // focused again.
  const refetch = ordersQuery.refetch;
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoggedIn) refetch();
    });
    return unsubscribe;
  }, [navigation, isLoggedIn, refetch]);

  const all = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data]);

  /**
   * Partition once so the tab labels can show real counts. "Completed" is
   * anything that is neither live nor cancelled, so an order in a status this
   * build does not know about still lands somewhere instead of vanishing.
   */
  const groups = useMemo(() => {
    const running = all.filter((order) => ORDER_TAB_STATUSES.running.includes(order.status));
    const cancelled = all.filter((order) => order.status === 'cancelled');
    const past = all.filter((order) => !ORDER_TAB_STATUSES.running.includes(order.status) && order.status !== 'cancelled');
    return { running, past, cancelled };
  }, [all]);

  const rows = groups[tab];

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
            { key: 'running', label: 'Running', count: groups.running.length },
            { key: 'past', label: 'Completed', count: groups.past.length },
            { key: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
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
