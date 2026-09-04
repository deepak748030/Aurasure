import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/lib/icons";
import { Card, StatusPill } from "@/components/ui/RiderUI";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;
type NotificationItem = {
  id: string;
  icon: "shield" | "document" | "headset" | "cash";
  color: string;
  bg: string;
  title: string;
  body: string;
  date: string;
};
export function NotificationScreen({ navigation }: Props): React.ReactElement {
  const { rider } = useRider();
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [
      {
        id: "welcome",
        icon: "shield",
        color: colors.success,
        bg: colors.successBg,
        title: "Your rider account is secure",
        body: "Never share OTPs or your personal phone number with anyone.",
        date: rider?.submittedAt || new Date().toISOString(),
      },
    ];
    if (rider?.status !== "approved")
      list.unshift({
        id: "verification",
        icon: "document",
        color: colors.warning,
        bg: colors.warningBg,
        title: "Verification in progress",
        body:
          rider?.reviewNote ||
          "Keep your documents ready. We will notify you when your profile is reviewed.",
        date: rider?.submittedAt || new Date().toISOString(),
      });
    (rider?.issues ?? []).forEach((issue) =>
      list.unshift({
        id: issue.id,
        icon: "headset",
        color: colors.brand[600],
        bg: colors.brand[50],
        title: `Support: ${issue.title}`,
        body: issue.body || `Ticket status: ${issue.status}`,
        date: issue.createdAt,
      }),
    );
    (rider?.codDeposits ?? []).forEach((deposit) =>
      list.unshift({
        id: deposit.id,
        icon: "cash",
        color: colors.warning,
        bg: colors.warningBg,
        title: "COD deposit submitted",
        body: `${deposit.method.toUpperCase()} · ₹${Math.round(deposit.amount)} · ${deposit.status}`,
        date: deposit.createdAt,
      }),
    );
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [rider]);
  return (
    <Screen
      title="Notifications"
      subtitle="Updates from Aurasure operations"
      headerLeft={
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Icon name="chevronLeft" size={22} color={colors.text} />
        </Pressable>
      }
    >
      <View style={styles.readRow}>
        <Text variant="caption" color={colors.textSecondary}>
          {notifications.length} updates
        </Text>
        <StatusPill
          label="All caught up"
          color={colors.success}
          background={colors.successBg}
          icon="check"
        />
      </View>
      <Card style={{ paddingVertical: 0 }}>
        {notifications.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.item,
              index < notifications.length - 1 && styles.divider,
            ]}
          >
            <View style={[styles.icon, { backgroundColor: item.bg }]}>
              <Icon name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                {item.title}
              </Text>
              <Text
                variant="bodySm"
                color={colors.textSecondary}
                numberOfLines={3}
              >
                {item.body}
              </Text>
              <Text
                variant="caption"
                color={colors.textTertiary}
                style={{ marginTop: 4 }}
              >
                {new Date(item.date).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  readRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
