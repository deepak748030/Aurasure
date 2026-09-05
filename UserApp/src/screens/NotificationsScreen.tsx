import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { ListRow, ListSection } from '@/components/list/ListRow';
import { Chip, EmptyState } from '@/components/ui/Primitives';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchNotifications, markNotificationsRead, type Notice } from '@/api/app';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { relative } from '@/lib/format';
import type { Nav } from '@/navigation/types';

type Tab = 'all' | 'orders' | 'money' | 'promo';

const TAB_OF: Record<Notice['kind'], Tab> = { orders: 'orders', money: 'money', promo: 'promo', support: 'promo' };

/**
 * Inbox, composed server-side: broadcasts + support replies + order events +
 * wallet/loyalty movements. Read state lives on the account, not the device.
 */
export function NotificationsScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const { isLoggedIn, user } = useSession();
  const [tab, setTab] = useState<Tab>('all');

  const feed = useQuery<{ notifications: Notice[]; unread: number }>(
    useCallback(async (signal: AbortSignal) => fetchNotifications(signal), [isLoggedIn, user?.wallet]),
    { enabled: isLoggedIn },
  );

  const notices = useMemo<Notice[]>(() => feed.data?.notifications ?? [], [feed.data]);
  const rows = tab === 'all' ? notices : notices.filter((notice) => TAB_OF[notice.kind] === tab);
  const unread = feed.data?.unread ?? notices.filter((notice) => notice.unread).length;

  const markAllRead = async (): Promise<void> => {
    try {
      await markNotificationsRead();
    } catch {
      // Offline — the server watermark stays; a refresh retries it.
    } finally {
      feed.refresh();
    }
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
          { key: 'orders', label: 'Orders', count: notices.filter((n) => TAB_OF[n.kind] === 'orders').length },
          { key: 'money', label: 'Wallet & points', count: notices.filter((n) => TAB_OF[n.kind] === 'money').length },
          { key: 'promo', label: 'Offers & support', count: notices.filter((n) => TAB_OF[n.kind] === 'promo').length },
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
                onPress={() => {
                  if (notice.orderId) navigation.navigate('OrderDetail', { id: notice.orderId });
                  else if (notice.kind === 'money') navigation.navigate('Wallet');
                  else if (notice.kind === 'support') navigation.navigate('Help');
                  else navigation.navigate('Tabs');
                }}
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
              Newest first — order updates, wallet and points movements, offers and support replies.
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}
