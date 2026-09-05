import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { Tag } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/Primitives';
import { TrackingStepper } from '@/components/orders/TrackingStepper';
import { MapSurface, type MapMarker } from '@/components/map/MapSurface';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { getOrder, isRunning, statusLabel } from '@/api/orders';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { minutes } from '@/lib/format';
import type { Nav, Route } from '@/navigation/types';
import type { Order } from '@/types';

/**
 * Live tracking. There is no rider GPS endpoint on this server build, so the
 * map shows the store, your address and the current stage — and the ETA the
 * order itself carries (`etaMinutes` from `POST /orders`).
 */
export function TrackOrderScreen({ navigation, route }: { navigation: Nav; route: Route<'TrackOrder'> }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { coords, requestLocation, locationStatus } = useSession();
  const query = useQuery<Order>(useCallback(() => getOrder(route.params.id), [route.params.id]), { deps: [] });
  const order = query.data;

  const markers: MapMarker[] = [
    { id: 'you', label: 'Your address', x: 0.5, y: 0.5, icon: 'home', tone: 'primary', active: true },
    { id: 'outlet', label: 'Store', x: 0.28, y: 0.34, icon: 'store', tone: 'success' },
  ];

  if (query.loading) {
    return (
      <Screen title="Track order" back>
        <SkeletonList rows={4} thumb={22} />
      </Screen>
    );
  }
  if (!order) {
    return (
      <Screen title="Track order" back>
        <EmptyState icon="package" title="Nothing to track" subtitle={query.error?.message ?? 'This order could not be loaded.'} actionLabel="My orders" onAction={() => navigation.navigate('Tabs')} />
      </Screen>
    );
  }

  return (
    <Screen title={`Track ${order.code}`} subtitle={statusLabel(order.status)} back padded={false}>
      <FlushSurface height={230}>
        <MapSurface
          height={230}
          markers={markers}
          userLabel={order.status === 'delivered' ? 'Delivered here' : 'Your address'}
          onCenterPress={() => {
            void (async () => {
              const next = await requestLocation();
              sheet.info(next ? 'Location refreshed' : 'Location unavailable', next ? `${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}` : 'Enable location services to see yourself on the map.');
            })();
          }}
          footer={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="navigation" size={15} color={c.primary} />
              <Text variant="caption" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                {order.status === 'delivered' ? 'Order completed' : order.status === 'cancelled' ? 'Order cancelled' : `${order.deliveryPartnerName ? `${order.deliveryPartnerName} · ` : ''}${minutes(order.etaMinutes)} away`}
              </Text>
              {locationStatus === 'denied' ? <Tag label="GPS off" tone="warning" /> : null}
            </View>
          }
        />
      </FlushSurface>

      <View style={{ paddingHorizontal: spacing.edge, paddingVertical: spacing.md, gap: spacing.md }}>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <TrackingStepper order={order} />
        </View>

        {isRunning(order) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceHi }}>
            <Icon name="info" size={16} color={c.primary} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              The store and rider update this status live. Pull down to refresh — the app polls nothing in the background to save your battery.
            </Text>
            <Button title="Refresh" size="sm" variant="secondary" onPress={query.refresh} />
          </View>
        ) : null}

        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 6 }}>
          <Text variant="overline" tone="faint">
            DELIVERY DETAIL
          </Text>
          <Text variant="bodySm">{order.address}</Text>
          {order.instructions ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Icon name="note" size={14} color={c.textSecondary} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {order.instructions}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Tag label={`${order.items.length} items`} icon="package" tone="muted" />
            <Tag label={order.payBy === 'wallet' ? 'Paid' : 'Cash on delivery'} icon={order.payBy === 'wallet' ? 'wallet' : 'cash'} tone="muted" />
          </View>
        </View>
      </View>
    </Screen>
  );
}
