import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MapSurface, type MapStop } from "@/components/MapSurface";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { IconButton, StatusPill } from "@/components/ui/RiderUI";
import { riderApi, type DeliveryTask } from "@/api/rider";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OrderMap">;
const labels: Record<string, string> = {
  accepted: "Going to pickup",
  at_pickup: "At pickup",
  picked_up: "Going to customer",
  at_drop: "At drop-off",
  delivered: "Delivered",
  failed: "Delivery failed",
};
function openMaps(task: DeliveryTask): void {
  const point = ["accepted", "at_pickup"].includes(task.state)
    ? task.pickup
    : task.drop;
  if (point.lat == null || point.lng == null) {
    Alert.alert("Navigation", "This delivery has no map pin yet.");
    return;
  }
  const url = Platform.select({
    ios: `maps:${point.lat},${point.lng}?q=${encodeURIComponent(point.address)}`,
    android: `geo:${point.lat},${point.lng}?q=${encodeURIComponent(point.address)}`,
    default: `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`,
  });
  Linking.openURL(url || "").catch(() =>
    Alert.alert("Navigation", "Could not open maps."),
  );
}
export function OrderMapScreen({
  route,
  navigation,
}: Props): React.ReactElement {
  const { taskId } = route.params;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [riderPosition, setRiderPosition] = useState<MapStop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setTask((await riderApi.task(taskId)).task);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This delivery is no longer available",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    void (async () => {
      try {
        const Location = await import("expo-location");
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "You",
          type: "rider" as const,
        };
        setRiderPosition(current);
        void riderApi
          .locationBatch([
            {
              lat: current.latitude,
              lng: current.longitude,
              at: new Date().toISOString(),
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
            },
          ])
          .catch(() => undefined);
      } catch {
        /* location is optional for map preview */
      }
    })();
  }, []);
  const stops = useMemo<MapStop[]>(() => {
    if (!task) return [];
    const output: MapStop[] = [];
    if (riderPosition) output.push(riderPosition);
    if (task.pickup.lat != null && task.pickup.lng != null)
      output.push({
        latitude: Number(task.pickup.lat),
        longitude: Number(task.pickup.lng),
        label: task.vendorName,
        type: "pickup",
      });
    if (task.drop.lat != null && task.drop.lng != null)
      output.push({
        latitude: Number(task.drop.lat),
        longitude: Number(task.drop.lng),
        label: task.drop.name,
        type: "drop",
      });
    return output;
  }, [riderPosition, task]);
  const action = async () => {
    if (!task) return;
    setBusy(true);
    setError("");
    try {
      if (task.state === "accepted")
        setTask((await riderApi.arrivedPickup(task.id)).task);
      else if (task.state === "picked_up")
        setTask((await riderApi.arrivedDrop(task.id)).task);
      else navigation.navigate("ActiveTask");
      haptic.success();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update delivery",
      );
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
      </View>
    );
  if (!task)
    return (
      <View style={styles.center}>
        <Icon name="map" size={36} color={colors.danger} />
        <Text variant="h3" weight="bold" style={{ marginTop: 12 }}>
          Map unavailable
        </Text>
        <Text
          variant="bodySm"
          color={colors.textSecondary}
          style={{ textAlign: "center", marginTop: 5 }}
        >
          {error}
        </Text>
        <Button
          title="Go back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 18 }}
        />
      </View>
    );
  const stateColor =
    task.state === "at_pickup" || task.state === "at_drop"
      ? colors.warning
      : task.state === "failed"
        ? colors.danger
        : task.state === "delivered"
          ? colors.success
          : colors.brand[600];
  const label = labels[task.state] || task.state.replace(/_/g, " ");
  return (
    <View style={styles.container}>
      <MapSurface height={height} stops={stops} onLocate={() => undefined} />
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 12) }]}>
        <IconButton icon="chevronLeft" onPress={() => navigation.goBack()} />
        <View style={styles.topTitle}>
          <Text variant="caption" weight="bold" color={colors.text}>
            {task.orderCode}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {label}
          </Text>
        </View>
        <IconButton
          icon="phone"
          onPress={() =>
            Linking.openURL(
              `tel:${["accepted", "at_pickup"].includes(task.state) ? task.vendorPhone : task.drop.phone}`,
            ).catch(() => Alert.alert("Call", "Contact unavailable."))
          }
        />
      </View>
      <View
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.stateLine}>
          <StatusPill
            label={label}
            color={stateColor}
            background={`${stateColor}18`}
            icon="navigation"
          />
          <Text variant="h2" weight="bold" color={colors.success}>
            {formatINR(task.riderPayout)}
          </Text>
        </View>
        <Text variant="title" weight="bold" style={{ marginTop: 10 }}>
          {task.vendorName} → {task.drop.name}
        </Text>
        <Text
          variant="bodySm"
          color={colors.textSecondary}
          numberOfLines={2}
          style={{ marginTop: 3 }}
        >
          {["accepted", "at_pickup"].includes(task.state)
            ? task.pickup.address
            : task.drop.address}
        </Text>
        <View style={styles.mapMeta}>
          <View style={styles.mapMetaItem}>
            <Icon name="package" size={15} color={colors.textSecondary} />
            <Text variant="caption" color={colors.textSecondary}>
              {task.items.length} items
            </Text>
          </View>
          <View style={styles.mapMetaItem}>
            <Icon
              name={task.codAmount > 0 ? "cash" : "circleCheck"}
              size={15}
              color={task.codAmount > 0 ? colors.warning : colors.success}
            />
            <Text
              variant="caption"
              color={task.codAmount > 0 ? colors.warning : colors.success}
            >
              {task.codAmount > 0
                ? `COD ${formatINR(task.codAmount)}`
                : "Prepaid"}
            </Text>
          </View>
        </View>
        {error ? (
          <Text
            variant="caption"
            color={colors.danger}
            style={{ marginVertical: 7 }}
          >
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button
              title="Navigate"
              variant="secondary"
              size="sm"
              leftIcon="navigation"
              onPress={() => openMaps(task)}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Button
              title={
                task.state === "accepted"
                  ? "Arrived at pickup"
                  : task.state === "picked_up"
                    ? "Arrived at drop"
                    : "Open delivery"
              }
              size="sm"
              loading={busy}
              onPress={() => void action()}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: colors.background,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { flex: 1, alignItems: "center" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  stateLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    marginTop: 10,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actions: { flexDirection: "row", gap: 8, marginTop: 11 },
});
