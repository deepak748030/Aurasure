import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/lib/icons";
import {
  Card,
  IconButton,
  RoutePoint,
  SectionTitle,
  StatusPill,
} from "@/components/ui/RiderUI";
import { EmptyState } from "@/components/ui/EmptyState";
import { riderApi, type DeliveryTask } from "@/api/rider";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const RUNNING = ["accepted", "at_pickup", "picked_up", "at_drop"];
const FILTERS = [
  { key: "running", label: "Running" },
  { key: "all", label: "All trips" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed" },
];
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: "Accepted", color: colors.info, bg: colors.infoBg },
  at_pickup: {
    label: "At pickup",
    color: colors.warning,
    bg: colors.warningBg,
  },
  picked_up: {
    label: "Picked up",
    color: colors.brand[600],
    bg: colors.brand[50],
  },
  at_drop: { label: "At drop", color: colors.warning, bg: colors.warningBg },
  delivered: {
    label: "Delivered",
    color: colors.success,
    bg: colors.successBg,
  },
  failed: { label: "Failed", color: colors.danger, bg: colors.dangerBg },
  cancelled: {
    label: "Cancelled",
    color: colors.textTertiary,
    bg: colors.surfaceAlt,
  },
};

function TaskCard({
  task,
  onOpen,
  onMap,
}: {
  task: DeliveryTask;
  onOpen: () => void;
  onMap: () => void;
}): React.ReactElement {
  const state = STATUS[task.state] || {
    label: task.state,
    color: colors.textSecondary,
    bg: colors.surfaceAlt,
  };
  const date = new Date(task.deliveredAt || task.createdAt).toLocaleString(
    "en-IN",
    { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
  );
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [pressed && { opacity: 0.78 }]}
    >
      <Card style={styles.taskCard}>
        <View style={styles.cardTop}>
          <View>
            <Text variant="title" weight="bold">
              {task.orderCode}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {date}
            </Text>
          </View>
          <StatusPill
            label={state.label}
            color={state.color}
            background={state.bg}
          />
        </View>
        <View style={{ marginTop: 12 }}>
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
        <View style={styles.cardBottom}>
          <View>
            <Text variant="title" weight="bold" color={colors.success}>
              +{formatINR(task.riderPayout)}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {task.codAmount > 0
                ? `COD ${formatINR(task.codAmount)}`
                : "Prepaid"}
              {task.distanceKm ? ` · ${task.distanceKm.toFixed(1)} km` : ""}
            </Text>
          </View>
          {RUNNING.includes(task.state) ? (
            <IconButton
              icon="map"
              size={35}
              onPress={onMap}
              color={colors.brand[600]}
              background={colors.brand[50]}
            />
          ) : (
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          )}
        </View>
        {task.failReason ? (
          <View style={styles.fail}>
            <Icon name="circleAlert" size={14} color={colors.danger} />
            <Text variant="caption" color={colors.danger}>
              {task.failReason}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export function TasksScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const [filter, setFilter] = useState("running");
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      setTasks((await riderApi.tasks()).tasks);
    } catch {
      /* offline screen keeps the last list */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (focused) void load();
  }, [focused, load]);
  const filtered = tasks.filter((task) =>
    filter === "running"
      ? RUNNING.includes(task.state)
      : filter === "all"
        ? true
        : task.state === filter,
  );
  return (
    <Screen
      title="Requests & trips"
      subtitle="Every delivery, from accepted to complete"
      scroll={false}
      padded={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count =
            item.key === "running"
              ? tasks.filter((task) => RUNNING.includes(task.state)).length
              : item.key === "all"
                ? tasks.length
                : tasks.filter((task) => task.state === item.key).length;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                haptic.selection();
                setFilter(item.key);
              }}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text
                variant="subtitle"
                weight={active ? "bold" : "medium"}
                color={active ? colors.white : colors.textSecondary}
              >
                {item.label}
              </Text>
              {count > 0 ? (
                <View
                  style={[
                    styles.count,
                    active && { backgroundColor: "rgba(255,255,255,.24)" },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={active ? colors.white : colors.brand[600]}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.listHeader}>
        <SectionTitle
          title={filter === "running" ? "Current requests" : "Trip history"}
          action="Refresh"
          onAction={() => {
            setRefreshing(true);
            void load();
          }}
        />
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && { flex: 1 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onOpen={() =>
                RUNNING.includes(item.state)
                  ? navigation.navigate("ActiveTask")
                  : undefined
              }
              onMap={() => navigation.navigate("OrderMap", { taskId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="orders"
              title={
                filter === "running" ? "No running requests" : "No trips found"
              }
              subtitle={
                filter === "running"
                  ? "New delivery offers will show on Home."
                  : "Your completed delivery history will appear here."
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 4, paddingVertical: 10, gap: 7 },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterActive: { backgroundColor: colors.brand[600] },
  count: {
    minWidth: 18,
    alignItems: "center",
    borderRadius: 9,
    backgroundColor: colors.brand[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  listHeader: { paddingHorizontal: 4 },
  list: { paddingHorizontal: 4, paddingBottom: 34 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  taskCard: { padding: 13 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 11,
    paddingTop: 10,
  },
  fail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerBg,
  },
});
