import React, { useState } from 'react';
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
export function MapScreen({ navigation }: Props): React.ReactElement { const { showModal } = useVendorModal(); const { vendor, setVendor } = useVendor(); const { height } = useWindowDimensions(); const [point, setPoint] = useState({ lat: vendor?.geo?.lat ?? 22.7196, lng: vendor?.geo?.lng ?? 75.8577 }); const [busy, setBusy] = useState(false); const save = async () => { if (!vendor?.outletId) return; setBusy(true); try { const result = await vendorApi.updateOutlet(vendor.outletId, { geo: point }); setVendor(result.vendor); showModal({ title: 'Pin saved', message: 'Dispatch will use this location for rider pickup.' }); navigation.goBack(); } catch (e) { showModal({ title: 'Could not save pin', message: e instanceof Error ? e.message : 'Try again' }); } finally { setBusy(false); } };
  return <Screen title="Outlet map pin" subtitle="Tap or drag the pin to your pickup entrance" headerLeft={<BackButton onPress={() => navigation.goBack()} />} scroll={false} padded={false}><View style={{ height: Math.max(280, height - 190) }}><MapSurface editable lat={point.lat} lng={point.lng} onChange={(lat, lng) => setPoint({ lat, lng })} height={Math.max(280, height - 190)} /></View><Card style={styles.footer}><View style={styles.tip}><Icon name="mapPinned" size={19} color={colors.brand[600]} /><View style={{ flex: 1 }}><Text variant="title" weight="bold">Pickup point</Text><Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</Text></View></View><Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 10 }}>Place the pin at the entrance where riders should collect orders, not the centre of the building.</Text><Button title="Save pickup pin" loading={busy} onPress={() => void save()} style={{ marginTop: 13 }} /></Card></Screen>; }
const styles = StyleSheet.create({ footer: { borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, paddingHorizontal: 4 }, tip: { flexDirection: 'row', alignItems: 'center', gap: 9 } });
