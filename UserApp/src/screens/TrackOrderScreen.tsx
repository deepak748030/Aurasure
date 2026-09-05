import React, { useCallback, useMemo } from 'react';
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
import { fetchOrderDetail, isRunning, statusLabel, type OrderOutlet } from '@/api/orders';
import { hasCoords, project } from '@/lib/geo';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { minutes } from '@/lib/format';
import type { Nav, Route } from '@/navigation/types';
import type { Order } from '@/types';

/** Live tracking: the outlet pin (real coordinates) + the stage + the ETA. */
export function TrackOrderScreen({ navigation, route }: { navigation: Nav; route: Route<'TrackOrder'> }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { coords, requestLocation, locationStatus } = useSession();
  const query = useQuery<{ order: Order; outlet: OrderOutlet | null }>(
    useCallback((signal: AbortSignal) => fetchOrderDetail(route.params.id, signal), [route.params.id]),
    { deps: [] },
  );
  const order = query.data?.order ?? null;
  const outlet = query.data?.outlet ?? null;

  const markers = useMemo<MapMarker[]>(() => {
    const points: { lat: number; lng: number; marker: Omit<MapMarker, 'x' | 'y'> }[] = [];
    if (hasCoords(outlet)) {
      points.push({
        lat: outlet.lat,
        lng: outlet.lng,
        marker: { id: 'outlet', label: outlet.name, icon: 'store', tone: 'success' },
      });
    }
    if (coords) {
      points.push({
        lat: coords.latitude,
        lng: coords.longitude,
        marker: { id: 'you', label: 'You', icon: 'home', tone: 'primary', active: true },
      });
    }
    const positions = project(points);
    return points.map((point, index) => ({ ...point.marker, x: positions[index]?.x ?? 0.5, y: positions[index]?.y ?? 0.5 }));
  }, [outlet, coords]);

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
          userLabel={order.status === 'delivered' ? 'Delivered here' : (outlet?.name ?? 'Your order')}
          showUserDot={Boolean(coords)}
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
