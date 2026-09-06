import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Icon } from '@/lib/icons';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';

type Props = { lat?: number | null; lng?: number | null; editable?: boolean; onChange?: (lat: number, lng: number) => void; height?: number };

const DEFAULT = { lat: 22.7196, lng: 75.8577 };
const DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };
/** Zoom in a little when the user explicitly asks for their own position. */
const LOCATE_DELTA = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export function MapSurface({ lat, lng, editable = false, onChange, height = 218 }: Props): React.ReactElement {
  const mapRef = useRef<MapView | null>(null);
  const [point, setPoint] = useState({ lat: lat ?? DEFAULT.lat, lng: lng ?? DEFAULT.lng });
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const initialRegion: Region = { latitude: point.lat, longitude: point.lng, ...DELTA };

  /** Drives the camera to a coordinate — `initialRegion` alone never re-centres. */
  const centreOn = useCallback((next: { lat: number; lng: number }, delta = DELTA) => {
    mapRef.current?.animateToRegion({ latitude: next.lat, longitude: next.lng, ...delta }, 550);
  }, []);

  const move = useCallback(
    (next: { lat: number; lng: number }, recentre = false, delta = DELTA) => {
      setPoint(next);
      onChange?.(next.lat, next.lng);
      if (recentre) centreOn(next, delta);
    },
    [onChange, centreOn],
  );

  // A pin loaded from the server can arrive after the first render, so follow it.
  useEffect(() => {
    if (lat == null || lng == null) return;
    setPoint((current) => {
      if (Math.abs(current.lat - lat) < 1e-6 && Math.abs(current.lng - lng) < 1e-6) return current;
      centreOn({ lat, lng });
      return { lat, lng };
    });
  }, [lat, lng, centreOn]);

  const locate = async (): Promise<void> => {
    if (!editable || locating) return;
    setLocating(true);
    setDenied(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setDenied(true);
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Move the pin AND fly the camera to it so the vendor never has to scroll.
      move({ lat: current.coords.latitude, lng: current.coords.longitude }, true, LOCATE_DELTA);
    } catch {
      setDenied(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ height }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={editable}
        onPress={(event: MapPressEvent) => {
          if (editable) {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            move({ lat: latitude, lng: longitude });
          }
        }}
      >
        <Marker
          coordinate={{ latitude: point.lat, longitude: point.lng }}
          title="Outlet pickup pin"
          draggable={editable}
          onDragEnd={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            move({ lat: latitude, lng: longitude });
          }}
        />
      </MapView>

      {editable ? (
        <>
          <Pressable onPress={() => void locate()} disabled={locating} style={styles.locate}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.brand[700]} />
            ) : (
              <Icon name="locate" size={17} color={colors.brand[700]} />
            )}
            <Text variant="caption" weight="bold" color={colors.brand[700]}>
              {locating ? 'Locating…' : 'Use my location'}
            </Text>
          </Pressable>
          {/* Recentres on the pin without moving it — handy after panning around. */}
          <Pressable onPress={() => centreOn(point)} style={styles.recentre}>
            <Icon name="mapPin" size={16} color={colors.brand[700]} />
          </Pressable>
          {denied ? (
            <View style={styles.hint}>
              <Text variant="caption" color={colors.white}>
                Location unavailable — tap the map to drop your pin.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  locate: { position: 'absolute', right: 12, bottom: 12, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  recentre: { position: 'absolute', right: 12, top: 12, backgroundColor: colors.white, borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 12, bottom: 12, right: 120, backgroundColor: 'rgba(32,29,27,0.82)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
});
