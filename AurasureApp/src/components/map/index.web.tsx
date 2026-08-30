import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewStyle } from 'react-native';

// Web stub for react-native-maps. The app's map picker is a native feature, so
// on web we render a harmless placeholder with a map pin instead of breaking
// the bundle. All imperative helpers (animateToRegion) are no-ops.
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapViewHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

interface MapViewProps {
  style?: ViewStyle | ViewStyle[];
  initialRegion?: Region;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onMapReady?: () => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  children?: React.ReactNode;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ style, children }, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion: () => undefined }));
  return (
    <View style={[styles.map, style]}>
      <View style={styles.pin}>
        <View style={styles.pinDot} />
      </View>
      {children}
    </View>
  );
});

export function Marker(_props: { coordinate: Region; pinColor?: string }): React.ReactElement | null {
  return null;
}

const styles = {
  map: { backgroundColor: '#C5C8CF', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  pin: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#A4006B',
    borderWidth: 3,
    borderColor: '#F7E2F1',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF' } as ViewStyle,
};
