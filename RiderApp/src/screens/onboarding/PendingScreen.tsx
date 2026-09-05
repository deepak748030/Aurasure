import React from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { Card, StatusPill } from "@/components/ui/RiderUI";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
export function PendingScreen(): React.ReactElement {
  const { rider, refresh, logout } = useRider();
  const navigation = useNavigation<Nav>();
  const status = rider?.status ?? "submitted";
  const copy: Record<string, string> = {
    submitted:
      "Our team is checking your Aadhaar, DL, PAN, RC and profile photo.",
    under_review:
      "A reviewer has opened your file. We will notify you if anything needs a clearer photo.",
    suspended:
      "Your partner account is temporarily paused. Please contact support for help.",
  };
  return (
    <Screen
      title="Verification"
      subtitle={rider?.name || rider?.phone}
      onRefresh={() => void refresh()}
    >
      <Card
        tone="tint"
        style={{ alignItems: "center", padding: 22, marginBottom: 16 }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.brand[100],
          }}
        >
          <Icon
            name={status === "suspended" ? "shieldLock" : "document"}
            size={32}
            color={status === "suspended" ? colors.danger : colors.brand[600]}
          />
        </View>
        <StatusPill
          label={status.replace(/_/g, " ")}
          color={status === "suspended" ? colors.danger : colors.warning}
          background={
            status === "suspended" ? colors.dangerBg : colors.warningBg
          }
          icon="clock"
        />
        <Text
          variant="h2"
          weight="bold"
          style={{ marginTop: 13, textAlign: "center" }}
        >
          {status === "under_review"
            ? "Almost there"
            : status === "suspended"
              ? "Account paused"
              : "Documents submitted"}
        </Text>
        <Text
          variant="bodySm"
          color={colors.textSecondary}
          style={{ textAlign: "center", marginTop: 7 }}
        >
          {copy[status] || copy.submitted}
        </Text>
        {rider?.reviewNote ? (
          <Text
            variant="caption"
            color={colors.warning}
            style={{ textAlign: "center", marginTop: 12 }}
          >
            Admin note: {rider.reviewNote}
          </Text>
        ) : null}
      </Card>
      <Text
        variant="overline"
        color={colors.textTertiary}
        style={{ marginBottom: 8 }}
      >
        DOCUMENT CHECKLIST
      </Text>
      <Card style={{ paddingVertical: 4 }}>
        {(rider?.documents ?? []).map((doc) => (
          <View
            key={doc.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Icon
              name={
                doc.verified ? "circleCheck" : doc.uri ? "clock" : "closeCircle"
              }
              size={18}
              color={
                doc.verified
                  ? colors.success
                  : doc.uri
                    ? colors.warning
                    : colors.danger
              }
            />
            <Text variant="bodySm" style={{ flex: 1, marginLeft: 9 }}>
              {doc.label}
            </Text>
            <Text
              variant="caption"
              weight="bold"
              color={
                doc.verified
                  ? colors.success
                  : doc.uri
                    ? colors.warning
                    : colors.danger
              }
            >
              {doc.verified ? "Verified" : doc.uri ? "In review" : "Missing"}
            </Text>
          </View>
        ))}
      </Card>
      <Button
        title="Refresh verification"
        variant="secondary"
        onPress={() => void refresh()}
        style={{ marginTop: 18 }}
      />
      {status === "suspended" ? (
        <Button
          title="Contact support"
          variant="ghost"
          onPress={() => navigation.navigate("Utility", { kind: "help" })}
        />
      ) : null}
      <Button title="Sign out" variant="ghost" onPress={logout} />
    </Screen>
  );
}
