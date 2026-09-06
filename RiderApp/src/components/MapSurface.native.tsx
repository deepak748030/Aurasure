import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, type Region } from "react-native-maps";
import { colors } from "@/theme/colors";
import { Icon } from "@/lib/icons";
import { Text } from "./ui/Text";

type Coordinate = { latitude: number; longitude: number };
export type MapStop = Coordinate & {
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

const INDIA: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

/**
 * A real react-native-maps surface on iOS/Android and a dependency-free map
 * treatment in the web preview. The preview still communicates pickup/drop
 * routing and keeps the map flush to the edges, while native builds get pan,
 * zoom, markers and a route polyline.
 */
export function MapSurface({
  stops = [],
  height = 220,
  interactive = true,
  onLocate,
  onMapPress,
  showLabels = true,
}: MapSurfaceProps): React.ReactElement {
  const mapRef = useRef<MapView | null>(null);
  const [routePoints, setRoutePoints] = useState<Coordinate[]>([]);

  const stopsWithCoord = stops.filter(
    (s) => s.latitude != null && s.longitude != null,
  );
  const coordinatesFromStops = stopsWithCoord.map(
    ({ latitude, longitude }) => ({ latitude, longitude }),
  );

  // Fetch real road route from OSRM demo when we have 2+ points
  useEffect(() => {
    if (stopsWithCoord.length < 2) {
      setRoutePoints([]);
      return;
    }
    const coordsStr = stopsWithCoord
      .map((s) => `${s.longitude},${s.latitude}`)
      .join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const pts: Coordinate[] = data.routes[0].geometry.coordinates.map(
            (c: number[]) => ({ latitude: c[1], longitude: c[0] }),
          );
          setRoutePoints(pts);
        } else {
          setRoutePoints([]);
        }
      })
      .catch(() => setRoutePoints([]));
  }, [stops.length]);

  const coordinates =
    routePoints.length > 0 ? routePoints : coordinatesFromStops;
  const first = coordinates[0];
  const region: Region = first
    ? {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      }
    : INDIA;

  useEffect(() => {
    if (Platform.OS === "web" || !mapRef.current || coordinates.length < 2)
      return;
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 55, right: 30, bottom: 55, left: 30 },
      animated: false,
    });
  }, [stops.length]); // fit once when the route first arrives; rider updates should not jump the map

  if (Platform.OS === "web") {
    return (
      <Pressable onPress={onMapPress} style={[styles.preview, { height }]}>
        <View style={styles.waterBand} />
        <View style={[styles.road, styles.roadA]} />
        <View style={[styles.road, styles.roadB]} />
        <View style={[styles.road, styles.roadC]} />
        <View
          style={[
            styles.park,
            { left: "10%", top: "19%", width: 78, height: 44 },
          ]}
        />
        <View
          style={[
            styles.park,
            { right: "13%", bottom: "18%", width: 96, height: 52 },
          ]}
        />
        {stops.map((stop, index) => {
          const pos =
            index === 0
              ? { left: "29%", top: "40%" }
              : index === stops.length - 1
                ? { right: "25%", bottom: "24%" }
                : { left: "51%", top: "52%" };
          const markerColor =
            stop.type === "pickup"
              ? colors.warning
              : stop.type === "drop"
                ? colors.danger
                : colors.brand[600];
          return (
            <View
              key={`${stop.label}-${index}`}
              style={[styles.webMarker, pos as never]}
            >
              <View
                style={[
                  styles.markerHalo,
                  { backgroundColor: `${markerColor}22` },
                ]}
              >
                <View
                  style={[styles.markerCore, { backgroundColor: markerColor }]}
                />
              </View>
              {showLabels ? (
                <View style={styles.markerLabel}>
                  <Text variant="caption" weight="bold" color={colors.text}>
                    {stop.type === "rider"
                      ? "YOU"
                      : stop.type === "pickup"
                        ? "PICKUP"
                        : "DROP"}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={styles.mapAttribution}>
          <Icon name="map" size={12} color={colors.textTertiary} />
          <Text variant="caption" color={colors.textTertiary}>
            Live route preview
          </Text>
        </View>
        {onLocate ? (
          <Pressable onPress={onLocate} style={styles.locate}>
            <Icon name="locate" size={18} color={colors.brand[600]} />
          </Pressable>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={{ height }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsCompass={false}
        showsScale={false}
        showsMyLocationButton={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        onPress={onMapPress}
      >
        {stops.map((stop, index) => (
          <Marker
            key={`${stop.label}-${index}`}
            coordinate={stop}
            title={stop.label}
            pinColor={
              stop.type === "pickup"
                ? colors.warning
                : stop.type === "drop"
                  ? colors.danger
                  : colors.brand[600]
            }
          />
        ))}
        {coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={colors.brand[600]}
            strokeWidth={4}
            lineDashPattern={[9, 5]}
          />
        ) : null}
      </MapView>
      {onLocate ? (
        <Pressable onPress={onLocate} style={styles.locate}>
          <Icon name="locate" size={18} color={colors.brand[600]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: "#E9F1EE",
    overflow: "hidden",
    position: "relative",
  },
  waterBand: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "35%",
    backgroundColor: colors.mapWater,
    transform: [{ rotate: "-4deg" }, { scale: 1.12 }],
  },
  road: {
    position: "absolute",
    backgroundColor: colors.mapRoad,
    borderWidth: 1,
    borderColor: "#E5E7E5",
  },
  roadA: {
    width: "140%",
    height: 18,
    left: "-15%",
    top: "47%",
    transform: [{ rotate: "-17deg" }],
  },
  roadB: {
    width: 18,
    height: "120%",
    left: "58%",
    top: "-12%",
    transform: [{ rotate: "23deg" }],
  },
  roadC: {
    width: "130%",
    height: 10,
    left: "-5%",
    top: "70%",
    transform: [{ rotate: "8deg" }],
  },
  park: {
    position: "absolute",
    backgroundColor: colors.mapPark,
    borderRadius: 24,
    opacity: 0.9,
  },
  webMarker: { position: "absolute", alignItems: "center" },
  markerHalo: {
    width: 34,
    height: 34,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  markerCore: {
    width: 14,
    height: 14,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.white,
  },
  markerLabel: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: -2,
  },
  mapAttribution: {
    position: "absolute",
    bottom: 8,
    left: 10,
    backgroundColor: "rgba(255,255,255,.86)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  locate: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
