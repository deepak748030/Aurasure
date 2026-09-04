import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

// ─── Stat tile ───────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, accent }: { icon: IconName; label: string; value: string; accent: string }) {
  return (
    <View style={[styles.tile, { borderColor: colors.border }]}>
      <View style={[styles.tileIcon, { backgroundColor: accent + '18' }]}>
        <Icon name={icon} size={16} color={accent} />
      </View>
      <Text variant="h3" weight="bold" style={{ marginTop: 6 }}>{value}</Text>
      <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Offer card ──────────────────────────────────────────────────────────────
function OfferCard({
  task, busy, onAccept, onReject, onMap,
}: {
  task: DeliveryTask;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMap: () => void;
}) {
  const placedMinsAgo = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 60000);
  return (
    <View style={styles.offerCard}>
      {/* Header */}
      <View style={styles.offerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={[styles.tileIcon, { backgroundColor: colors.brand[50] }]}>
            <Icon name="bike" size={16} color={colors.brand[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" weight="bold" numberOfLines={1}>
              {task.vendorName}
            </Text>
            <Text variant="caption" color={colors.textTertiary}>
              {task.orderCode} · {placedMinsAgo <= 0 ? 'just now' : `${placedMinsAgo} min ago`}
            </Text>
          </View>
        </View>
        <View style={styles.payoutBadge}>
          <Text variant="title" weight="bold" color={colors.success}>+{formatINR(task.riderPayout)}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <Icon name="store" size={14} color={colors.warning} />
        <Text variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>
          {task.pickup.address}
        </Text>
      </View>
      <View style={styles.routeRow}>
        <Icon name="mapPin" size={14} color={colors.danger} />
        <Text variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>
          {task.drop.address}
        </Text>
      </View>

      {/* Info chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Icon name="rupee" size={12} color={colors.textSecondary} />
          <Text variant="caption" color={colors.textSecondary}>{formatINR(task.total)}</Text>
        </View>
        <View style={styles.chip}>
          <Icon name="package" size={12} color={colors.textSecondary} />
          <Text variant="caption" color={colors.textSecondary}>{task.items.length} item{task.items.length !== 1 ? 's' : ''}</Text>
        </View>
        {task.codAmount > 0 ? (
          <View style={[styles.chip, { backgroundColor: colors.warningBg }]}>
            <Icon name="wallet" size={12} color={colors.warning} />
            <Text variant="caption" color={colors.warning} weight="bold">COD {formatINR(task.codAmount)}</Text>
          </View>
        ) : (
          <View style={[styles.chip, { backgroundColor: colors.successBg }]}>
            <Icon name="circleCheck" size={12} color={colors.success} />
            <Text variant="caption" color={colors.success}>Prepaid</Text>
          </View>
        )}
        {task.distanceKm ? (
          <View style={styles.chip}>
            <Icon name="mapPinned" size={12} color={colors.textSecondary} />
            <Text variant="caption" color={colors.textSecondary}>{task.distanceKm.toFixed(1)} km</Text>
          </View>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.offerBtns}>
        <TouchableOpacity style={styles.mapBtn} onPress={onMap}>
          <Icon name="mapPin" size={18} color={colors.brand[600]} />
          <Text variant="caption" weight="bold" color={colors.brand[600]}>Map</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Button title="Ignore" variant="ghost" size="sm" loading={busy} onPress={onReject} />
        </View>
        <View style={{ flex: 1.6 }}>
          <Button title="Accept" variant="success" size="sm" loading={busy} onPress={onAccept} />
        </View>
      </View>
    </View>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export function HomeScreen(): React.ReactElement {
  const { rider, setRider, refresh } = useRider();
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const [data, setData] = useState<OfferResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pull = useCallback(async (silent = false) => {
    if (!silent) setBusy(true);
    try {
      const offers = await riderApi.offers();
      setData(offers);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deliveries');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    void pull();
    timerRef.current = setInterval(() => void pull(true), 20000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [focused, pull]);

  const sendLocation = async () => {
    try {
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await getCurrentPositionAsync({ accuracy: 3 });
      const res = await riderApi.locationBatch([{ lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date().toISOString() }]);
      setRider(res.rider);
    } catch { /* web / no permission */ }
  };

  const toggleDuty = async (state: 'online' | 'offline' | 'break') => {
    setDutyBusy(true);
    try {
      if (state === 'online') await sendLocation();
      const res = await riderApi.setDuty(state);
      haptic.success();
      setRider(res.rider);
      await pull();
    } catch (err) {
      haptic.error();
      Alert.alert('Error', err instanceof Error ? err.message : 'Duty change failed');
    } finally {
      setDutyBusy(false);
    }
  };

  const handleDutySwitch = (val: boolean) => {
    if (!val) {
      Alert.alert('Go offline?', 'You will stop receiving delivery offers.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go offline', style: 'destructive', onPress: () => void toggleDuty('offline') },
      ]);
    } else {
      void toggleDuty('online');
    }
  };

  const accept = async (task: DeliveryTask) => {
    setBusy(true);
    try {
      await riderApi.accept(task.id);
      haptic.success();
      await refresh();
      navigation.navigate('ActiveTask');
    } catch (err) {
      haptic.error();
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not accept');
    } finally {
      setBusy(false);
    }
  };

  const reject = async (task: DeliveryTask) => {
    if (!data) return;
    try {
      await riderApi.reject(task.id);
      setData({ ...data, offers: data.offers.filter((t) => t.id !== task.id) });
    } catch { /* silent */ }
  };

  const duty = (rider?.dutyState ?? 'offline') as string;
  const online = duty === 'online' || duty === 'on_task';
  const onBreak = duty === 'break';
  const offers = data?.offers ?? [];
  const active = data?.activeTask;

  const dutyBg = online ? '#16A34A' : onBreak ? '#D97706' : '#64748B';
  const dutyLabel = online ? 'Online — receiving orders' : onBreak ? 'On break' : 'Offline';

  return (
    <Screen
      title="Deliveries"
      subtitle={rider?.name ? `Hi, ${rider.name.split(' ')[0]} 👋` : ''}
      scroll={false}
      padded={false}
      headerRight={
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ padding: 4 }}>
          <Icon name="bell" size={22} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <FlatList
        data={offers}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 0 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        onRefresh={() => void pull()}
        refreshing={busy}
        ListHeaderComponent={() => (
          <View>
            {/* ── Duty Card ── */}
            <View style={[styles.dutyCard, { backgroundColor: dutyBg }]}>
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold" color="#fff">{dutyLabel}</Text>
                <Text variant="caption" color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
                  {online
                    ? 'Offers appear below automatically.'
                    : onBreak
                      ? 'Taking a short break. Offers paused.'
                      : 'Go online to receive delivery orders.'}
                </Text>
              </View>
              <Switch
                value={online}
                onValueChange={handleDutySwitch}
                disabled={dutyBusy || onBreak}
                trackColor={{ false: 'rgba(255,255,255,0.28)', true: 'rgba(255,255,255,0.28)' }}
                thumbColor="#fff"
                ios_backgroundColor="rgba(255,255,255,0.3)"
              />
            </View>

            {/* Break / Go-back buttons when on break */}
            {onBreak ? (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <Button title="Resume (go online)" size="sm" loading={dutyBusy} onPress={() => void toggleDuty('online')} />
                <Button title="End shift" variant="ghost" size="sm" loading={dutyBusy} onPress={() => void toggleDuty('offline')} />
              </View>
            ) : online ? (
              <View style={{ marginBottom: 12 }}>
                <Button title="Take a break" variant="secondary" size="sm" loading={dutyBusy} onPress={() => void toggleDuty('break')} />
              </View>
            ) : null}

            {/* COD warning */}
            {rider?.codInHand && rider.codInHand > 0 ? (
              <View style={styles.codWarn}>
                <Icon name="wallet" size={16} color={colors.warning} />
                <Text variant="caption" weight="semibold" color={colors.warning} style={{ flex: 1, marginLeft: 8 }}>
                  COD in hand: {formatINR(rider.codInHand)} — deposit before going online if limit is near.
                </Text>
              </View>
            ) : null}

            {/* Active task banner */}
            {active ? (
              <Pressable
                onPress={() => navigation.navigate('ActiveTask')}
                style={({ pressed }) => [styles.activeBanner, pressed && { opacity: 0.88 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.tileIcon, { backgroundColor: colors.brand[100] }]}>
                    <Icon name="bike" size={18} color={colors.brand[700]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" weight="bold" color={colors.brand[900]}>
                      Active delivery — {active.orderCode}
                    </Text>
                    <Text variant="caption" color={colors.brand[700]}>
                      {active.state.replace(/_/g, ' ')} · {active.vendorName} → {active.drop.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('OrderMap', { taskId: active.id })}
                    style={styles.mapIconBtn}
                  >
                    <Icon name="mapPin" size={18} color={colors.brand[600]} />
                  </TouchableOpacity>
                  <Icon name="chevronRight" size={18} color={colors.brand[400]} />
                </View>
              </Pressable>
            ) : null}

            {/* Stats grid */}
            <View style={styles.statsRow}>
              <StatTile icon="bike" label="Trips today" value={String(rider?.currentDayTrips ?? 0)} accent={colors.brand[600]} />
              <StatTile icon="rupee" label="Earned today" value={formatINR(rider?.currentDayEarnings ?? 0)} accent={colors.success} />
              <StatTile icon="wallet" label="COD in hand" value={formatINR(rider?.codInHand ?? 0)} accent={colors.warning} />
              <StatTile icon="star" label="Rating" value={`${rider?.rating ?? 5}`} accent="#F59E0B" />
            </View>

            {error ? (
              <Text variant="caption" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text>
            ) : null}

            {/* Offers header */}
            {online && offers.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text variant="h3" weight="bold">New Offers</Text>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text variant="caption" weight="bold" color={colors.success}>{offers.length}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !online ? (
            <EmptyState icon="bike" title="You are offline" subtitle="Switch online above to start receiving delivery offers." />
          ) : (
            <EmptyState icon="clock" title="No offers right now" subtitle="We refresh every 20 seconds. Keep the app open." />
          )
        }
        renderItem={({ item }) => (
          <OfferCard
            task={item}
            busy={busy}
            onAccept={() => void accept(item)}
            onReject={() => void reject(item)}
            onMap={() => navigation.navigate('OrderMap', { taskId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  codWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  activeBanner: {
    backgroundColor: colors.brand[50],
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: colors.success },
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  payoutBadge: {
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  offerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapBtn: {
    width: 48,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
