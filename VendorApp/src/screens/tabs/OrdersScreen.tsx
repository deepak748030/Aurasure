import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { vendorApi, type VendorOrder } from '@/api/vendor';
import { colors } from '@/theme/colors';

export function OrdersScreen(): React.ReactElement {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await vendorApi.orders();
      setOrders(data.orders);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, status: string) => {
    await vendorApi.advance(id, status);
    await load();
  };

  return (
    <Screen title="Kitchen tickets" subtitle="Accept → prep → hand to rider" onRefresh={() => void load()}>
      {error ? (
        <Text color={colors.danger} variant="bodySm">
          {error}
        </Text>
      ) : null}
      {!orders.length ? (
        <EmptyState icon="orders" title="No tickets yet" subtitle="New orders appear the moment a customer pays." />
      ) : (
        orders.map((o) => (
          <View
            key={o.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="title">{o.code}</Text>
              <Text variant="caption" color={colors.brand[700]}>
                {o.status}
              </Text>
            </View>
            <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4 }}>
              {o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
            </Text>
            <Text variant="title" style={{ marginTop: 6 }}>
              ₹{o.total} · {o.payBy || 'cod'}
            </Text>
            {o.instructions ? (
              <Text variant="caption" color={colors.warning} style={{ marginTop: 4 }}>
                Note: {o.instructions}
              </Text>
            ) : null}
            {o.status === 'out_for_delivery' && o.delivery ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: colors.brand[50],
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.brand[100],
                }}
              >
                <Text variant="caption" color={colors.brand[800]}>
                  Pickup OTP — tell the rider: {o.delivery.pickupOtp}
                </Text>
                {o.delivery.riderName ? (
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    Rider: {o.delivery.riderName} · {o.delivery.state.replace('_', ' ')}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    Waiting for a rider to accept…
                  </Text>
                )}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {o.status === 'placed' ? (
                <>
                  <View style={{ flex: 1 }}>
                    <Button title="Accept" size="sm" onPress={() => void act(o.id, 'confirmed')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Reject" size="sm" variant="danger" onPress={() => void act(o.id, 'cancelled')} />
                  </View>
                </>
              ) : null}
              {o.status === 'confirmed' ? (
                <Button title="Start preparing" size="sm" onPress={() => void act(o.id, 'preparing')} />
              ) : null}
              {o.status === 'preparing' ? (
                <Button title="Ready for pickup" size="sm" onPress={() => void act(o.id, 'out_for_delivery')} />
              ) : null}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
