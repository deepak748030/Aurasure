import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
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

export function MapScreen({ navigation }: Props): React.ReactElement {
  const { showModal } = useVendorModal();
  const { vendor, setVendor, refresh } = useVendor();
  const { height: windowHeight } = useWindowDimensions();

  const saved = { lat: vendor?.geo?.lat ?? null, lng: vendor?.geo?.lng ?? null };
  const [point, setPoint] = useState({ lat: saved.lat ?? FALLBACK.lat, lng: saved.lng ?? FALLBACK.lng });
  const [containerHeight, setContainerHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [busy, setBusy] = useState(false);

  // A profile refresh can land after mount; adopt the stored pin until the
  // vendor starts dragging, otherwise the screen would show a stale point.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched || saved.lat == null || saved.lng == null) return;
    setPoint((current) => (same(current.lat, saved.lat as number) && same(current.lng, saved.lng as number) ? current : { lat: saved.lat as number, lng: saved.lng as number }));
  }, [saved.lat, saved.lng, touched]);

  const availableMapHeight = containerHeight && footerHeight ? containerHeight - footerHeight : 0;
  const mapHeight = availableMapHeight ? Math.max(220, Math.min(availableMapHeight, Math.round(windowHeight * 0.54))) : 0;
  const dirty = saved.lat == null || saved.lng == null || !same(point.lat, saved.lat) || !same(point.lng, saved.lng);

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const geo = { lat: point.lat, lng: point.lng };
      // Approved outlets patch the storefront so dispatch picks the pin up too;
      // everyone else still has a vendor document to write to.
      const result = vendor?.outletId
        ? await vendorApi.updateOutlet(vendor.outletId, { geo })
        : await vendorApi.updateProfile({ geo });
      if (result?.vendor) setVendor(result.vendor);
      else await refresh();
      showModal({ title: 'Pin saved', message: `Riders will now be sent to ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}.` });
      navigation.goBack();
    } catch (e) {
      showModal({ title: 'Could not save pin', message: e instanceof Error ? e.message : 'Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Outlet map pin" subtitle="Tap or drag the pin to your pickup entrance" headerLeft={<BackButton onPress={() => navigation.goBack()} />} scroll={false} padded={false}>
      <View style={styles.container} onLayout={(event) => setContainerHeight(Math.round(event.nativeEvent.layout.height))}>
        <View style={{ height: mapHeight, overflow: 'hidden' }}>
          {mapHeight > 0 ? (
            <MapSurface
              editable
              lat={point.lat}
              lng={point.lng}
              onChange={(lat, lng) => { setTouched(true); setPoint({ lat, lng }); }}
              height={mapHeight}
            />
          ) : null}
        </View>
        <View onLayout={(event) => setFooterHeight(Math.round(event.nativeEvent.layout.height))}>
          <Card style={styles.footer}>
            <View style={styles.tip}>
              <Icon name="mapPinned" size={19} color={colors.brand[600]} />
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold">Pickup point</Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</Text>
              </View>
              {dirty ? <Text variant="caption" weight="bold" color={colors.warning}>UNSAVED</Text> : <Text variant="caption" weight="bold" color={colors.success}>SAVED</Text>}
            </View>
            <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 10 }}>
              Place the pin at the entrance where riders should collect orders, not the centre of the building.
            </Text>
            <Button title={dirty ? 'Save pickup pin' : 'Pin already saved'} loading={busy} onPress={() => void save()} style={{ marginTop: 13 }} />
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, paddingHorizontal: 4 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
