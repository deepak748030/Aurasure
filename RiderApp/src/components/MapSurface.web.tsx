import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Polyline, Svg } from "react-native-svg";
import { colors } from "@/theme/colors";
import { Icon } from "@/lib/icons";
import { Text } from "./ui/Text";

type MapStop = {
  latitude: number;
  longitude: number;
  label: string;
  type: "pickup" | "drop" | "rider";
};
interface MapSurfaceProps {
  stops?: MapStop[];
  height?: number;
  interactive?: boolean;
  onLocate?: () => void;
  onMapPress?: () => void;
  showLabels?: boolean;
}

const TILE_SIZE = 256;
const DEFAULT_CENTER = { latitude: 18.5204, longitude: 73.8567 };
const DEFAULT_ZOOM = 13;

function project(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((latitude * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function tileUrl(x: number, y: number, zoom: number): string | null {
  const max = 2 ** zoom;
  if (y < 0 || y >= max) return null;
  const wrappedX = ((x % max) + max) % max;
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`;
}

/**
 * Browser map backed by live OpenStreetMap raster tiles. Native builds use
 * react-native-maps; keeping this implementation separate avoids importing a
 * native-only module into Expo web while preserving real pan/zoom context.
 */
export function MapSurface({
  stops = [],
  height = 220,
  interactive = true,
  onLocate,
  onMapPress,
  showLabels = true,
}: MapSurfaceProps): React.ReactElement {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const center = useMemo(() => {
    if (!stops.length) return DEFAULT_CENTER;
    const latitudes = stops.map((stop) => stop.latitude);
    const longitudes = stops.map((stop) => stop.longitude);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    };
  }, [stops]);
  const centerPoint = project(center.latitude, center.longitude, zoom);
  const tileRange = useMemo(() => {
    const tiles: { key: string; url: string; left: number; top: number }[] = [];
    const centerTileX = Math.floor(centerPoint.x / TILE_SIZE);
    const centerTileY = Math.floor(centerPoint.y / TILE_SIZE);
    for (let x = centerTileX - 2; x <= centerTileX + 2; x += 1) {
      for (let y = centerTileY - 2; y <= centerTileY + 2; y += 1) {
        const url = tileUrl(x, y, zoom);
        if (url) {
          tiles.push({
            key: `${zoom}-${x}-${y}`,
            url,
            left: size.width / 2 + x * TILE_SIZE - centerPoint.x,
            top: size.height / 2 + y * TILE_SIZE - centerPoint.y,
          });
        }
      }
    }
    return tiles;
  }, [centerPoint.x, centerPoint.y, size.height, size.width, zoom]);

  const pointOnMap = (stop: MapStop) => {
    const point = project(stop.latitude, stop.longitude, zoom);
    return {
      left: size.width / 2 + point.x - centerPoint.x,
      top: size.height / 2 + point.y - centerPoint.y,
    };
  };
  const routePoints = stops
    .map((stop) => {
      const point = pointOnMap(stop);
      return `${point.left},${point.top}`;
    })
    .join(" ");

  const mapLayer = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {tileRange.map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tile.url }}
          style={[styles.tile, { left: tile.left, top: tile.top }]}
          resizeMode="cover"
        />
      ))}
      <View style={styles.tileShade} />
      {size.width > 0 && stops.length > 1 ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polyline
            points={routePoints}
            fill="none"
            stroke={colors.brand[600]}
            strokeWidth={5}
            strokeOpacity={0.82}
          />
        </Svg>
      ) : null}
      {stops.map((stop, index) => {
        const point = pointOnMap(stop);
        const markerColor =
          stop.type === "pickup"
            ? colors.warning
            : stop.type === "drop"
              ? colors.danger
              : colors.brand[600];
        return (
          <View
            key={`${stop.label}-${index}`}
            style={[styles.webMarker, { left: point.left - 18, top: point.top - 18 }]}
            pointerEvents="none"
          >
            <View style={[styles.markerHalo, { backgroundColor: `${markerColor}26` }]}>
              <View style={[styles.markerCore, { backgroundColor: markerColor }]} />
            </View>
            {showLabels ? (
              <View style={styles.markerLabel}>
                <Text variant="caption" weight="bold" color={colors.text}>
                  {stop.type === "rider" ? "YOU" : stop.type === "pickup" ? "PICKUP" : "DROP"}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <View
      style={[styles.preview, { height }]}
      onLayout={(event) =>
        setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
      }
    >
      {onMapPress ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onMapPress}>
          {mapLayer}
        </Pressable>
      ) : (
        mapLayer
      )}
      <View style={styles.mapAttribution} pointerEvents="none">
        <Icon name="map" size={12} color={colors.textTertiary} />
        <Text variant="caption" color={colors.textTertiary}>
          © OpenStreetMap contributors
        </Text>
      </View>
      {interactive ? (
        <View style={styles.zoomTools}>
          <Pressable onPress={() => setZoom((value) => Math.min(18, value + 1))} style={styles.zoomButton}>
            <Text variant="h3" weight="bold" color={colors.text}>+</Text>
          </Pressable>
          <Pressable onPress={() => setZoom((value) => Math.max(3, value - 1))} style={styles.zoomButton}>
            <Text variant="h3" weight="bold" color={colors.text}>−</Text>
          </Pressable>
        </View>
      ) : null}
      {onLocate ? (
        <Pressable onPress={onLocate} style={styles.locate}>
          <Icon name="locate" size={18} color={colors.brand[600]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: "#DCEAE8", overflow: "hidden", position: "relative" },
  tile: { position: "absolute", width: TILE_SIZE, height: TILE_SIZE },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,.08)" },
  webMarker: { position: "absolute", alignItems: "center" },
  markerHalo: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  markerCore: { width: 15, height: 15, borderRadius: 8, borderWidth: 3, borderColor: colors.white },
  markerLabel: { backgroundColor: colors.white, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginTop: -2, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  mapAttribution: { position: "absolute", bottom: 8, left: 10, backgroundColor: "rgba(255,255,255,.9)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", gap: 4, alignItems: "center" },
  zoomTools: { position: "absolute", right: 12, top: 12, overflow: "hidden", borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  zoomButton: { width: 38, height: 34, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  locate: { position: "absolute", right: 12, top: 88, width: 38, height: 38, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
});
