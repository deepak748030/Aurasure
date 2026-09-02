import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { BottomSheet } from '../ui/BottomSheet';
import { Skeleton } from '../ui/Skeleton';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { adminApiDecidePartner, adminApiFetch, adminApiSetOrderStatus } from '@/api/admin';
import type {
  AdminOrder,
  AdminPartnerApplication,
  AdminStats,
  OrderStatus,
} from '@/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** The natural fulfilment step after the current one (null = none). */
function nextStepFor(status: OrderStatus): OrderStatus | null {
  const chain: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
  const idx = chain.indexOf(status);
  if (idx === -1 || idx === chain.length - 1) return null;
  return (chain[idx + 1] ?? null);
}

const CANCELLABLE: OrderStatus[] = ['placed', 'confirmed'];

type Tab = 'overview' | 'orders' | 'partners';

export function AdminConsoleBody(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [partners, setPartners] = useState<AdminPartnerApplication[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order console state.
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [busyAction, setBusyAction] = useState<'advance' | 'cancel' | null>(null);
  const [actError, setActError] = useState<string | null>(null);
  const [busyPartner, setBusyPartner] = useState<string | null>(null);

  const loadStats = useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    try {
      setStats(await adminApiFetch<AdminStats>('stats'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (): Promise<void> => {
    setOrdersLoading(true);
    try {
      setOrders(await adminApiFetch<AdminOrder[]>('orders'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadPartners = useCallback(async (): Promise<void> => {
    setPartnersLoading(true);
    try {
      setPartners(await adminApiFetch<AdminPartnerApplication[]>('partners'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load applications');
    } finally {
      setPartnersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = (next: Tab): void => {
    haptic.selection();
    setError(null);
    setTab(next);
    if (next === 'orders' && orders.length === 0 && !ordersLoading) loadOrders();
    if (next === 'partners' && partners.length === 0 && !partnersLoading) loadPartners();
  };

  const refreshOrders = (): void => {
    setOrdersLoadingMore(true);
    loadOrders().finally(() => setOrdersLoadingMore(false));
  };

  const openOrder = (order: AdminOrder): void => {
    haptic.light();
    setActError(null);
    setSelected(order);
  };

  /** Re-sync a single order inside `selected` + the list after an action. */
  const syncSelected = (updated: AdminOrder): void => {
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
  };

  const runAction = async (action: 'advance' | 'cancel'): Promise<void> => {
    if (!selected) return;
    const target = action === 'cancel' ? 'cancelled' : nextStepFor(selected.status);
    if (!target) return;
    setBusyAction(action);
    setActError(null);
    try {
      const updated = await adminApiSetOrderStatus(selected.id, target);
      syncSelected(updated);
      haptic.success();
    } catch (e) {
      setActError(e instanceof Error && e.message ? e.message : 'Action failed - try again');
    } finally {
      setBusyAction(null);
    }
  };

  const decidePartner = async (app: AdminPartnerApplication, decision: 'approved' | 'rejected'): Promise<void> => {
    setBusyPartner(`${app.userId}:${decision}`);
    setError(null);
    try {
      await adminApiDecidePartner(app.userId, decision);
      setPartners((prev) => prev.map((p) => (p.userId === app.userId ? { ...p, status: decision } : p)));
      haptic.success();
      // Stats row includes the pending count - keep it fresh.
      if (stats) loadStats();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not update the application');
    } finally {
      setBusyPartner(null);
    }
  };

  const visibleOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const renderOverview = (): React.ReactElement => (
    <>
      {error && tab === 'overview' ? <ErrorNote text={error} /> : null}
      {statsLoading || !stats ? (
        <>
          <View style={styles.statGrid}>
            {[1, 2, 3, 4].map((k) => (
              <View key={k} style={styles.statCard}>
                <Skeleton width="40%" height={22} />
                <Skeleton width="70%" height={11} style={{ marginTop: 12 }} />
              </View>
            ))}
          </View>
          <Card style={{ marginTop: 14 }}>
            <Skeleton width="45%" height={15} />
            <Skeleton width="85%" height={12} style={{ marginTop: 10 }} />
            <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
            <Skeleton width="90%" height={12} style={{ marginTop: 8 }} />
          </Card>
        </>
      ) : (
        <>
          <View style={styles.statGrid}>
            <Stat icon="receipt" label="Total orders" value={String(stats.orders)} tint="#F7E2F1" color="#9C005E" />
            <Stat icon="rupee" label="Revenue" value={formatINR(Math.round(stats.revenue))} tint="#EAF7EE" color="#2C9B4D" />
            <Stat icon="bike" label="Live orders" value={String(stats.liveOrders)} tint="#E4F1FC" color="#2E87D6" />
            <Stat icon="userRound" label="Customers" value={String(stats.users)} tint="#EEEEF0" color="#6D6D7A" />
          </View>

          <Card style={{ marginTop: 14 }}>
            <Text variant="overline" weight="bold" color={colors.textTertiary}>MARKETPLACE</Text>
            <View style={styles.kpiRow}>
              <Kpi label="Restaurants" value={stats.restaurants} />
              <Kpi label="Food items" value={stats.foodItems} />
              <Kpi label="Shops" value={stats.shops} />
              <Kpi label="Products" value={stats.products} />
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text variant="overline" weight="bold" color={colors.textTertiary}>PIPELINE</Text>
            <View style={styles.kpiRow}>
              <Kpi label="Pending partners" value={stats.pendingPartners} />
              <Kpi label="Wallet collected" value={formatINR(stats.walletCollected)} />
              <Kpi label="Cancelled" value={stats.cancelledOrders} />
            </View>
            <View style={{ height: 2 }} />
            <Pressable
              onPress={() => switchTab('orders')}
              style={({ pressed }) => [styles.quickLink, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text variant="caption" weight="bold" color="#9C005E">Manage live orders</Text>
              <Icon name="chevronRight" size={16} color="#9C005E" />
            </Pressable>
            <Pressable
              onPress={() => switchTab('partners')}
              style={({ pressed }) => [styles.quickLink, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text variant="caption" weight="bold" color="#2C9B4D">Review partner applications</Text>
              <Icon name="chevronRight" size={16} color="#2C9B4D" />
            </Pressable>
          </Card>
        </>
      )}
    </>
  );

  const renderOrders = (): React.ReactElement => (
    <>
      {error && tab === 'orders' ? <ErrorNote text={error} /> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 10, gap: 8 }}
      >
        {(['all', 'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as const).map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => {
                haptic.selection();
                setFilter(f);
              }}
              style={[styles.pill, on && styles.pillOn]}
            >
              <Text variant="caption" weight={on ? 'bold' : 'semibold'} color={on ? colors.white : colors.textSecondary}>
                {f === 'all' ? 'All' : STATUS_LABEL[f]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {ordersLoading ? (
        [1, 2, 3].map((k) => (
          <View key={k} style={[styles.orderCard, { padding: 14 }]}>
            <Skeleton width="42%" height={15} />
            <Skeleton width="60%" height={12} style={{ marginTop: 10 }} />
            <Skeleton width="30%" height={22} radius={11} style={{ marginTop: 10 }} />
          </View>
        ))
      ) : visibleOrders.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', paddingVertical: 18 }}>
            {orders.length === 0 ? 'No orders yet - they appear here the moment customers place them.' : `No ${filter} orders.`}
          </Text>
        </Card>
      ) : (
        visibleOrders.map((o) => (
          <Pressable key={o.id} onPress={() => openOrder(o)} style={({ pressed }) => [styles.orderCard, { opacity: pressed ? 0.95 : 1 }]}>
            <View style={styles.orderCardTop}>
              <View style={styles.orderIcon}>
                <Icon name={o.module === 'food' ? 'utensils' : 'bag'} size={16} color={o.module === 'food' ? colors.food[600] : colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="bold" color={colors.text}>{o.code}</Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {o.user?.name ?? 'Customer'} · {o.user?.phone ?? ''} · {new Date(o.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Badge label={STATUS_LABEL[o.status]} tone={STATUS_TONE(o.status)} size="sm" />
            </View>
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>
              {o.items.length} item(s) · {formatINR(o.total)} · {o.module === 'food' ? 'Food' : 'Shop'}
            </Text>
          </Pressable>
        ))
      )}
      {orders.length > 0 ? (
        <Pressable onPress={refreshOrders} style={({ pressed }) => [styles.refreshRow, { opacity: pressed || ordersLoadingMore ? 0.7 : 1 }]}>
          <Icon name="refresh" size={14} color={colors.brand[700]} />
          <Text variant="caption" weight="bold" color={colors.brand[700]} style={{ marginLeft: 6 }}>
            {ordersLoadingMore ? 'Syncing…' : 'Refresh list'}
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  const renderPartners = (): React.ReactElement => (
    <>
      {error && tab === 'partners' ? <ErrorNote text={error} /> : null}
      {partnersLoading ? (
        [1, 2].map((k) => (
          <View key={k} style={[styles.orderCard, { padding: 14 }]}>
            <Skeleton width="50%" height={15} />
            <Skeleton width="70%" height={12} style={{ marginTop: 10 }} />
            <Skeleton width="55%" height={34} radius={17} style={{ marginTop: 12 }} />
          </View>
        ))
      ) : partners.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', paddingVertical: 18 }}>
            No partner applications yet. New vendor & delivery-partner sign-ups show up here.
          </Text>
        </Card>
      ) : (
        partners.map((app) => {
          const submitted = app.status === 'submitted';
          return (
            <Card key={app.userId} style={{ marginBottom: 12 }}>
              <View style={styles.partnerTop}>
                <View style={styles.orderIcon}>
                  <Icon name={app.kind === 'vendor' ? 'store' : 'bike'} size={16} color={app.kind === 'vendor' ? '#D9573F' : '#2E87D6'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="subtitle" weight="bold" color={colors.text}>{app.name}</Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {app.kind === 'vendor' ? 'Vendor' : 'Delivery partner'} · {app.phone} · {app.city}
                  </Text>
                </View>
                <Badge
                  label={app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Submitted'}
                  tone={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}
                  size="sm"
                />
              </View>
              {submitted ? (
                <View style={styles.partnerActions}>
                  <Button
                    title="Approve"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    leftIcon="check"
                    loading={busyPartner === `${app.userId}:approved`}
                    onPress={() => void decidePartner(app, 'approved')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Reject"
                    size="sm"
                    variant="danger"
                    fullWidth={false}
                    leftIcon="x"
                    loading={busyPartner === `${app.userId}:rejected`}
                    onPress={() => void decidePartner(app, 'rejected')}
                    style={{ flex: 1, marginLeft: 10 }}
                  />
                </View>
              ) : null}
              {app.note ? (
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 10 }}>
                  Note: {app.note}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
    </>
  );

  return (
    <>
      <View style={styles.tabRow}>
        {(
          [
            { key: 'overview' as Tab, label: 'Overview', icon: 'gauge' as const },
            { key: 'orders' as Tab, label: 'Orders', icon: 'receipt' as const },
            { key: 'partners' as Tab, label: 'Partners', icon: 'userRound' as const },
          ]
        ).map((t) => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => switchTab(t.key)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Icon name={t.icon} size={16} color={on ? colors.white : colors.textSecondary} />
              <Text variant="subtitle" weight={on ? 'bold' : 'semibold'} color={on ? colors.white : colors.textSecondary} style={{ marginLeft: 6 }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'overview' ? renderOverview() : null}
      {tab === 'orders' ? renderOrders() : null}
      {tab === 'partners' ? renderPartners() : null}

      {tab === 'orders' && orders.length > 0 ? (
        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 6 }}>
          Tip: advance an order to confirm → preparing → on the way → delivered.
        </Text>
      ) : null}

      <BottomSheet
        visible={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.code : 'Order'}
        dismissDistance={620}
      >
        {selected ? <OrderSheetBody order={selected} busyAction={busyAction} actError={actError} onRun={runAction} /> : null}
      </BottomSheet>
    </>
  );
}

function OrderSheetBody({
  order,
  busyAction,
  actError,
  onRun,
}: {
  order: AdminOrder;
  busyAction: 'advance' | 'cancel' | null;
  actError: string | null;
  onRun: (action: 'advance' | 'cancel') => void;
}): React.ReactElement {
  const next = nextStepFor(order.status);
  const cancellable = CANCELLABLE.includes(order.status);
  return (
    <View style={{ paddingBottom: 6 }}>
      <View style={styles.sheetRow}>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" weight="bold" color={colors.text}>{order.user?.name ?? 'Customer'}</Text>
          <Text variant="caption" color={colors.textSecondary}>{order.user?.phone ?? ''}</Text>
        </View>
        <Badge label={STATUS_LABEL[order.status]} tone={STATUS_TONE(order.status)} />
      </View>

      <Text variant="overline" weight="bold" color={colors.textTertiary} style={{ marginTop: 12 }}>ITEMS</Text>
      {order.items.map((i) => (
        <View key={i.id} style={styles.sheetRow}>
          <Text variant="body" color={colors.text} style={{ flex: 1 }}>{i.name}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {i.qty} × {formatINR(i.unitPrice)}
          </Text>
        </View>
      ))}

      <View style={styles.billBlock}>
        <View style={styles.sheetRow}>
          <Text variant="caption" color={colors.textSecondary}>Item total</Text>
          <Text variant="caption" color={colors.text}>{formatINR(order.itemTotal)}</Text>
        </View>
        <View style={styles.sheetRow}>
          <Text variant="caption" color={colors.textSecondary}>Delivery</Text>
          <Text variant="caption" color={order.deliveryFee === 0 ? colors.success : colors.text}>
            {order.deliveryFee === 0 ? 'FREE' : formatINR(order.deliveryFee)}
          </Text>
        </View>
        {order.discount > 0 ? (
          <View style={styles.sheetRow}>
            <Text variant="caption" color={colors.textSecondary}>{order.couponCode ? `Coupon ${order.couponCode}` : 'Discount'}</Text>
            <Text variant="caption" weight="bold" color={colors.success}>-{formatINR(order.discount)}</Text>
          </View>
        ) : null}
        <View style={[styles.sheetRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
          <Text variant="subtitle" weight="bold" color={colors.text}>Total</Text>
          <Text variant="subtitle" weight="bold" color={colors.text}>{formatINR(order.total)}</Text>
        </View>
        {order.payBy === 'wallet' && (order.walletPaid ?? 0) > 0 ? (
          <Text variant="caption" color="#B07000" weight="semibold" style={{ marginTop: 6 }}>
            Paid from wallet · {formatINR(order.walletPaid ?? 0)} (refunded on cancel)
          </Text>
        ) : null}
      </View>

      <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 6 }}>
        Deliver to: {order.address}
      </Text>
      {order.instructions ? (
        <Text variant="caption" color="#8B0057" weight="semibold" style={{ marginTop: 6, backgroundColor: '#FBF3F9', borderRadius: 8, padding: 8, overflow: 'hidden' }}>
          If an item is unavailable: {order.instructions}
        </Text>
      ) : null}
      {order.etaMinutes > 0 ? (
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
          ETA {order.etaMinutes} min{order.module === 'food' ? '' : ' · shop'} · Placed {new Date(order.placedAt).toLocaleString('en-IN')}
        </Text>
      ) : null}

      {actError ? <ErrorNote text={actError} /> : null}

      {next ? (
        <Button
          title={`Mark ${STATUS_LABEL[next]}`}
          size="lg"
          leftIcon="check"
          loading={busyAction === 'advance'}
          onPress={() => onRun('advance')}
          style={{ marginTop: 14 }}
        />
      ) : null}
      {cancellable ? (
        <Button
          title="Cancel order"
          size="lg"
          variant="danger"
          leftIcon="x"
          loading={busyAction === 'cancel'}
          onPress={() => onRun('cancel')}
          style={{ marginTop: 10 }}
        />
      ) : null}
    </View>
  );
}

function STATUS_TONE(status: OrderStatus): 'brand' | 'warning' | 'food' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'placed':
    case 'confirmed':
      return 'brand';
    case 'preparing':
      return 'warning';
    case 'out_for_delivery':
      return 'food';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
  }
}

function Stat({ icon, label, value, tint, color }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; value: string; tint: string; color: string }): React.ReactElement {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <Text variant="title" weight="bold" color={colors.text} style={{ marginTop: 10 }}>{value}</Text>
      <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }): React.ReactElement {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="subtitle" weight="bold" color={colors.text}>{value}</Text>
      <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ErrorNote({ text }: { text: string }): React.ReactElement {
  return (
    <View style={styles.errorRow}>
      <Icon name="circleAlert" size={14} color={colors.danger} />
      <Text variant="caption" color={colors.danger} style={{ marginLeft: 6, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  tabOn: {
    backgroundColor: colors.brand[600],
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billBlock: {
    marginTop: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
});
