import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { riderApi, type DeliveryTask, type OfferResponse } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function stateIcon(state: DeliveryTask['state']): IconName {
  if (state === 'accepted' || state === 'at_pickup') return 'bike';
  if (state === 'picked_up' || state === 'at_drop') return 'mapPin';
  if (state === 'delivered') return 'circleCheck';
  return 'clock';
}

export function HomeScreen(): React.ReactElement {
  const { rider, setRider, refresh } = useRider();
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const [data, setData] = useState<OfferResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pull = useCallback(async () => {
    try {
      const offers = await riderApi.offers();
      setData(offers);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deliveries');
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    void pull();
  }, [focused, pull]);

  const sendLocation = useCallback(async () => {
    try {
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await getCurrentPositionAsync({ accuracy: 3 });
      const at = new Date().toISOString();
      const saved = await riderApi.locationBatch([{ lat: pos.coords.latitude, lng: pos.coords.longitude, at }]);
      setRider(saved.rider);
    } catch {
      // Permissions unavailable (e.g. web) - online flow still works.
    }
  }, [setRider]);

  const toggleDuty = async (state: 'online' | 'offline' | 'break') => {
    setBusy(true);
    try {
      if (state === 'online') await sendLocation();
      const res = await riderApi.setDuty(state);
      haptic.success();
      setRider(res.rider);
      await pull();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Duty change failed');
    } finally {
      setBusy(false);
    }
  };

  const accept = async (task: DeliveryTask) => {
    setBusy(true);
    setError('');
    try {
      await riderApi.accept(task.id);
      haptic.success();
      await refresh();
      navigation.navigate('ActiveTask');
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Could not accept');
    } finally {
      setBusy(false);
    }
  };

  const reject = async (task: DeliveryTask) => {
    if (!data) return;
    setBusy(true);
    try {
      await riderApi.reject(task.id);
      setData({ ...data, offers: data.offers.filter((t) => t.id !== task.id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not decline');
    } finally {
      setBusy(false);
    }
  };

  const duty = (rider?.dutyState ?? 'offline') as string;
  const online = duty === 'online' || duty === 'on_task';
  const offers = data?.offers ?? [];
  const active = data?.activeTask;

  return (
    <Screen title="Deliveries" subtitle={rider?.name ? `Hi ${rider.name.split(' ')[0]}` : ''} refreshing={busy} onRefresh={() => void pull()}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: online ? `${colors.success}20` : colors.ink[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="bike" size={22} color={online ? colors.success : colors.textSecondary} />
            </View>
            <View>
              <Text variant="title">You are {online ? 'online' : 'offline'}</Text>
              <Text variant="caption" color={colors.textTertiary}>
                {online ? 'Receiving nearby deliveries' : 'Go online to get orders'}
              </Text>
            </View>
          </View>
          {online ? null : (
            <Button title="Go online" size="sm" loading={busy} onPress={() => void toggleDuty('online')} />
          )}
        </View>
        {online ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Take a break" variant="secondary" size="sm" loading={busy} onPress={() => void toggleDuty('break')} />
            <Button title="Go offline" variant="ghost" size="sm" loading={busy} onPress={() => void toggleDuty('offline')} />
          </View>
        ) : null}
        {rider?.codInHand ? (
          <Text variant="caption" color={colors.warning} style={{ marginTop: 10 }}>
            COD in hand ₹{Math.round(rider.codInHand)} — deposit before your next shift if you want to keep collecting.
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 16 }}>
        {[
          { label: 'COD in hand', value: formatINR(rider?.codInHand || 0), icon: 'wallet' as const },
          { label: 'Trips today', value: `${rider?.currentDayTrips || 0}`, icon: 'bike' as const },
          { label: 'Earned today', value: formatINR(rider?.currentDayEarnings || 0), icon: 'rupee' as const },
          { label: 'Rating', value: `${rider?.rating ?? 5}`, icon: 'star' as const },
        ].map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 12,
            }}
          >
            <Icon name={s.icon} size={16} color={colors.brand[600]} />
            <Text variant="title" style={{ marginTop: 8 }}>
              {s.value}
            </Text>
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {active ? (
        <Pressable onPress={() => navigation.navigate('ActiveTask')}>
          <View
            style={{
              backgroundColor: colors.brand[50],
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.brand[200],
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name={stateIcon(active.state)} size={24} color={colors.brand[600]} />
              <View style={{ flex: 1 }}>
                <Text variant="title" color={colors.brand[900]}>
                  Active delivery · {active.orderCode}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {active.state.replaceAll('_', ' ')} · payout {formatINR(active.riderPayout)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      ) : null}

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {!online ? (
        <EmptyState icon="bike" title="You are offline" subtitle="Go online above to see nearby delivery offers. Keep your COD below the limit." />
      ) : offers.length === 0 && !busy ? (
        <EmptyState icon="clock" title="No deliveries right now" subtitle="We refresh automatically. Keep the app open and sound on." />
      ) : (
        <View style={{ gap: 10 }}>
          {offers.map((task) => (
            <View
              key={task.id}
              style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
                  {task.vendorName} → {task.drop.name}
                </Text>
                <Text variant="caption" color={colors.success} weight="bold">
                  +{formatINR(task.riderPayout)}
                </Text>
              </View>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                {task.orderCode} · {task.items.length} items · {formatINR(task.total)}
              </Text>
              <Text variant="caption" color={colors.warning} style={{ marginTop: 4 }}>
                {task.codAmount > 0 ? `COD ${formatINR(task.codAmount)}` : 'Wallet order'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button title="Accept" variant="success" size="sm" loading={busy} onPress={() => void accept(task)} />
                <Button title="Decline" variant="ghost" size="sm" onPress={() => void reject(task)} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
