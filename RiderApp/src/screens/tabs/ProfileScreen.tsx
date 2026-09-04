import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { RiderModal, type RiderModalAction } from "@/components/ui/RiderModal";
import { Icon } from "@/lib/icons";
import {
  Card,
  IconButton,
  MenuItem,
  SectionTitle,
  StatusPill,
} from "@/components/ui/RiderUI";
import { riderApi, uploadRiderFile } from "@/api/rider";
import { pickImage } from "@/lib/pickImage";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ProfileDialog = {
  title: string;
  message: string;
  icon?: "circleAlert" | "check";
  iconColor?: string;
  actions: RiderModalAction[];
};

export function ProfileScreen(): React.ReactElement {
  const { rider, setRider, refresh, logout } = useRider();
  const navigation = useNavigation<Nav>();
  const [uploading, setUploading] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<ProfileDialog | null>(null);
  const photo = rider?.documents?.find((doc) => doc.key === "photo");
  const verifiedDocs = rider?.documents?.filter((doc) => doc.uri).length ?? 0;
  const totalDocs = rider?.documents?.length || 5;
  const isOnline =
    rider?.dutyState === "online" || rider?.dutyState === "on_task";

  const uploadPhoto = async () => {
    const picked = await pickImage();
    if (!picked) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadRiderFile(
        picked.blob,
        picked.name,
        picked.uri,
        picked.mime,
      );
      await riderApi.setDoc("photo", uploaded.url, "Profile photo");
      await refresh();
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };
  const sendSosRequest = async () => {
    try {
      await riderApi.sos({
        type: "sos",
        note: "SOS raised from rider profile",
      });
      haptic.success();
      setDialog({
        title: "SOS sent",
        message: "Operations has received your alert.",
        icon: "check",
        iconColor: colors.success,
        actions: [
          { label: "Done", variant: "primary", onPress: () => undefined },
        ],
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SOS could not be sent");
    }
  };
  const sendSos = () => {
    setDialog({
      title: "Send SOS?",
      message:
        "This creates an incident for Aurasure operations. Use it only for an emergency.",
      icon: "circleAlert",
      iconColor: colors.danger,
      actions: [
        { label: "Cancel", variant: "secondary", onPress: () => undefined },
        { label: "Send SOS", variant: "danger", onPress: () => void sendSosRequest() },
      ],
    });
  };
  const signOut = () => {
    setDialog({
      title: "Sign out?",
      message: "You can sign back in anytime.",
      icon: "circleAlert",
      iconColor: colors.warning,
      actions: [
        { label: "Cancel", variant: "secondary", onPress: () => undefined },
        { label: "Sign out", variant: "danger", onPress: logout },
      ],
    });
  };
  const toggleDuty = async () => {
    if (rider?.dutyState === "on_task") {
      setError("Finish your active delivery before going offline.");
      return;
    }
    setDutyBusy(true);
    setError("");
    try {
      const response = await riderApi.setDuty(isOnline ? "offline" : "online");
      setRider(response.rider);
      haptic.success();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Availability could not be changed",
      );
    } finally {
      setDutyBusy(false);
    }
  };
  return (
    <>
      <Screen
        title="Profile"
      subtitle="Your rider account & preferences"
      refreshing={uploading}
      onRefresh={() => void refresh()}
    >
      <Card style={styles.profileHero}>
        <View style={styles.profileTop}>
          <Pressable
            onPress={() => void uploadPhoto()}
            style={styles.avatarWrap}
          >
            {photo?.uri ? (
              <Image source={{ uri: photo.uri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Icon name="user" size={38} color={colors.brand[600]} />
              </View>
            )}
            <View style={styles.camera}>
              <Icon name="camera" size={13} color={colors.white} />
            </View>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 13 }}>
            <Text variant="h2" weight="bold" numberOfLines={1}>
              {rider?.name || "Delivery partner"}
            </Text>
            <Text variant="bodySm" color={colors.textSecondary}>
              {rider?.phone}
            </Text>
            <View style={styles.badges}>
              <StatusPill
                label={
                  rider?.status === "approved"
                    ? "Verified partner"
                    : (rider?.status ?? "onboarding").replace(/_/g, " ")
                }
                color={
                  rider?.status === "approved" ? colors.success : colors.warning
                }
                background={
                  rider?.status === "approved"
                    ? colors.successBg
                    : colors.warningBg
                }
                icon={rider?.status === "approved" ? "shield" : "clock"}
              />
              <StatusPill
                label={isOnline ? "Online" : "Offline"}
                color={isOnline ? colors.success : colors.textTertiary}
                background={isOnline ? colors.successBg : colors.surfaceAlt}
                icon="bike"
              />
            </View>
          </View>
          <IconButton
            icon="settings"
            size={38}
            onPress={() => navigation.navigate("Utility", { kind: "settings" })}
          />
        </View>
        <View style={styles.profileStats}>
          <View>
            <Text variant="h3" weight="bold">
              {rider?.totalTrips ?? 0}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Total trips
            </Text>
          </View>
          <View>
            <Text variant="h3" weight="bold">
              {(rider?.rating ?? 5).toFixed(1)} ★
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {rider?.ratingCount ?? 0} reviews
            </Text>
          </View>
          <View style={{ width: 104, alignItems: "flex-end" }}>
            <Text
              variant="h3"
              weight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {formatINR(rider?.totalEarnings ?? 0)}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Lifetime earned
            </Text>
          </View>
        </View>
      </Card>
      {error ? (
        <View style={styles.error}>
          <Icon name="circleAlert" size={16} color={colors.danger} />
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        </View>
      ) : null}
      <Card tone="tint" style={styles.kyc}>
        <View style={styles.kycTop}>
          <View>
            <Text variant="title" weight="bold">
              Profile verification
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {verifiedDocs} of {totalDocs} documents uploaded
            </Text>
          </View>
          <Text variant="h3" weight="bold" color={colors.brand[600]}>
            {Math.round((verifiedDocs / totalDocs) * 100)}%
          </Text>
        </View>
        <View style={styles.progress}>
          <View
            style={[
              styles.progressFill,
              { width: `${(verifiedDocs / totalDocs) * 100}%` },
            ]}
          />
        </View>
        {rider?.status !== "approved" ? (
          <Pressable
            onPress={() => navigation.navigate("Onboarding")}
            style={styles.kycAction}
          >
            <Text variant="caption" weight="bold" color={colors.brand[600]}>
              Review profile & documents
            </Text>
            <Icon name="chevronRight" size={16} color={colors.brand[600]} />
          </Pressable>
        ) : null}
      </Card>
      <SectionTitle title="Availability" />
      <Card style={styles.menuCard}>
        <MenuItem
          icon="bike"
          title={
            rider?.dutyState === "on_task"
              ? "On active delivery"
              : isOnline
                ? "Online for deliveries"
                : "Go online"
          }
          subtitle={
            rider?.dutyState === "on_task"
              ? "Finish the current delivery to resume requests"
              : isOnline
                ? "You are receiving nearby requests"
                : "Start receiving nearby requests"
          }
          color={isOnline ? colors.success : colors.textSecondary}
          background={isOnline ? colors.successBg : colors.surfaceAlt}
          onPress={() => void toggleDuty()}
          last
          right={
            <Switch
              value={isOnline}
              disabled={dutyBusy || rider?.dutyState === "on_task"}
              onValueChange={() => void toggleDuty()}
              trackColor={{
                false: colors.borderStrong,
                true: colors.successBg,
              }}
              thumbColor={isOnline ? colors.success : colors.white}
            />
          }
        />
      </Card>
      <SectionTitle title="Work" />
      <Card style={styles.menuCard}>
        <MenuItem
          icon="bike"
          title="Vehicle details"
          subtitle={`${(rider?.vehicleType || "Vehicle").toUpperCase()} · ${rider?.vehicleNumber || "Add registration number"}`}
          onPress={() => navigation.navigate("Utility", { kind: "vehicle" })}
        />
        <MenuItem
          icon="star"
          title="My reviews"
          subtitle={`${(rider?.rating ?? 5).toFixed(1)} rating from customers`}
          onPress={() => navigation.navigate("Utility", { kind: "reviews" })}
        />
        <MenuItem
          icon="chart"
          title="Leaderboard"
          subtitle="See your level and progress"
          onPress={() =>
            navigation.navigate("Utility", { kind: "leaderboard" })
          }
          last
        />
      </Card>
      <SectionTitle title="Money & rewards" />
      <Card style={styles.menuCard}>
        <MenuItem
          icon="wallet"
          title="Earnings"
          subtitle={`${formatINR(rider?.currentDayEarnings ?? 0)} earned today`}
          onPress={() => navigation.navigate("Earnings" as never)}
        />
        <MenuItem
          icon="bank"
          title="Wallet & payouts"
          subtitle={`${formatINR(rider?.payoutBalance ?? 0)} available`}
          onPress={() => navigation.navigate("Utility", { kind: "wallet" })}
        />
        <MenuItem
          icon="gift"
          title="Refer & earn"
          subtitle={`Invite friends · ${rider?.referralCode || "Get your code"}`}
          onPress={() => navigation.navigate("Utility", { kind: "referral" })}
          last
        />
      </Card>
      <SectionTitle title="Help & safety" />
      <Card style={styles.menuCard}>
        <MenuItem
          icon="headset"
          title="Help & support"
          subtitle="Talk to Aurasure operations"
          onPress={() => navigation.navigate("Utility", { kind: "help" })}
        />
        <MenuItem
          icon="shieldLock"
          title="Safety centre"
          subtitle="SOS, insurance and safe deliveries"
          onPress={() => navigation.navigate("Utility", { kind: "safety" })}
          color={colors.danger}
          background={colors.dangerBg}
          last
        />
      </Card>
      <Pressable onPress={sendSos} style={styles.sos}>
        <Icon name="shield" size={19} color={colors.white} />
        <View style={{ flex: 1 }}>
          <Text variant="title" weight="bold" color={colors.white}>
            Emergency SOS
          </Text>
          <Text variant="caption" color="rgba(255,255,255,.78)">
            Share an incident with operations
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.white} />
      </Pressable>
      <SectionTitle title="Preferences" />
      <Card style={styles.menuCard}>
        <MenuItem
          icon="translate"
          title="Language"
          subtitle="English · Hindi available"
          onPress={() => navigation.navigate("Utility", { kind: "language" })}
        />
        <MenuItem
          icon="bell"
          title="Notifications"
          subtitle="Delivery requests and payouts"
          onPress={() => navigation.navigate("Notifications")}
        />
        <MenuItem
          icon="edit"
          title="Edit profile"
          subtitle="Update your personal details"
          onPress={() => navigation.navigate("Utility", { kind: "edit" })}
          last
        />
      </Card>
      <Button
        title="Sign out"
        variant="ghost"
        leftIcon="logout"
        onPress={signOut}
        style={{ marginTop: 16, marginBottom: 12 }}
      />
      <Text
        variant="caption"
        color={colors.textTertiary}
        style={{ textAlign: "center" }}
      >
        Aurasure Rider · v1.0.0
      </Text>
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
  profileHero: { padding: 14, marginBottom: 16 },
  profileTop: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: colors.brand[50],
  },
  avatarEmpty: { alignItems: "center", justifyContent: "center" },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: colors.brand[600],
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 15,
    paddingTop: 13,
  },
  kyc: { marginBottom: 18 },
  kycTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progress: {
    height: 7,
    borderRadius: 5,
    backgroundColor: colors.brand[100],
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand[600],
    borderRadius: 5,
  },
  kycAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  menuCard: { paddingVertical: 0, marginBottom: 18 },
  sos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    backgroundColor: colors.danger,
    borderRadius: 15,
    marginBottom: 18,
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.dangerBg,
    marginBottom: 10,
  },
});
