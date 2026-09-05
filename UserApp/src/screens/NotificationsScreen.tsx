import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/lib/icons';
import { ListRow, ListSection } from '@/components/list/ListRow';
import { Chip, EmptyState } from '@/components/ui/Primitives';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { listOrders } from '@/api/orders';
import { fetchWallet, fetchLoyalty, type LoyaltyState, type WalletState } from '@/api/rewards';
import { statusLabel } from '@/api/orders';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { money, relative } from '@/lib/format';
import { StorageKey, readJson, writeJson } from '@/lib/storage';
import type { Nav } from '@/navigation/types';
import type { Order } from '@/types';

type Tab = 'all' | 'orders' | 'money';

interface Notice {
  id: string;
  title: string;
  body: string;
  when: string;
  icon: IconName;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  kind: Tab extends never ? never : 'orders' | 'money';
  orderId?: string;
  unread: boolean;
}

const READ_KEY = `${StorageKey.settings}.last-notifications-read`;

/**
 * Inbox. There is no push service or notification endpoint on this API, so the
 * feed is derived from the user's real records - order status changes, wallet
 * movements and loyalty events - and "read" is a local timestamp.
 */
export function NotificationsScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const { isLoggedIn, user } = useSession();
  const [tab, setTab] = useState<Tab>('all');
  const [lastRead, setLastRead] = useState<number>(Date.now());

  useEffect(() => {
    void readJson<number>(READ_KEY, 0).then((value) => setLastRead(Number(value) || 0));
  }, []);

  const feed = useQuery<{ orders: Order[]; wallet: WalletState | null; loyalty: LoyaltyState | null }>(
    useCallback(async () => {
      if (!isLoggedIn) return { orders: [], wallet: null, loyalty: null };
      const [orderPage, wallet, loyalty] = await Promise.all([listOrders({ limit: 15 }), fetchWallet(), fetchLoyalty()]);
      return { orders: orderPage.orders, wallet, loyalty };
    }, [isLoggedIn, user?.wallet]),
  );

  const notices = useMemo<Notice[]>(() => {
    const rows: Notice[] = [];
    (feed.data?.orders ?? []).forEach((order) => {
      rows.push({
        id: `order-${order.id}-${order.status}`,
        title: `${order.code} · ${statusLabel(order.status)}`,
        body: order.status === 'cancelled' ? order.cancelReason || 'Cancelled as requested' : order.status === 'delivered' ? `${money(order.total)} · thanks for ordering` : order.status === 'placed' ? `Awaiting ${order.module === 'food' ? 'kitchen' : 'store'} confirmation` : `ETA ${order.etaMinutes} min · ${order.items.length} item${order.items.length === 1 ? '' : 's'}`,
        when: order.status === 'delivered' && order.deliveredAt ? order.deliveredAt : order.placedAt,
        icon: order.status === 'delivered' ? 'circleCheck' : order.status === 'cancelled' ? 'circleX' : 'truck',
        tone: order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'primary',
        kind: 'orders',
        orderId: order.id,
        unread: new Date(order.placedAt).getTime() > lastRead,
      });
    });
    (feed.data?.wallet?.transactions ?? []).forEach((tx) => {
      rows.push({
        id: `wallet-${tx.id}`,
        title: `${tx.type === 'credit' ? 'Money in' : 'Money out'} · ${money(tx.amount)}`,
        body: `${tx.note} · balance ${money(tx.balanceAfter)}`,
        when: tx.createdAt,
        icon: tx.type === 'credit' ? 'arrowDown' : 'arrowUpRight',
        tone: tx.type === 'credit' ? 'success' : 'muted',
        kind: 'money',
        unread: new Date(tx.createdAt).getTime() > lastRead,
      });
    });
    (feed.data?.loyalty?.activity ?? []).forEach((row) => {
      rows.push({
        id: `loyalty-${row.id}`,
        title: `${row.type === 'earned' ? 'Points earned' : row.type === 'redeemed' ? 'Points redeemed' : 'Points reversed'} · ${Math.abs(row.points)}`,
        body: `${row.note} · balance ${row.balanceAfter}`,
        when: row.createdAt,
        icon: row.type === 'earned' ? 'loyalty' : 'gift',
        tone: row.type === 'reversed' ? 'warning' : 'primary',
        kind: 'money',
        unread: new Date(row.createdAt).getTime() > lastRead,
      });
    });
    return rows.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }, [feed.data, lastRead]);

  const rows = tab === 'all' ? notices : notices.filter((notice) => notice.kind === tab);
  const unread = notices.filter((notice) => notice.unread).length;

  const markAllRead = async (): Promise<void> => {
    const now = Date.now();
    setLastRead(now);
    await writeJson(READ_KEY, now);
  };

  return (
    <Screen
      title="Notifications"
      subtitle={unread > 0 ? `${unread} new` : 'All caught up'}
      back={navigation.canGoBack()}
      padded={false}
      onRefresh={feed.refresh}
      refreshing={feed.refreshing}
      headerRight={
        unread > 0 ? (
          <Chip label="Mark read" icon="check" size="sm" onPress={() => void markAllRead()} />
        ) : undefined
      }
    >
      <SegmentedTabs
        tabs={[
          { key: 'all', label: 'Everything', count: notices.length },
          { key: 'orders', label: 'Orders', count: notices.filter((n) => n.kind === 'orders').length },
          { key: 'money', label: 'Wallet & points', count: notices.filter((n) => n.kind === 'money').length },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {feed.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={5} thumb={34} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nothing here yet"
          subtitle={isLoggedIn ? 'Order status changes, wallet credits and loyalty events land in this inbox.' : 'Sign in and your order and wallet activity shows up here.'}
          actionLabel={isLoggedIn ? undefined : 'Sign in'}
          onAction={isLoggedIn ? undefined : () => navigation.navigate('Auth', { mode: 'login' })}
        />
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          <ListSection title={`${rows.length} UPDATES`}>
            {rows.map((notice, index) => (
              <ListRow
                key={notice.id}
                title={notice.title}
                subtitle={notice.body}
                meta={relative(notice.when)}
                icon={notice.icon}
                iconTone={notice.tone === 'muted' ? 'muted' : notice.tone}
                badge={notice.unread ? 'NEW' : undefined}
                last={index === rows.length - 1}
                onPress={() => (notice.orderId ? navigation.navigate('OrderDetail', { id: notice.orderId }) : navigation.navigate('Wallet'))}
                trailing={
                  notice.unread ? (
                    <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: c.primary }} />
                  ) : (
                    <Icon name="chevronRight" size={16} color={c.textTertiary} />
                  )
                }
              />
            ))}
          </ListSection>
          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
            <Text variant="micro" tone="faint">
              Push alerts are not part of this server build, so the inbox reads live from your orders and ledger.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}
