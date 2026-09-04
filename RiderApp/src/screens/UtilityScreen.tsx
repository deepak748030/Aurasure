import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/lib/icons";
import {
  Card,
  MenuItem,
  ProgressBar,
  SectionTitle,
  StatusPill,
} from "@/components/ui/RiderUI";
import { riderApi, type LeaderboardData, type PayoutsData } from "@/api/rider";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { formatINR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Utility">;
type Kind = NonNullable<RootStackParamList["Utility"]>["kind"];
type EditForm = {
  name: string;
  email: string;
  city: string;
  address: string;
  vehicleNumber: string;
  vehicleType: string;
};
const TITLES: Record<Kind, string> = {
  wallet: "Wallet & payouts",
  help: "Help & support",
  leaderboard: "Leaderboard",
  referral: "Refer & earn",
  reviews: "My reviews",
  safety: "Safety centre",
  language: "Language",
  edit: "Edit profile",
  vehicle: "Vehicle details",
  settings: "Settings",
};

export function UtilityScreen({
  route,
  navigation,
}: Props): React.ReactElement {
  const kind = route.params.kind;
  const { rider, refresh } = useRider();
  const [payouts, setPayouts] = useState<PayoutsData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [saved, setSaved] = useState("");
  const [language, setLanguage] = useState("English");
  const [form, setForm] = useState<EditForm>({
    name: rider?.name ?? "",
    email: rider?.email ?? "",
    city: rider?.city ?? "",
    address: rider?.address ?? "",
    vehicleNumber: rider?.vehicleNumber ?? "",
    vehicleType: rider?.vehicleType ?? "bike",
  });
  useEffect(() => {
    if (kind === "wallet")
      void riderApi
        .payouts()
        .then(setPayouts)
        .catch(() => undefined);
    if (kind === "leaderboard")
      void riderApi
        .leaderboard()
        .then(setLeaderboard)
        .catch(() => undefined);
  }, [kind]);
  const save = async () => {
    setBusy(true);
    setSaved("");
    try {
      const body =
        kind === "vehicle"
          ? { vehicleType: form.vehicleType, vehicleNumber: form.vehicleNumber }
          : {
              name: form.name,
              email: form.email,
              city: form.city,
              address: form.address,
            };
      await riderApi.save(body);
      await refresh();
      setSaved("Saved to your Aurasure profile.");
      haptic.success();
    } catch (err) {
      setSaved(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };
  const issue = async () => {
    if (!title.trim()) {
      setSaved("Add a short title first.");
      return;
    }
    setBusy(true);
    try {
      await riderApi.issue(title.trim(), details.trim());
      setTitle("");
      setDetails("");
      setSaved("Ticket created. Operations will contact you.");
      haptic.success();
      await refresh();
    } catch (err) {
      setSaved(
        err instanceof Error ? err.message : "Ticket could not be created",
      );
    } finally {
      setBusy(false);
    }
  };
  const header = (
    <Screen
      title={TITLES[kind]}
      subtitle={kind === "safety" ? "Deliver safely, every time" : undefined}
      headerLeft={
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Icon name="chevronLeft" size={22} color={colors.text} />
        </Pressable>
      }
    >
      {kind === "wallet" ? <Wallet data={payouts} rider={rider} /> : null}
      {kind === "help" ? (
        <Help
          title={title}
          details={details}
          setTitle={setTitle}
          setDetails={setDetails}
          busy={busy}
          saved={saved}
          onSubmit={() => void issue()}
          issues={rider?.issues ?? []}
        />
      ) : null}
      {kind === "leaderboard" ? (
        <Leaderboard rider={rider} data={leaderboard} />
      ) : null}
      {kind === "referral" ? <Referral code={rider?.referralCode} /> : null}
      {kind === "reviews" ? <Reviews rider={rider} /> : null}
      {kind === "safety" ? <Safety /> : null}
      {kind === "language" ? (
        <Language value={language} onChange={setLanguage} />
      ) : null}
      {kind === "edit" || kind === "vehicle" ? (
        <Edit
          kind={kind}
          form={form}
          setForm={setForm}
          busy={busy}
          saved={saved}
          onSave={() => void save()}
        />
      ) : null}
      {kind === "settings" ? <Settings navigation={navigation} /> : null}
    </Screen>
  );
  return header;
}

function Wallet({
  data,
  rider,
}: {
  data: PayoutsData | null;
  rider: ReturnType<typeof useRider>["rider"];
}): React.ReactElement {
  return (
    <>
      <Card tone="plum" style={styles.walletHero}>
        <Text variant="caption" color="rgba(255,255,255,.7)" weight="bold">
          AVAILABLE BALANCE
        </Text>
        <Text variant="display" color={colors.white}>
          {formatINR(data?.balance ?? rider?.payoutBalance ?? 0)}
        </Text>
        <Text
          variant="caption"
          color="rgba(255,255,255,.75)"
          style={{ marginTop: 5 }}
        >
          Settled after successful deliveries
        </Text>
      </Card>
      <View style={styles.twoCards}>
        <Card style={{ flex: 1 }}>
          <Icon name="cash" size={20} color={colors.warning} />
          <Text variant="h2" weight="bold" style={{ marginTop: 7 }}>
            {formatINR(data?.codInHand ?? rider?.codInHand ?? 0)}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Cash in hand
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Icon name="bike" size={20} color={colors.success} />
          <Text variant="h2" weight="bold" style={{ marginTop: 7 }}>
            {data?.totalTrips ?? rider?.totalTrips ?? 0}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Total trips
          </Text>
        </Card>
      </View>
      <SectionTitle title="COD deposits" />
      <Card>
        {(data?.deposits ?? rider?.codDeposits ?? []).length === 0 ? (
          <Text variant="bodySm" color={colors.textSecondary}>
            No deposits recorded yet. Use Earnings to submit one.
          </Text>
        ) : (
          (data?.deposits ?? rider?.codDeposits ?? []).map((deposit) => (
            <View key={deposit.id} style={styles.deposit}>
              <View>
                <Text variant="title" weight="semibold">
                  {deposit.method.toUpperCase()}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {new Date(deposit.createdAt).toLocaleDateString("en-IN")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text variant="title" weight="bold">
                  {formatINR(deposit.amount)}
                </Text>
                <StatusPill
                  label={deposit.status}
                  color={
                    deposit.status === "confirmed"
                      ? colors.success
                      : colors.warning
                  }
                  background={
                    deposit.status === "confirmed"
                      ? colors.successBg
                      : colors.warningBg
                  }
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </>
  );
}

function Help({
  title,
  details,
  setTitle,
  setDetails,
  busy,
  saved,
  onSubmit,
  issues,
}: {
  title: string;
  details: string;
  setTitle: (v: string) => void;
  setDetails: (v: string) => void;
  busy: boolean;
  saved: string;
  onSubmit: () => void;
  issues: { id: string; title: string; body: string; status: string }[];
}): React.ReactElement {
  return (
    <>
      <Card tone="tint" style={styles.helpHero}>
        <Icon name="headset" size={27} color={colors.brand[600]} />
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text variant="title" weight="bold">
            We are here to help
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Payout, delivery, vehicle or account issue?
          </Text>
        </View>
      </Card>
      <SectionTitle title="Contact operations" />
      <Card style={{ paddingVertical: 0 }}>
        <MenuItem
          icon="phone"
          title="Call rider support"
          subtitle="Available 8:00 AM – 10:00 PM"
          onPress={() =>
            Linking.openURL("tel:18001234567").catch(() =>
              Alert.alert(
                "Support",
                "Call support from your registered number.",
              ),
            )
          }
        />
        <MenuItem
          icon="message"
          title="Create a support ticket"
          subtitle="We will reply on your registered number"
          last
        />
      </Card>
      <Input
        label="Issue title"
        value={title}
        onChangeText={setTitle}
        placeholder="Payout not credited"
        leftIcon="circleAlert"
      />
      <Input
        label="Details"
        value={details}
        onChangeText={setDetails}
        placeholder="Tell us what happened"
        multiline
      />
      {saved ? (
        <Text
          variant="caption"
          color={
            saved.includes("created") || saved.includes("reply")
              ? colors.success
              : colors.danger
          }
          style={{ marginBottom: 10 }}
        >
          {saved}
        </Text>
      ) : null}
      <Button title="Send to support" loading={busy} onPress={onSubmit} />
      <SectionTitle title="Your tickets" />
      <Card>
        {issues.length === 0 ? (
          <Text variant="bodySm" color={colors.textSecondary}>
            No support tickets yet.
          </Text>
        ) : (
          issues
            .slice()
            .reverse()
            .map((item) => (
              <View key={item.id} style={styles.ticket}>
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="semibold">
                    {item.title}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {item.body || "No details added"}
                  </Text>
                </View>
                <StatusPill
                  label={item.status}
                  color={colors.warning}
                  background={colors.warningBg}
                />
              </View>
            ))
        )}
      </Card>
    </>
  );
}

function Leaderboard({
  rider,
  data,
}: {
  rider: ReturnType<typeof useRider>["rider"];
  data: LeaderboardData | null;
}): React.ReactElement {
  const trips = rider?.currentDayTrips ?? 0;
  const rows = data?.riders ?? [];
  return (
    <>
      <Card tone="plum" style={styles.levelHero}>
        <View style={styles.rankCircle}>
          <Text variant="h1" weight="bold" color={colors.brand[600]}>
            {data ? `#${data.rank}` : "—"}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 13 }}>
          <Text variant="caption" color="rgba(255,255,255,.7)" weight="bold">
            THIS WEEK'S RANK
          </Text>
          <Text variant="h2" weight="bold" color={colors.white}>
            Rising rider
          </Text>
          <Text variant="caption" color="rgba(255,255,255,.75)">
            {trips} trips today · keep going
          </Text>
        </View>
      </Card>
      <SectionTitle title="Top partners" />
      <Card style={{ paddingVertical: 0 }}>
        {rows.length === 0 ? (
          <View style={{ paddingVertical: 18 }}>
            <Text variant="bodySm" color={colors.textSecondary}>
              Leaderboard data will appear after your first approved shift.
            </Text>
          </View>
        ) : (
          rows.slice(0, 10).map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.leaderRow,
                item.id === rider?.id && styles.leaderCurrent,
              ]}
            >
              <Text
                variant="title"
                weight="bold"
                color={index < 3 ? colors.warning : colors.textSecondary}
                style={{ width: 32 }}
              >
                #{index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  variant="title"
                  weight={item.id === rider?.id ? "bold" : "semibold"}
                >
                  {item.id === rider?.id ? "You" : item.name || "Rider partner"}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {item.trips} trips · {Number(item.rating || 0).toFixed(1)} ★
                </Text>
              </View>
              {item.id === rider?.id ? (
                <StatusPill
                  label="You"
                  color={colors.brand[600]}
                  background={colors.brand[100]}
                />
              ) : null}
            </View>
          ))
        )}
      </Card>
      <SectionTitle title="Your next level" />
      <Card>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Icon name="star" size={20} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" weight="bold">
              Gold partner
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              10 trips to unlock
            </Text>
          </View>
          <Text variant="h3" weight="bold" color={colors.brand[600]}>
            {Math.min(10, rider?.totalTrips ?? 0)}/10
          </Text>
        </View>
        <ProgressBar
          value={Math.min(1, (rider?.totalTrips ?? 0) / 10)}
          color={colors.warning}
          track={colors.warningBg}
        />
      </Card>
    </>
  );
}

function Referral({ code }: { code?: string }): React.ReactElement {
  const referral = code || "AURA-RIDER";
  return (
    <>
      <Card tone="plum" style={styles.refHero}>
        <Icon name="gift" size={30} color={colors.white} />
        <Text
          variant="h1"
          weight="bold"
          color={colors.white}
          style={{ marginTop: 10 }}
        >
          Earn with every invite
        </Text>
        <Text
          variant="bodySm"
          color="rgba(255,255,255,.78)"
          style={{ marginTop: 5 }}
        >
          Invite a friend to deliver with Aurasure.
        </Text>
        <View style={styles.code}>
          <Text variant="h3" weight="bold" color={colors.brand[600]}>
            {referral}
          </Text>
        </View>
      </Card>
      <Card style={styles.refSteps}>
        <Text variant="title" weight="bold">
          How it works
        </Text>
        {[
          "Share your personal invite code",
          "Your friend completes rider verification",
          "Both of you receive a referral reward",
        ].map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text variant="caption" weight="bold" color={colors.white}>
                {index + 1}
              </Text>
            </View>
            <Text variant="bodySm" style={{ flex: 1 }}>
              {step}
            </Text>
          </View>
        ))}
      </Card>
      <Button
        title="Share invite code"
        variant="primary"
        leftIcon="share"
        onPress={() =>
          Share.share({
            message: `Join Aurasure as a delivery partner. Use my referral code ${referral}.`,
          }).catch(() => undefined)
        }
      />
    </>
  );
}

