import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { riderApi, type DeliveryTask } from '@/api/rider';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderMap'>;

// ─── Helpers ────────────────────────────────────────────────────────────────
function openNav(lat: number, lng: number, label: string) {
  const url = Platform.select({
    ios: `maps:${lat},${lng}?q=${encodeURIComponent(label)}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  });
  Linking.openURL(url ?? '').catch(() =>
    Alert.alert('Navigation', 'Could not open maps app.'),
  );
}

function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status config ───────────────────────────────────────────────────────────
const STATE_LABEL: Record<string, string> = {
  accepted: 'Head to pickup',
  at_pickup: 'At pickup — enter OTP',
  picked_up: 'Head to customer',
  at_drop: 'At drop — enter OTP',
  delivered: 'Delivered ✓',
  failed: 'Task failed',
};

const STATE_COLOR: Record<string, string> = {
  accepted: colors.brand[600],
  at_pickup: colors.warning,
  picked_up: colors.brand[600],
  at_drop: colors.warning,
  delivered: colors.success,
  failed: colors.danger,
};

// ─── Component ───────────────────────────────────────────────────────────────
export function OrderMapScreen({ route, navigation }: Props): React.ReactElement {
  const { taskId } = route.params;
  const mapRef = useRef<MapView | null>(null);
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Load task + rider location
  const pull = useCallback(async () => {
    try {
      const res = await riderApi.activeTask();
      if (res.task) setTask(res.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load task');
    }

    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setRiderPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Send to server
        void riderApi.locationBatch([{ lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date().toISOString() }]).catch(() => null);
      }
    } catch {
      // location not available
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void pull();
    const interval = setInterval(() => void pull(), 15000);
    return () => clearInterval(interval);
  }, [pull]);

  // Fit map to show all markers
  useEffect(() => {
    if (!mapRef.current || !task) return;
    const coords: { latitude: number; longitude: number }[] = [];

    const pickLat = Number(task.pickup.lat);
    const pickLng = Number(task.pickup.lng);
    const dropLat = Number(task.drop.lat);
    const dropLng = Number(task.drop.lng);

    if (pickLat && pickLng) coords.push({ latitude: pickLat, longitude: pickLng });
    if (dropLat && dropLng) coords.push({ latitude: dropLat, longitude: dropLng });
    if (riderPos) coords.push({ latitude: riderPos.lat, longitude: riderPos.lng });

    if (coords.length >= 2) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    }
  }, [task, riderPos]);

  const run = async (fn: () => Promise<{ task: DeliveryTask }>) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      haptic.success();
      setTask(res.task);
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[600]} size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Icon name="circleAlert" size={40} color={colors.danger} />
        <Text variant="h3" style={{ marginTop: 12, textAlign: 'center' }}>No active task</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6, textAlign: 'center' }}>
          {error || 'Accept a delivery first.'}
        </Text>
        <View style={{ marginTop: 20, width: 200 }}>
          <Button title="Go back" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const pickLat = Number(task.pickup.lat);
  const pickLng = Number(task.pickup.lng);
  const dropLat = Number(task.drop.lat);
  const dropLng = Number(task.drop.lng);
  const hasPickupCoords = Boolean(pickLat && pickLng);
  const hasDropCoords = Boolean(dropLat && dropLng);

  // Distance card
  const toPickup = riderPos && hasPickupCoords
    ? distanceKm(riderPos.lat, riderPos.lng, pickLat, pickLng)
    : null;
  const pickToCustomer = hasPickupCoords && hasDropCoords
    ? distanceKm(pickLat, pickLng, dropLat, dropLng)
    : null;

  const isGoingToPickup = ['accepted', 'at_pickup'].includes(task.state);
  const isGoingToDrop = ['picked_up', 'at_drop'].includes(task.state);

  const stateColor = STATE_COLOR[task.state] ?? colors.brand[600];
  const stateLabel = STATE_LABEL[task.state] ?? task.state.replace(/_/g, ' ');

  // Default region if no coords
  const initRegion =
    hasPickupCoords
      ? { latitude: pickLat, longitude: pickLng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
      : hasDropCoords
        ? { latitude: dropLat, longitude: dropLng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
        : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="chevronLeft" size={26} color={colors.text} />
      </TouchableOpacity>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={initRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsScale
      >
        {/* Rider marker */}
        {riderPos ? (
          <Marker
            coordinate={{ latitude: riderPos.lat, longitude: riderPos.lng }}
            title="You"
            description={`Duty: ${task.state}`}
            pinColor={colors.brand[600]}
          />
        ) : null}

        {/* Pickup marker */}
        {hasPickupCoords ? (
          <Marker
            coordinate={{ latitude: pickLat, longitude: pickLng }}
            title={`Pickup: ${task.vendorName}`}
            description={task.pickup.address}
            pinColor={colors.warning}
          />
        ) : null}

        {/* Drop marker */}
        {hasDropCoords ? (
          <Marker
            coordinate={{ latitude: dropLat, longitude: dropLng }}
            title={`Drop: ${task.drop.name}`}
            description={task.drop.address}
            pinColor={colors.danger}
          />
        ) : null}

        {/* Route line */}
        {riderPos && hasPickupCoords && isGoingToPickup ? (
          <Polyline
            coordinates={[
              { latitude: riderPos.lat, longitude: riderPos.lng },
              { latitude: pickLat, longitude: pickLng },
            ]}
            strokeColor={colors.brand[500]}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        ) : null}
        {hasPickupCoords && hasDropCoords && isGoingToDrop ? (
          <Polyline
            coordinates={[
              { latitude: pickLat, longitude: pickLng },
              { latitude: dropLat, longitude: dropLng },
            ]}
            strokeColor={colors.brand[500]}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        ) : null}
      </MapView>

      {/* Bottom card */}
      <View style={styles.card}>
        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: stateColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
          <Text variant="caption" weight="bold" style={{ color: stateColor }}>
            {stateLabel}
          </Text>
        </View>

        {/* Order info */}
        <Text variant="title" weight="bold" style={{ marginTop: 8 }}>
          {task.orderCode} — {task.vendorName} → {task.drop.name}
        </Text>

        {/* Distance row */}
        <View style={styles.distRow}>
          {toPickup !== null ? (
            <View style={styles.distChip}>
              <Icon name="bike" size={13} color={colors.brand[600]} />
              <Text variant="caption" color={colors.brand[700]}>
                {' '}{toPickup < 1 ? `${Math.round(toPickup * 1000)} m` : `${toPickup.toFixed(1)} km`} to pickup
              </Text>
            </View>
          ) : null}
          {pickToCustomer !== null ? (
            <View style={styles.distChip}>
              <Icon name="mapPin" size={13} color={colors.success} />
              <Text variant="caption" color={colors.success}>
                {' '}{pickToCustomer < 1 ? `${Math.round(pickToCustomer * 1000)} m` : `${pickToCustomer.toFixed(1)} km`} to customer
              </Text>
            </View>
          ) : null}
          <View style={styles.distChip}>
            <Icon name="rupee" size={13} color={colors.textSecondary} />
            <Text variant="caption" color={colors.textSecondary}>
              {' '}+{formatINR(task.riderPayout)}
            </Text>
          </View>
        </View>

        {/* COD */}
        {task.codAmount > 0 ? (
          <View style={[styles.codRow, { backgroundColor: colors.warningBg }]}>
            <Icon name="wallet" size={15} color={colors.warning} />
            <Text variant="caption" weight="bold" color={colors.warning}>
              {' '}COD — collect {formatINR(task.codAmount)} from customer
            </Text>
          </View>
        ) : (
          <View style={[styles.codRow, { backgroundColor: colors.successBg }]}>
            <Icon name="circleCheck" size={15} color={colors.success} />
            <Text variant="caption" weight="bold" color={colors.success}>{' '}Prepaid — no cash needed</Text>
          </View>
        )}

        {error ? (
          <Text variant="caption" color={colors.danger} style={{ marginTop: 6 }}>{error}</Text>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actRow}>
          {/* Navigate button */}
          {isGoingToPickup && hasPickupCoords ? (
            <View style={{ flex: 1 }}>
              <Button
                title="Navigate to pickup"
                variant="secondary"
                size="sm"
                leftIcon="navigation"
                onPress={() => openNav(pickLat, pickLng, task.vendorName)}
              />
            </View>
          ) : isGoingToDrop && hasDropCoords ? (
            <View style={{ flex: 1 }}>
              <Button
                title="Navigate to customer"
                variant="secondary"
                size="sm"
                leftIcon="navigation"
                onPress={() => openNav(dropLat, dropLng, task.drop.name)}
              />
            </View>
          ) : null}

          {/* State action */}
          <View style={{ flex: 1 }}>
            {task.state === 'accepted' ? (
              <Button
                title="Arrived at pickup"
                size="sm"
                loading={busy}
                onPress={() => void run(() => riderApi.arrivedPickup(task.id))}
              />
            ) : task.state === 'picked_up' ? (
              <Button
                title="Arrived at drop"
                size="sm"
                loading={busy}
                onPress={() => void run(() => riderApi.arrivedDrop(task.id))}
              />
            ) : (
              <Button
                title="Full task screen"
                variant="secondary"
                size="sm"
                leftIcon="orders"
                onPress={() => navigation.navigate('ActiveTask')}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 32 },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  distRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  distChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  actRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
