import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { RiderModal, type RiderModalAction } from "@/components/ui/RiderModal";
import { Icon } from "@/lib/icons";
import { MapSurface, type MapStop } from "@/components/MapSurface";
import {
  Card,
  IconButton,
  Metric,
  ProgressBar,
  SectionTitle,
  StatusPill,
  RoutePoint,
} from "@/components/ui/RiderUI";
import { riderApi, type DeliveryTask, type OfferResponse } from "@/api/rider";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type HomeDialog = {
  title: string;
  message: string;
  icon?: "circleAlert" | "check" | "map";
  iconColor?: string;
  actions: RiderModalAction[];
};

const DEFAULT_MAP = [
  {
    latitude: 18.5204,
    longitude: 73.8567,
    label: "Your zone",
    type: "rider" as const,
  },
  {
    latitude: 18.527,
    longitude: 73.866,
    label: "Pickup hotspot",
    type: "pickup" as const,
  },
  {
    latitude: 18.511,
    longitude: 73.842,
    label: "Customer area",
    type: "drop" as const,
  },
];

function offerStops(task: DeliveryTask): MapStop[] {
  const pickup =
    task.pickup.lat != null && task.pickup.lng != null
      ? [
          {
            latitude: Number(task.pickup.lat),
            longitude: Number(task.pickup.lng),
            label: task.vendorName,
            type: "pickup" as const,
          },
        ]
      : [];
  const drop =
    task.drop.lat != null && task.drop.lng != null
      ? [
          {
            latitude: Number(task.drop.lat),
            longitude: Number(task.drop.lng),
            label: task.drop.name,
            type: "drop" as const,
          },
        ]
      : [];
  return [...pickup, ...drop];
}

function OfferCard({
  task,
  busy,
  onAccept,
  onReject,
  onMap,
}: {
  task: DeliveryTask;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onMap: () => void;
}): React.ReactElement {
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const age = Math.max(
      0,
      Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 1000),
    );
    setSeconds(Math.max(0, 30 - age));
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [task.createdAt]);
  const expired = seconds === 0;
  return (
    <Card style={styles.offerCard}>
      <View style={styles.offerTop}>
        <View style={styles.offerIcon}>
          <Icon
            name={task.module === "food" ? "utensils" : "package"}
            size={20}
            color={colors.brand[600]}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="title" weight="bold" numberOfLines={1}>
            {task.vendorName || "Aurasure partner store"}
          </Text>
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {task.orderCode} · {task.items.length} item
            {task.items.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.payout}>
          <Text variant="caption" color={colors.success} numberOfLines={1}>
            GUARANTEED
          </Text>
          <Text
            variant="h3"
            weight="bold"
            color={colors.success}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatINR(task.riderPayout)}
          </Text>
        </View>
      </View>
      <View style={styles.offerRoute}>
        <RoutePoint
          type="pickup"
          title={task.vendorName || "Pickup point"}
          address={task.pickup.address}
        />
        <RoutePoint
          type="drop"
          title={task.drop.name || "Customer"}
          address={task.drop.address}
          last
        />
      </View>
      <View style={styles.offerMeta}>
        <View style={styles.metaItem}>
          <Icon name="mapPinned" size={14} color={colors.textSecondary} />
          <Text variant="caption" color={colors.textSecondary}>
            {task.distanceKm
              ? `${task.distanceKm.toFixed(1)} km trip`
              : "Nearby trip"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Icon
            name={task.codAmount > 0 ? "cash" : "circleCheck"}
            size={14}
            color={task.codAmount > 0 ? colors.warning : colors.success}
          />
          <Text
            variant="caption"
            color={task.codAmount > 0 ? colors.warning : colors.success}
            weight="semibold"
          >
            {task.codAmount > 0
              ? `COD ${formatINR(task.codAmount)}`
              : "Prepaid"}
          </Text>
        </View>
        <View
          style={[
            styles.timer,
            expired && { backgroundColor: colors.dangerBg },
          ]}
        >
          <Icon
            name="timer"
            size={14}
            color={expired ? colors.danger : colors.warning}
          />
          <Text
            variant="caption"
            weight="bold"
            color={expired ? colors.danger : colors.warning}
          >
            {expired ? "Expired" : `${seconds}s`}
          </Text>
        </View>
      </View>
      <View style={styles.offerActions}>
        <Pressable onPress={onMap} style={styles.mapAction}>
          <Icon name="map" size={18} color={colors.brand[600]} />
          <Text variant="caption" weight="bold" color={colors.brand[600]}>
            View map
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button
            title="Ignore"
            variant="ghost"
            size="sm"
            loading={busy}
            onPress={onReject}
          />
        </View>
        <View style={{ flex: 1.45 }}>
          <Button
            title="Accept delivery"
            variant="success"
            size="sm"
            loading={busy}
            disabled={expired}
            onPress={onAccept}
          />
        </View>
      </View>
    </Card>
  );
}