function Reviews({
  rider,
}: {
  rider: ReturnType<typeof useRider>["rider"];
}): React.ReactElement {
  return (
    <>
      <Card style={styles.ratingHero}>
        <Text variant="display" weight="bold" color={colors.brand[600]}>
          {(rider?.rating ?? 5).toFixed(1)}
        </Text>
        <View style={{ marginLeft: 14 }}>
          <Text variant="title" weight="bold">
            Customer rating
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {rider?.ratingCount ?? 0} reviews · keep delivering great service
          </Text>
          <Text variant="title" color={colors.star} style={{ marginTop: 4 }}>
            ★★★★★
          </Text>
        </View>
      </Card>
      <SectionTitle title="Rating tips" />
      <Card>
        {[
          "Handle every order with care",
          "Confirm the customer name before handing over",
          "Keep pickup and drop updates on time",
        ].map((tip) => (
          <View key={tip} style={styles.tip}>
            <Icon name="circleCheck" size={17} color={colors.success} />
            <Text variant="bodySm" style={{ flex: 1 }}>
              {tip}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function Safety(): React.ReactElement {
  return (
    <>
      <Card tone="tint" style={styles.safetyHero}>
        <Icon name="shieldLock" size={28} color={colors.success} />
        <Text variant="h2" weight="bold" style={{ marginTop: 10 }}>
          Your safety comes first
        </Text>
        <Text
          variant="bodySm"
          color={colors.textSecondary}
          style={{ marginTop: 4 }}
        >
          Aurasure operations can see an SOS incident and your last shared
          location.
        </Text>
      </Card>
      <SectionTitle title="During a delivery" />
      <Card>
        {[
          "Wear a helmet and follow traffic rules",
          "Never share your personal phone number",
          "Verify the pickup and drop OTP every time",
          "Use the SOS button for an emergency",
        ].map((tip) => (
          <View key={tip} style={styles.tip}>
            <Icon name="shield" size={17} color={colors.brand[600]} />
            <Text variant="bodySm" style={{ flex: 1 }}>
              {tip}
            </Text>
          </View>
        ))}
      </Card>
      <Button
        title="Call emergency services"
        variant="danger"
        leftIcon="phone"
        onPress={() => Linking.openURL("tel:112").catch(() => undefined)}
      />
    </>
  );
}

function Language({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <>
      <Text
        variant="bodySm"
        color={colors.textSecondary}
        style={{ marginBottom: 12 }}
      >
        Choose the language you are most comfortable using while delivering.
      </Text>
      <Card style={{ paddingVertical: 0 }}>
        {["English", "हिन्दी"].map((item, index) => (
          <Pressable
            key={item}
            onPress={() => {
              onChange(item);
              haptic.selection();
            }}
            style={[
              styles.language,
              index === 0 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.radio, value === item && styles.radioActive]}>
              {value === item ? <View style={styles.radioDot} /> : null}
            </View>
            <Text variant="title" weight="semibold" style={{ flex: 1 }}>
              {item}
            </Text>
            {value === item ? (
              <Icon name="check" size={18} color={colors.success} />
            ) : null}
          </Pressable>
        ))}
      </Card>
      <Text
        variant="caption"
        color={colors.textSecondary}
        style={{ marginTop: 12 }}
      >
        Language preference is saved on this device. Server messages remain
        available in English.
      </Text>
    </>
  );
}

function Edit({
  kind,
  form,
  setForm,
  busy,
  saved,
  onSave,
}: {
  kind: "edit" | "vehicle";
  form: EditForm;
  setForm: React.Dispatch<React.SetStateAction<EditForm>>;
  busy: boolean;
  saved: string;
  onSave: () => void;
}): React.ReactElement {
  const set = (key: keyof typeof form, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  return (
    <>
      <Card tone="tint" style={styles.editIntro}>
        <Icon
          name={kind === "vehicle" ? "bike" : "user"}
          size={24}
          color={colors.brand[600]}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text variant="title" weight="bold">
            {kind === "vehicle"
              ? "Keep vehicle details current"
              : "Keep your profile current"}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Accurate details help operations support you faster.
          </Text>
        </View>
      </Card>
      {kind === "vehicle" ? (
        <>
          <Text
            variant="caption"
            color={colors.textSecondary}
            style={{ marginBottom: 8 }}
          >
            Vehicle type
          </Text>
          <View style={styles.vehicleChoices}>
            {["bike", "scooter", "cycle", "ev"].map((item) => (
              <Pressable
                key={item}
                onPress={() => set("vehicleType", item)}
                style={[
                  styles.vehicleChoice,
                  form.vehicleType === item && styles.vehicleActive,
                ]}
              >
                <Icon
                  name={item === "ev" ? "zap" : "bike"}
                  size={17}
                  color={
                    form.vehicleType === item
                      ? colors.white
                      : colors.textSecondary
                  }
                />
                <Text
                  variant="caption"
                  weight="bold"
                  color={
                    form.vehicleType === item
                      ? colors.white
                      : colors.textSecondary
                  }
                >
                  {item.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Registration number"
            value={form.vehicleNumber}
            onChangeText={(value) => set("vehicleNumber", value.toUpperCase())}
            placeholder="MH 12 AB 1234"
            leftIcon="car"
          />
        </>
      ) : (
        <>
          <Input
            label="Full name"
            value={form.name}
            onChangeText={(value) => set("name", value)}
            leftIcon="user"
          />
          <Input
            label="Email"
            value={form.email}
            onChangeText={(value) => set("email", value)}
            keyboardType="email-address"
            leftIcon="mail"
          />
          <Input
            label="City"
            value={form.city}
            onChangeText={(value) => set("city", value)}
            leftIcon="mapPin"
          />
          <Input
            label="Address"
            value={form.address}
            onChangeText={(value) => set("address", value)}
            multiline
          />
        </>
      )}
      {saved ? (
        <Text
          variant="caption"
          color={saved.includes("Saved") ? colors.success : colors.danger}
          style={{ marginBottom: 10 }}
        >
          {saved}
        </Text>
      ) : null}
      <Button title="Save changes" loading={busy} onPress={onSave} />
    </>
  );
}

function Settings({
  navigation,
}: {
  navigation: Props["navigation"];
}): React.ReactElement {
  return (
    <>
      <Card style={{ paddingVertical: 0 }}>
        <MenuItem
          icon="bell"
          title="Notification preferences"
          subtitle="Delivery requests, payouts and updates"
          onPress={() => navigation.navigate("Notifications")}
        />
        <MenuItem
          icon="translate"
          title="Language"
          subtitle="English · Hindi available"
          onPress={() => navigation.navigate("Utility", { kind: "language" })}
        />
        <MenuItem
          icon="shieldLock"
          title="Privacy & safety"
          subtitle="How Aurasure protects your account"
          onPress={() => navigation.navigate("Utility", { kind: "safety" })}
          last
        />
      </Card>
      <Text
        variant="caption"
        color={colors.textTertiary}
        style={{ textAlign: "center", marginTop: 22 }}
      >
        Aurasure Rider settings · v1.0.0
      </Text>
    </>
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
  walletHero: { marginBottom: 8 },
  twoCards: { flexDirection: "row", gap: 8, marginBottom: 18 },
  deposit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  helpHero: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  ticket: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  levelHero: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  rankCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 13,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  leaderCurrent: {
    backgroundColor: colors.brand[50],
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.warningBg,
    alignItems: "center",
    justifyContent: "center",
  },
  refHero: { alignItems: "flex-start", marginBottom: 8 },
  code: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 18,
  },
  refSteps: { marginBottom: 14 },
  step: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 13 },
  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  ratingHero: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  safetyHero: { marginBottom: 18 },
  language: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand[600] },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.brand[600],
  },
  editIntro: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  vehicleChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 14,
  },
  vehicleChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
});
