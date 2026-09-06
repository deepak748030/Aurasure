import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { RiderModal, type RiderModalAction } from "@/components/ui/RiderModal";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/lib/icons";
import { MapSurface, type MapStop } from "@/components/MapSurface";
import {
  Card,
  IconButton,
  ProgressBar,
  RoutePoint,
  SectionTitle,
  StatusPill,
} from "@/components/ui/RiderUI";
import { riderApi, uploadRiderFile, type DeliveryTask } from "@/api/rider";
import { pickImage } from "@/lib/pickImage";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { formatINR, formatDistance } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TaskDialog = {
  title: string;
  message: string;
  icon?: "circleAlert" | "check";
  iconColor?: string;
  actions: RiderModalAction[];
};
const FLOW = ["accepted", "at_pickup", "picked_up", "at_drop"];
const STATE_COPY: Record<string, string> = {
  accepted: "Head to pickup",
  at_pickup: "Confirm pickup",
  picked_up: "Head to customer",
  at_drop: "Confirm delivery",
  delivered: "Delivered",
  failed: "Delivery failed",
};

export function ActiveTaskScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const { refresh } = useRider();
  const focused = useIsFocused();
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickupOtp, setPickupOtp] = useState("");
  const [dropOtp, setDropOtp] = useState("");
  const [pod, setPod] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<TaskDialog | null>(null);
  const fetchTask = useCallback(async () => {
    try {
      setTask((await riderApi.activeTask()).task);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Active delivery could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (focused) void fetchTask();
  }, [focused, fetchTask]);
  const run = async (action: () => Promise<{ task: DeliveryTask }>) => {
    setBusy(true);
    setError("");
    try {
      setTask((await action()).task);
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      haptic.error();
    } finally {
      setBusy(false);
    }
  };
  const uploadPod = async () => {
    const image = await pickImage();
    if (!image) return;
    setBusy(true);
    try {
      setPod(
        (await uploadRiderFile(image.blob, image.name, image.uri, image.mime))
          .url,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Proof photo upload failed",
      );
    } finally {
      setBusy(false);
    }
  };
  const complete = async () => {
    if (!task) return;
    const needsPhoto =
      task.total >= 2000 || task.note.toLowerCase().includes("leave at door");
    if (!/^\d{4}$/.test(dropOtp)) {
      setError("Enter the 4-digit OTP shared by the customer.");
      return;
    }
    if (needsPhoto && !pod) {
      setError("Proof of delivery photo is required for this order.");
      return;
    }
    setBusy(true);
    try {
      await riderApi.deliver(task.id, dropOtp, pod, note);
      await refresh();
      haptic.success();
      navigation.goBack();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delivery could not be completed",
      );
      haptic.error();
    } finally {
      setBusy(false);
    }
  };
  const reportFailure = async (reason: string) => {
    if (!task) return;
    setBusy(true);
    try {
      await riderApi.fail(task.id, reason);
      await refresh();
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report issue");
    } finally {
      setBusy(false);
    }
  };
  const fail = () => {
    if (!task) return;
    const reasons = [
      "Customer unavailable",
      "Outlet refused order",
      "Wrong or missing item",
      "Vehicle issue",
    ];
    setDialog({
      title: "Report a problem",
      message: "Choose the reason so operations can help quickly.",
      icon: "circleAlert",
      iconColor: colors.warning,
      actions: [
        ...reasons.map((reason) => ({
          label: reason,
          variant: "secondary" as const,
          onPress: () => void reportFailure(reason),
        })),
        {
          label: "Cancel",
          variant: "ghost" as const,
          onPress: () => undefined,
        },
      ],
    });
  };
  const sendSosRequest = async () => {
    try {
      await riderApi.sos({
        type: "delivery_sos",
        note: `SOS during ${task?.orderCode ?? "active delivery"}`,
      });
      setDialog({
        title: "SOS sent",
        message: "Operations has received your alert.",
        icon: "check",
        iconColor: colors.success,
        actions: [
          { label: "Done", variant: "primary", onPress: () => undefined },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "SOS could not be sent");
    }
  };
  const sos = () => {
    setDialog({
      title: "Send SOS?",
      message:
        "This will notify Aurasure operations with your delivery context.",
      icon: "circleAlert",
      iconColor: colors.danger,
      actions: [
        { label: "Cancel", variant: "secondary", onPress: () => undefined },
        {
          label: "Send SOS",
          variant: "danger",
          onPress: () => void sendSosRequest(),
        },
      ],
    });
  };
  const showCallError = (title: string, message: string) => {
    setDialog({
      title,
      message,
      icon: "circleAlert",
      iconColor: colors.warning,
      actions: [
        { label: "Got it", variant: "secondary", onPress: () => undefined },
      ],
    });
  };
  const call = (phone: string, label: string) => {
    if (!phone) {
      showCallError(
        label,
        "This contact is not available. Use Help & support instead.",
      );
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      showCallError(label, "Could not open the phone app."),
    );
  };
  const stops = useMemo<MapStop[]>(() => {
    if (!task) return [];
    const output: MapStop[] = [];
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
  }, [task]);
  if (loading)
    return (
      <Screen title="Active delivery">
        <View style={styles.loading}>
          <Icon name="bike" size={30} color={colors.brand[600]} />
          <Text
            variant="body"
            color={colors.textSecondary}
            style={{ marginTop: 10 }}
          >
            Syncing your delivery…
          </Text>
        </View>
      </Screen>
    );
  if (!task)
    return (
      <Screen
        title="Active delivery"
        headerLeft={
          <IconButton icon="chevronLeft" onPress={() => navigation.goBack()} />
        }
      >
        <View style={styles.loading}>
          <Icon name="clipboard" size={35} color={colors.brand[600]} />
          <Text variant="h3" weight="bold" style={{ marginTop: 12 }}>
            No active delivery
          </Text>
          <Text
            variant="bodySm"
            color={colors.textSecondary}
            style={{ textAlign: "center", marginTop: 5 }}
          >
            {error || "Accept a request from Home to start a delivery."}
          </Text>
        </View>
      </Screen>
    );
  const step = Math.max(0, FLOW.indexOf(task.state));
  const isPickup = task.state === "at_pickup";
  const isDrop = task.state === "at_drop";
  return (
    <>
      <Screen
        title={task.orderCode}
        subtitle={STATE_COPY[task.state] || task.state.replace(/_/g, " ")}
        headerLeft={
          <IconButton icon="chevronLeft" onPress={() => navigation.goBack()} />
        }
        headerRight={
          <IconButton
            icon="shield"
            color={colors.danger}
            background={colors.dangerBg}
            onPress={sos}
          />
        }
        scroll={false}
        padded={false}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 38 }}
        >
          <MapSurface
            height={238}
            stops={stops}
            onMapPress={() =>
              navigation.navigate("OrderMap", { taskId: task.id })
            }
          />
          <View style={styles.mapTools}>
            <StatusPill
              label={STATE_COPY[task.state] || task.state}
              color={
                task.state === "at_drop" || task.state === "at_pickup"
                  ? colors.warning
                  : colors.brand[600]
              }
              background={
                task.state === "at_drop" || task.state === "at_pickup"
                  ? colors.warningBg
                  : colors.brand[50]
              }
              icon="navigation"
            />
            <Pressable
              onPress={() =>
                navigation.navigate("OrderMap", { taskId: task.id })
              }
            >
              <Text variant="caption" weight="bold" color={colors.brand[600]}>
                Expand map
              </Text>
            </Pressable>
          </View>
          <View style={styles.content}>
            <Card style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text variant="title" weight="bold">
                  Delivery progress
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {step + 1} of 4
                </Text>
              </View>
              <View style={styles.stepProgress}>
                {FLOW.map((stateName, idx) => {
                  const completed = step > idx;
                  const current = step === idx;
                  const future = step < idx;
                  const label =
                    STATE_COPY[stateName] || stateName.replace(/_/g, " ");
                  return (
                    <View key={stateName} style={styles.stepItem}>
                      <View style={styles.stepRow}>
                        <View
                          style={[
                            styles.stepDot,
                            completed || current
                              ? { backgroundColor: colors.success }
                              : { backgroundColor: colors.textTertiary },
                            current
                              ? {
                                  borderColor: colors.success,
                                  borderWidth: 3,
                                  backgroundColor: colors.successBg,
                                  width: 22,
                                  height: 22,
                                }
                              : {},
                          ]}
                        >
                          {completed ? (
                            <Icon name="check" size={10} color={colors.white} />
                          ) : null}
                        </View>
                        {idx < FLOW.length - 1 ? (
                          <View
                            style={[
                              styles.stepLine,
                              completed
                                ? { backgroundColor: colors.success }
                                : { backgroundColor: colors.border },
                            ]}
                          />
                        ) : null}
                      </View>
                      <Text
                        variant="caption"
                        weight={current ? "bold" : "semibold"}
                        color={
                          completed || current
                            ? colors.success
                            : colors.textTertiary
                        }
                        style={{
                          marginTop: 6,
                          textAlign: "center",
                          minWidth: 55,
                          maxWidth: 85,
                          fontSize: 9,
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.progressTop}>
                <Text variant="caption" weight="bold" color={colors.success}>
                  {step + 1} of 4 completed
                </Text>
              </View>
            </Card>
            <Card>
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
            </Card>
            <View style={styles.contacts}>
              <Pressable
                onPress={() => call(task.vendorPhone, "Outlet")}
                style={styles.contact}
              >
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: colors.warningBg },
                  ]}
                >
                  <Icon name="store" size={18} color={colors.warning} />
                </View>
                <Text variant="caption" weight="bold">
                  Call outlet
                </Text>
              </Pressable>
              <Pressable
                onPress={() => call(task.drop.phone, "Customer")}
                style={styles.contact}
              >
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: colors.infoBg },
                  ]}
                >
                  <Icon name="phone" size={18} color={colors.info} />
                </View>
                <Text variant="caption" weight="bold">
                  Call customer
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("Utility", { kind: "help" })}
                style={styles.contact}
              >
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: colors.brand[50] },
                  ]}
                >
                  <Icon name="headset" size={18} color={colors.brand[600]} />
                </View>
                <Text variant="caption" weight="bold">
                  Need help
                </Text>
              </Pressable>
            </View>
            <Card>
              <SectionTitle title="Order details" />
              <View style={{ gap: 7 }}>
                {task.items.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.item}>
                    <Text variant="bodySm" style={{ flex: 1 }}>
                      {item.qty} × {item.name}
                    </Text>
                    <Text variant="bodySm" weight="semibold">
                      {formatINR(item.price * item.qty)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.total}>
                <Text variant="bodySm" color={colors.textSecondary}>
                  Order total
                </Text>
                <Text variant="title" weight="bold">
                  {formatINR(task.total)}
                </Text>
              </View>
              <View style={styles.cashLine}>
                <Icon
                  name={task.codAmount > 0 ? "cash" : "circleCheck"}
                  size={16}
                  color={task.codAmount > 0 ? colors.warning : colors.success}
                />
                <Text
                  variant="caption"
                  weight="bold"
                  color={task.codAmount > 0 ? colors.warning : colors.success}
                >
                  {task.codAmount > 0
                    ? `Collect ${formatINR(task.codAmount)} cash`
                    : "Prepaid · no cash to collect"}
                </Text>
              </View>
            </Card>
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
            {task.state === "accepted" ? (
              <Button
                title="I have arrived at pickup"
                loading={busy}
                onPress={() => void run(() => riderApi.arrivedPickup(task.id))}
              />
            ) : null}
            {isPickup ? (
              <Card tone="tint" style={styles.actionCard}>
                <Text variant="title" weight="bold">
                  Verify pickup
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginBottom: 9 }}
                >
                  Ask the outlet for the pickup OTP.
                </Text>
                <Input
                  label="Pickup OTP"
                  value={pickupOtp}
                  onChangeText={(value) =>
                    setPickupOtp(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  placeholder="4 digits"
                />
                <Button
                  title="Confirm pickup"
                  variant="success"
                  loading={busy}
                  disabled={pickupOtp.length !== 4}
                  onPress={() =>
                    void run(() => riderApi.pickup(task.id, pickupOtp))
                  }
                />
              </Card>
            ) : null}
            {task.state === "picked_up" ? (
              <Button
                title="I have arrived at drop-off"
                loading={busy}
                onPress={() => void run(() => riderApi.arrivedDrop(task.id))}
              />
            ) : null}
            {isDrop ? (
              <Card tone="tint" style={styles.actionCard}>
                <Text variant="title" weight="bold">
                  Complete delivery
                </Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={{ marginBottom: 9 }}
                >
                  Ask the customer for the OTP. Do not share your OTP.
                </Text>
                <Input
                  label="Customer OTP"
                  value={dropOtp}
                  onChangeText={(value) =>
                    setDropOtp(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  placeholder="4 digits"
                />
                <Pressable onPress={() => void uploadPod()} style={styles.pod}>
                  <View style={styles.podIcon}>
                    {pod ? (
                      <Image source={{ uri: pod }} style={styles.podImage} />
                    ) : (
                      <Icon name="camera" size={20} color={colors.brand[600]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" weight="semibold">
                      Proof of delivery
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {pod
                        ? "Photo attached · tap to replace"
                        : task.total >= 2000
                          ? "Required for high-value order"
                          : "Add a photo if you leave it at the door"}
                    </Text>
                  </View>
                  <Icon
                    name="chevronRight"
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
                <Input
                  label="Delivery note (optional)"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Left with security…"
                />
                <Button
                  title="Mark as delivered"
                  variant="success"
                  loading={busy}
                  disabled={dropOtp.length !== 4}
                  onPress={() => void complete()}
                />
              </Card>
            ) : null}
            <Pressable onPress={fail} style={styles.problem}>
              <Icon name="circleAlert" size={16} color={colors.danger} />
              <Text variant="caption" weight="bold" color={colors.danger}>
                Report a delivery problem
              </Text>
            </Pressable>
          </View>
        </ScrollView>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  mapTools: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  content: { paddingHorizontal: 4, gap: 10 },
  progressCard: { padding: 12 },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  stepProgress: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  stepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepLine: {
    height: 3,
    width: 36,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },
  contacts: { flexDirection: "row", gap: 7 },
  contact: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
  },
  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  item: { flexDirection: "row", justifyContent: "space-between" },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 11,
    paddingTop: 11,
  },
  cashLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 11,
    marginTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerBg,
    padding: 10,
    borderRadius: 10,
  },
  actionCard: { padding: 12 },
  pod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 11,
  },
  podIcon: {
    width: 48,
    height: 48,
    borderRadius: 9,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  podImage: { width: 48, height: 48 },
  problem: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: 10,
    marginBottom: 15,
  },
});