export function HomeScreen(): React.ReactElement {
  const { rider, setRider, refresh } = useRider();
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const [data, setData] = useState<OfferResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<HomeDialog | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pull = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await riderApi.offers());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sync deliveries",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    void pull();
    timerRef.current = setInterval(() => void pull(true), 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [focused, pull]);

  const getLocationPoint = async () => {
    const Location = await import("expo-location");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      at: new Date().toISOString(),
    };
  };

  const locateAndSend = async (): Promise<boolean> => {
    try {
      if (!online) {
        setError("Go online to share your location with operations.");
        return false;
      }
      const point = await getLocationPoint();
      if (!point) {
        setError("Location permission is needed while you are online.");
        return false;
      }
      const response = await riderApi.locationBatch([point]);
      setRider(response.rider);
      return true;
    } catch {
      setError(
        "Location is unavailable. You can try again from phone settings.",
      );
      return false;
    }
  };

  const setDuty = async (state: "online" | "offline" | "break") => {
    setDutyBusy(true);
    setError("");
    try {
      let point: Awaited<ReturnType<typeof getLocationPoint>> = null;
      if (state === "online") {
        point = await getLocationPoint();
        if (!point) {
          setError("Location permission is needed to go online.");
          return;
        }
      }
      const response = await riderApi.setDuty(state);
      setRider(response.rider);
      if (point) {
        const locationResponse = await riderApi.locationBatch([point]);
        setRider(locationResponse.rider);
      }
      haptic.success();
      await pull();
    } catch (err) {
      haptic.error();
      setError(
        err instanceof Error ? err.message : "Duty status could not be changed",
      );
    } finally {
      setDutyBusy(false);
    }
  };

  const toggle = (value: boolean) => {
    if (!value && rider?.dutyState === "on_task") {
      setError("Finish your active delivery before going offline.");
      return;
    }
    if (value) {
      void setDuty("online");
      return;
    }
    setDialog({
      title: "Go offline?",
      message:
        "New delivery offers will pause. Your active delivery will not be cancelled.",
      icon: "circleAlert",
      iconColor: colors.warning,
      actions: [
        { label: "Stay online", variant: "secondary", onPress: () => undefined },
        {
          label: "Go offline",
          variant: "danger",
          onPress: () => void setDuty("offline"),
        },
      ],
    });
  };

  const accept = async (task: DeliveryTask) => {
    setLoading(true);
    try {
      await riderApi.accept(task.id);
      await refresh();
      haptic.success();
      navigation.navigate("ActiveTask");
    } catch (err) {
      haptic.error();
      setDialog({
        title: "Delivery unavailable",
        message:
          err instanceof Error
            ? err.message
            : "Another rider may have accepted this offer.",
        icon: "circleAlert",
        iconColor: colors.danger,
        actions: [
          { label: "Got it", variant: "secondary", onPress: () => undefined },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const reject = async (task: DeliveryTask) => {
    try {
      await riderApi.reject(task.id, "Not suitable");
      setData((old) =>
        old
          ? { ...old, offers: old.offers.filter((item) => item.id !== task.id) }
          : old,
      );
    } catch {
      /* keeping an offer on screen is safer than pretending it was rejected */
    }
  };

  const online =
    rider?.dutyState === "online" || rider?.dutyState === "on_task";
  const onBreak = rider?.dutyState === "break";
  const active = data?.activeTask;
  const offers = data?.offers ?? [];
  const mapStops = useMemo(
    () =>
      active
        ? offerStops(active)
        : offers[0]
          ? offerStops(offers[0])
          : DEFAULT_MAP,
    [active, offers],
  );
  const shiftProgress = Math.min(1, (rider?.currentDayTrips ?? 0) / 10);

  return (
    <>
      <Screen
        title="Home"
      subtitle={
        rider?.name
          ? `Good morning, ${rider.name.split(" ")[0]}`
          : "Your delivery shift"
      }
      headerRight={
        <IconButton
          icon="bell"
          onPress={() => navigation.navigate("Notifications")}
        />
      }
      scroll={false}
      padded={false}
    >
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => void pull()}
        contentContainerStyle={{ paddingBottom: 36 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            <View style={styles.dutyWrap}>
              <View style={styles.dutyCard}>
                <View
                  style={[
                    styles.liveIcon,
                    {
                      backgroundColor: online
                        ? colors.successBg
                        : onBreak
                          ? colors.warningBg
                          : colors.surfaceAlt,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.liveDot,
                      {
                        backgroundColor: online
                          ? colors.success
                          : onBreak
                            ? colors.warning
                            : colors.textTertiary,
                      },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {online
                      ? "You are online"
                      : onBreak
                        ? "You are on a break"
                        : "You are offline"}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {online
                      ? "Receiving nearby delivery requests"
                      : onBreak
                        ? "Requests are paused for now"
                        : "Go online when you are ready to deliver"}
                  </Text>
                </View>
                <Switch
                  value={online}
                  onValueChange={toggle}
                  disabled={dutyBusy || onBreak}
                  trackColor={{ false: "#DDE2E2", true: "#A5D8B9" }}
                  thumbColor={online ? colors.success : "#FFFFFF"}
                />
              </View>
              {onBreak ? (
                <View style={styles.breakRow}>
                  <Text variant="caption" color={colors.warning}>
                    Break mode is on
                  </Text>
                  <Pressable onPress={() => void setDuty("online")}>
                    <Text
                      variant="caption"
                      weight="bold"
                      color={colors.brand[600]}
                    >
                      Resume shift
                    </Text>
                  </Pressable>
                </View>
              ) : online && rider?.dutyState !== "on_task" ? (
                <Pressable
                  onPress={() => void setDuty("break")}
                  style={styles.breakRow}
                >
                  <Text variant="caption" color={colors.textSecondary}>
                    Need a short break?
                  </Text>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={colors.brand[600]}
                  >
                    Pause requests
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {rider && rider.codInHand > 0 ? (
              <View style={styles.codAlert}>
                <Icon name="cash" size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold">
                    {formatINR(rider.codInHand)} cash in hand
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    Limit {formatINR(rider.maxCodLimit)} · deposit from Earnings
                    before the limit
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.warning} />
              </View>
            ) : null}

            <MapSurface
              height={214}
              stops={mapStops}
              onLocate={
                online
                  ? () => void locateAndSend()
                  : () =>
                      setError(
                        "Go online to share your location with operations.",
                      )
              }
              onMapPress={() =>
                active
                  ? navigation.navigate("OrderMap", { taskId: active.id })
                  : undefined
              }
            />
            <View style={styles.mapCaption}>
              <View>
                <Text variant="title" weight="bold">
                  {online ? "Live delivery zone" : "Your delivery zone"}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {online
                    ? "Nearby hotspots & active routes"
                    : "Map activates when you go online"}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  active
                    ? navigation.navigate("OrderMap", { taskId: active.id })
                    : online
                      ? void locateAndSend()
                      : setError(
                          "Go online to share your location with operations.",
                        )
                }
                style={styles.zoneButton}
              >
                <Icon
                  name={active ? "navigation" : "locate"}
                  size={15}
                  color={colors.brand[600]}
                />
                <Text variant="caption" weight="bold" color={colors.brand[600]}>
                  {active ? "Open route" : "Locate me"}
                </Text>
              </Pressable>
            </View>

            {active ? (
              <Pressable
                onPress={() => navigation.navigate("ActiveTask")}
                style={styles.activeCard}
              >
                <View style={styles.activeHeader}>
                  <StatusPill
                    label="ACTIVE DELIVERY"
                    color={colors.brand[600]}
                    background={colors.brand[100]}
                    icon="bike"
                  />
                  <Icon
                    name="chevronRight"
                    size={18}
                    color={colors.brand[600]}
                  />
                </View>
                <Text variant="h3" weight="bold" style={{ marginTop: 8 }}>
                  {active.orderCode} · {active.vendorName}
                </Text>
                <Text
                  variant="caption"
                  color={colors.brand[700]}
                  style={{ marginTop: 3 }}
                >
                  {active.state.replace(/_/g, " ")} · {active.drop.name}
                </Text>
                <ProgressBar
                  value={
                    ["accepted", "at_pickup", "picked_up", "at_drop"].indexOf(
                      active.state,
                    ) / 3
                  }
                  color={colors.brand[600]}
                  track={colors.brand[100]}
                />
              </Pressable>
            ) : null}

            <View style={styles.sectionGutter}>
              <SectionTitle
                title="Today at a glance"
                action="Earnings"
                onAction={() =>
                  navigation.getParent()?.navigate("Earnings" as never)
                }
              />
              <View style={styles.metrics}>
                <Metric
                  icon="bike"
                  label="Trips today"
                  value={String(rider?.currentDayTrips ?? 0)}
                />
                <Metric
                  icon="rupee"
                  label="Earned today"
                  value={formatINR(rider?.currentDayEarnings ?? 0)}
                  color={colors.success}
                />
                <Metric
                  icon="star"
                  label="Rating"
                  value={(rider?.rating ?? 5).toFixed(1)}
                  color={colors.star}
                />
              </View>
              <Card tone="tint" style={{ marginTop: 8 }}>
                <View style={styles.goalTop}>
                  <View>
                    <Text
                      variant="caption"
                      color={colors.brand[700]}
                      weight="bold"
                    >
                      TODAY'S 10-TRIP GOAL
                    </Text>
                    <Text variant="bodySm" color={colors.textSecondary}>
                      {rider?.currentDayTrips ?? 0} of 10 trips completed
                    </Text>
                  </View>
                  <Text variant="h3" weight="bold" color={colors.brand[600]}>
                    {Math.round(shiftProgress * 100)}%
                  </Text>
                </View>
                <ProgressBar value={shiftProgress} />
              </Card>
            </View>

            {error ? (
              <View style={styles.error}>
                <Icon name="circleAlert" size={16} color={colors.danger} />
                <Text
                  variant="caption"
                  color={colors.danger}
                  style={{ flex: 1 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}
            {online && offers.length > 0 ? (
              <View style={styles.sectionGutter}>
                <SectionTitle
                  title="New delivery requests"
                  action={`${offers.length} nearby`}
                />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.sectionGutter}>
            <Card tone={online ? "tint" : "white"}>
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Icon
                  name={online ? "clockCheck" : "bike"}
                  size={32}
                  color={online ? colors.success : colors.brand[600]}
                />
                <Text variant="h3" weight="bold" style={{ marginTop: 10 }}>
                  {online ? "No requests right now" : "Ready when you are"}
                </Text>
                <Text
                  variant="bodySm"
                  color={colors.textSecondary}
                  style={{ textAlign: "center", marginTop: 4 }}
                >
                  {online
                    ? "We check every few seconds. Keep this screen open for the next offer."
                    : "Switch on your availability to start receiving delivery requests."}
                </Text>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.sectionGutter}>
            <OfferCard
              task={item}
              busy={loading}
              onAccept={() => void accept(item)}
              onReject={() => void reject(item)}
              onMap={() => navigation.navigate("OrderMap", { taskId: item.id })}
            />
          </View>
        )}
      />
      </Screen>
      <RiderModal
        visible={Boolean(dialog)}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        icon={dialog?.icon}
        iconColor={dialog?.iconColor}
        actions={dialog?.actions ?? []}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dutyWrap: { paddingHorizontal: 4, paddingTop: 8 },
  dutyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  liveIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: { width: 13, height: 13, borderRadius: 7 },
  breakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 3,
  },
  codAlert: {
    marginHorizontal: 4,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
  },
  mapCaption: {
    marginHorizontal: 4,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneButton: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.brand[50],
  },
  activeCard: {
    marginHorizontal: 4,
    marginBottom: 12,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    borderRadius: 16,
    padding: 13,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionGutter: { paddingHorizontal: 4 },
  metrics: { flexDirection: "row", gap: 7 },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  error: {
    marginHorizontal: 4,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  offerCard: { padding: 13 },
  offerTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  offerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  payout: { alignItems: "flex-end", width: 92, flexShrink: 0 },
  offerRoute: { marginTop: 13 },
  offerMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    paddingTop: 10,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  timer: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  offerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  mapAction: {
    height: 42,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
