import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { MapSurface } from '@/screens/shared/MapSurface';
import { Card } from '@/components/ui/VendorUI';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/types';
import { useVendorModal } from '@/components/ui/VendorModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

const FALLBACK = { lat: 22.7196, lng: 75.8577 };
const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/** Builds a readable street line out of an Expo reverse-geocode result. */
function formatAddress(place: Location.LocationGeocodedAddress): string {
  const parts = [place.name, place.street, place.district, place.subregion].filter(
    (value, index, all) => Boolean(value) && all.indexOf(value) === index,
  );
  return parts.slice(0, 3).join(', ');
}

export function MapScreen({ navigation }: Props): React.ReactElement {
  const { showModal } = useVendorModal();
  const { vendor, setVendor, refresh } = useVendor();
  const { height: windowHeight } = useWindowDimensions();

  const savedLat = vendor?.geo?.lat ?? null;
  const savedLng = vendor?.geo?.lng ?? null;
  const [point, setPoint] = useState({ lat: savedLat ?? FALLBACK.lat, lng: savedLng ?? FALLBACK.lng });
  const [address, setAddress] = useState(vendor?.address ?? '');
  const [landmark, setLandmark] = useState(vendor?.landmark ?? '');
  const [city, setCity] = useState(vendor?.city ?? '');
  const [pin, setPin] = useState(vendor?.pin ?? '');
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  // A profile refresh can land after mount; adopt the stored pin until the
  // vendor starts dragging, otherwise the screen would show a stale point.
  useEffect(() => {
    if (touched || savedLat == null || savedLng == null) return;
    setPoint((current) => (same(current.lat, savedLat) && same(current.lng, savedLng) ? current : { lat: savedLat, lng: savedLng }));
  }, [savedLat, savedLng, touched]);

  /**
   * Turns the dropped pin into a street address. Without this the outlet
   * screen keeps printing the address captured at registration, however far
   * the pin has been moved.
   */
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseGeocode = useCallback(async (next: { lat: number; lng: number }) => {
    setLooking(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: next.lat, longitude: next.lng });
      if (!place) return;
      const line = formatAddress(place);
      if (line) setAddress(line);
      if (place.city || place.subregion) setCity(place.city || place.subregion || '');
      if (place.postalCode) setPin(place.postalCode);
    } catch {
      // Offline or no geocoding provider — the vendor can still type it in.
    } finally {
      setLooking(false);
    }
  }, []);

  const onPinMoved = (lat: number, lng: number): void => {
    setTouched(true);
    setPoint({ lat, lng });
    // Debounced so dragging the marker does not fire a lookup per frame.
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => void reverseGeocode({ lat, lng }), 700);
  };
  useEffect(() => () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); }, []);

  const [containerHeight, setContainerHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const availableMapHeight = containerHeight && footerHeight ? containerHeight - footerHeight : 0;
  const mapHeight = availableMapHeight ? Math.max(200, Math.min(availableMapHeight, Math.round(windowHeight * 0.4))) : 0;

  const movedPin = savedLat == null || savedLng == null || !same(point.lat, savedLat) || !same(point.lng, savedLng);
  const changedText = address !== (vendor?.address ?? '') || landmark !== (vendor?.landmark ?? '') || city !== (vendor?.city ?? '') || pin !== (vendor?.pin ?? '');
  const dirty = movedPin || changedText;

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const body = {
        geo: { lat: point.lat, lng: point.lng },
        address: address.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        pin: pin.trim(),
      };
      const result = vendor?.outletId
        ? await vendorApi.updateOutlet(vendor.outletId, body)
        : await vendorApi.updateProfile(body);
      if (result?.vendor) setVendor(result.vendor);
      else await refresh();
      showModal({ title: 'Pickup location saved', message: `${body.address || 'Pin'} · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` });
      navigation.goBack();
    } catch (e) {
      showModal({ title: 'Could not save', message: e instanceof Error ? e.message : 'Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Outlet map pin" subtitle="Drop the pin, then confirm the address" headerLeft={<BackButton onPress={() => navigation.goBack()} />} scroll={false} padded={false}>
      <View style={styles.container} onLayout={(event) => setContainerHeight(Math.round(event.nativeEvent.layout.height))}>
        <View style={{ height: mapHeight, overflow: 'hidden' }}>
          {mapHeight > 0 ? (
            <MapSurface editable lat={point.lat} lng={point.lng} onChange={onPinMoved} height={mapHeight} />
          ) : null}
        </View>

        <View style={styles.sheet} onLayout={(event) => setFooterHeight(Math.round(event.nativeEvent.layout.height))}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            <View style={styles.tip}>
              <Icon name="mapPinned" size={19} color={colors.brand[600]} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold">Pickup point</Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</Text>
              </View>
              {looking ? <ActivityIndicator size="small" color={colors.brand[600]} /> : (
                <Text variant="caption" weight="bold" color={dirty ? colors.warning : colors.success}>{dirty ? 'UNSAVED' : 'SAVED'}</Text>
              )}
            </View>

            <Card style={styles.form}>
              <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 8 }}>
                {looking ? 'Reading the address from the map…' : 'Filled from the map — edit anything that looks wrong.'}
              </Text>
              <Input label="Street / building" value={address} onChangeText={setAddress} placeholder="Shop 4, Civil Lines" leftIcon="mapPin" />
              <Input label="Landmark" value={landmark} onChangeText={setLandmark} placeholder="Near City Hospital" />
              <View style={styles.two}>
                <View style={{ flex: 1.4 }}><Input label="City" value={city} onChangeText={setCity} placeholder="Raipur" /></View>
                <View style={{ flex: 1 }}><Input label="PIN" value={pin} onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 6))} placeholder="492001" keyboardType="number-pad" /></View>
              </View>
            </Card>

            <Button title={dirty ? 'Save pickup location' : 'Location already saved'} loading={busy} onPress={() => void save()} />
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheet: { flex: 1, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  sheetBody: { padding: 14, paddingBottom: 28 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  form: { marginBottom: 14 },
  two: { flexDirection: 'row', gap: 10 },
});
