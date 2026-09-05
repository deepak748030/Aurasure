import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/lib/icons";
import {
  Card,
  Metric,
  ProgressBar,
  SectionTitle,
  StatusPill,
} from "@/components/ui/RiderUI";
import { riderApi, type EarningsData, type PayoutsData } from "@/api/rider";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";

type Range = "today" | "week" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "all", label: "All time" },
];

export function EarningsScreen(): React.ReactElement {
  const { rider, refresh: refreshRider } = useRider();
  const [range, setRange] = useState<Range>("today");
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payouts, setPayouts] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"upi" | "hub" | "bank">("upi");
  const [refId, setRefId] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [e, p] = await Promise.all([
          riderApi.earnings(range),
          riderApi.payouts(),
        ]);
        setEarnings(e);
        setPayouts(p);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Earnings could not be loaded",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const deposit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }
    setDepositBusy(true);
    setError("");
    setMessage("");
    try {
      await riderApi.codDeposit(value, method, refId.trim() || undefined);
      setAmount("");
      setRefId("");
      setMessage("Deposit request submitted.");
      haptic.success();
      await load(true);
      await refreshRider();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
      haptic.error();
    } finally {
      setDepositBusy(false);
    }
  };
  const total = earnings?.total ?? rider?.currentDayEarnings ?? 0;
  const trips = earnings?.trips ?? 0;
  const incentiveRows = earnings?.incentiveRows ?? [];
  const recent = earnings?.tasks ?? [];
  return (
    <Screen
      title="Earnings"
      subtitle="Your pay, incentives and cash ledger"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(true);
      }}
    >
      <View style={styles.rangeBar}>
        {RANGES.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              haptic.selection();
              setRange(item.key);
            }}
            style={[styles.range, range === item.key && styles.rangeActive]}
          >
            <Text
              variant="subtitle"
              weight={range === item.key ? "bold" : "medium"}
              color={range === item.key ? colors.white : colors.textSecondary}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand[600]} size="large" />
        </View>
      ) : (
        <ScrollView
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 26 }}
        >
          <Card tone="plum" style={styles.hero}>
            <View style={styles.heroTop}>
              <View>
                <Text
                  variant="caption"
                  color="rgba(255,255,255,.7)"
                  weight="bold"
                >
                  {range === "today"
                    ? "TODAY'S EARNINGS"
                    : range === "week"
                      ? "THIS WEEK'S EARNINGS"
                      : "LIFETIME EARNINGS"}
                </Text>
                <Text
                  variant="display"
                  color={colors.white}
                  style={{ marginTop: 4 }}
                >
                  {formatINR(total)}
                </Text>
              </View>
              <View style={styles.walletCircle}>
                <Icon name="wallet" size={25} color={colors.brand[600]} />
              </View>
            </View>
            <View style={styles.heroBottom}>
              <Text variant="caption" color="rgba(255,255,255,.75)">
                {trips} trips completed
              </Text>
              <Text variant="caption" color="rgba(255,255,255,.75)">
                +{formatINR(earnings?.incentives ?? 0)} incentives
              </Text>
            </View>
          </Card>
          <View style={styles.metrics}>
            <Metric icon="bike" label="Trips" value={String(trips)} />
            <Metric
              icon="rupee"
              label="Delivery pay"
              value={formatINR(earnings?.payout ?? 0)}
              color={colors.success}
            />
            <Metric
              icon="zap"
              label="Incentives"
              value={formatINR(earnings?.incentives ?? 0)}
              color={colors.warning}
            />
          </View>
          <Card style={styles.chartCard}>
            <SectionTitle title="Earning activity" action="Live" />
            <View style={styles.chart}>
              <View style={[styles.bar, { height: 27 }]} />
              <View style={[styles.bar, { height: 48 }]} />
              <View style={[styles.bar, { height: 34 }]} />
              <View
                style={[
                  styles.bar,
                  { height: 66, backgroundColor: colors.brand[600] },
                ]}
              />
              <View style={[styles.bar, { height: 50 }]} />
              <View
                style={[
                  styles.bar,
                  { height: 80, backgroundColor: colors.success },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: Math.max(18, Math.min(88, trips * 9)) },
                ]}
              />
            </View>
            <View style={styles.chartLabels}>
              {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
                <Text
                  key={`${label}-${i}`}
                  variant="caption"
                  color={colors.textTertiary}
                >
                  {label}
                </Text>
              ))}
            </View>
          </Card>
          <Card style={styles.balance}>
            <View style={styles.balanceRow}>
              <View>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  weight="bold"
                >
                  AVAILABLE PAYOUT
                </Text>
                <Text
                  variant="h1"
                  weight="bold"
                  color={colors.brand[600]}
                  style={{ marginTop: 3 }}
                >
                  {formatINR(payouts?.balance ?? rider?.payoutBalance ?? 0)}
                </Text>
              </View>
              <Icon name="bank" size={28} color={colors.brand[600]} />
            </View>
            <View style={styles.balanceSplit}>
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Lifetime trips
                </Text>
                <Text variant="title" weight="bold">
                  {payouts?.totalTrips ?? rider?.totalTrips ?? 0}
                </Text>
              </View>
              <View>
                <Text variant="caption" color={colors.textSecondary}>
                  Lifetime pay
                </Text>
                <Text variant="title" weight="bold">
                  {formatINR(
                    payouts?.totalEarnings ?? rider?.totalEarnings ?? 0,
                  )}
                </Text>
              </View>
            </View>
          </Card>
          <Card tone="tint" style={styles.incentive}>
            <View style={styles.incentiveTop}>
              <View style={styles.incentiveIcon}>
                <Icon name="gift" size={20} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="bold">
                  Daily trip incentive
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  Complete 5 trips to unlock ₹30
                </Text>
              </View>
              <Text variant="h3" weight="bold" color={colors.brand[600]}>
                {Math.min(5, rider?.currentDayTrips ?? trips)}/5
              </Text>
            </View>
            <ProgressBar
              value={Math.min(1, (rider?.currentDayTrips ?? trips) / 5)}
            />
            {incentiveRows.length > 0 ? (
              <Text
                variant="caption"
                weight="bold"
                color={colors.success}
                style={{ marginTop: 8 }}
              >
                ✓ Incentive unlocked for this period
              </Text>
            ) : null}
          </Card>
          <Card style={styles.cod}>
            <View style={styles.codHeader}>
              <View>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  weight="bold"
                >
                  CASH IN HAND
                </Text>
                <Text variant="h1" weight="bold" color={colors.warning}>
                  {formatINR(payouts?.codInHand ?? rider?.codInHand ?? 0)}
                </Text>
              </View>
              <StatusPill
                label={`Limit ${formatINR(rider?.maxCodLimit ?? 3000)}`}
                color={colors.warning}
                background={colors.warningBg}
                icon="cash"
              />
            </View>
            <Text
              variant="bodySm"
              color={colors.textSecondary}
              style={{ marginTop: 6 }}
            >
              Submit a UPI or hub deposit to keep receiving COD deliveries.
            </Text>
            <Input
              label="Deposit amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="₹ 0"
              leftIcon="rupee"
            />
            <View style={styles.methods}>
              {(["upi", "hub", "bank"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMethod(item)}
                  style={[
                    styles.method,
                    method === item && styles.methodActive,
                  ]}
                >
                  <Icon
                    name={
                      item === "upi"
                        ? "smartphone"
                        : item === "hub"
                          ? "store"
                          : "bank"
                    }
                    size={15}
                    color={
                      method === item ? colors.white : colors.textSecondary
                    }
                  />
                  <Text
                    variant="caption"
                    weight="bold"
                    color={
                      method === item ? colors.white : colors.textSecondary
                    }
                  >
                    {item.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Input
              label="Reference (optional)"
              value={refId}
              onChangeText={setRefId}
              placeholder="UTR / receipt number"
            />
            {message ? (
              <Text
                variant="caption"
                color={colors.success}
                style={{ marginBottom: 8 }}
              >
                {message}
              </Text>
            ) : null}
            {error ? (
              <Text
                variant="caption"
                color={colors.danger}
                style={{ marginBottom: 8 }}
              >
                {error}
              </Text>
            ) : null}
            <Button
              title="Submit COD deposit"
              variant="primary"
              loading={depositBusy}
              onPress={() => void deposit()}
            />
          </Card>
          <SectionTitle title="Recent trips" action="All trips" />
          <View style={{ gap: 7 }}>
            {recent.length === 0 ? (
              <Card>
                <View style={styles.empty}>
                  <Icon name="bike" size={26} color={colors.brand[600]} />
                  <Text
                    variant="bodySm"
                    color={colors.textSecondary}
                    style={{ marginTop: 8 }}
                  >
                    Delivered trips will appear here.
                  </Text>
                </View>
              </Card>
            ) : (
              recent.slice(0, 8).map((task) => (
                <View key={task.id} style={styles.trip}>
                  <View style={styles.tripIcon}>
                    <Icon name="check" size={16} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" weight="semibold">
                      {task.orderCode}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {task.vendorName} → {task.drop.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="title" weight="bold" color={colors.success}>
                      +{formatINR(task.riderPayout)}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {task.deliveredAt
                        ? new Date(task.deliveredAt).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short" },
                          )
                        : ""}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeBar: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  range: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  rangeActive: { backgroundColor: colors.brand[600] },
  loading: { paddingVertical: 70, alignItems: "center" },
  hero: { padding: 16, marginBottom: 8 },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  walletCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.2)",
    marginTop: 16,
    paddingTop: 11,
  },
  metrics: { flexDirection: "row", gap: 7, marginBottom: 8 },
  chartCard: { marginBottom: 8 },
  chart: {
    height: 90,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: { width: 18, borderRadius: 6, backgroundColor: colors.brand[200] },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 7,
  },
  balance: { marginBottom: 8 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 11,
    marginTop: 12,
  },
  incentive: { marginBottom: 16 },
  incentiveTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  incentiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
  },
  cod: { marginBottom: 18 },
  codHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methods: { flexDirection: "row", gap: 7, marginBottom: 12 },
  method: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  methodActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  empty: { alignItems: "center", paddingVertical: 20 },
  trip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 11,
  },
  tripIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
