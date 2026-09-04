import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Switch,
  View,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { Card, ProgressBar } from "@/components/ui/RiderUI";
import { riderApi, uploadRiderFile, type Rider } from "@/api/rider";
import { pickImage } from "@/lib/pickImage";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { haptic } from "@/lib/haptics";

const STEPS = [
  { title: "About you", subtitle: "Personal details" },
  { title: "Your vehicle", subtitle: "Vehicle & identity" },
  { title: "Get paid", subtitle: "Bank details" },
  { title: "Verify & start", subtitle: "Upload documents" },
];
const DOCUMENTS = [
  { key: "aadhaar", label: "Aadhaar card" },
  { key: "drivingLicense", label: "Driving licence" },
  { key: "pan", label: "PAN card" },
  { key: "vehicle", label: "Vehicle RC" },
  { key: "photo", label: "Profile photo" },
];
function fromRider(rider: Rider | null) {
  return {
    name: rider?.name || "",
    email: rider?.email || "",
    city: rider?.city || "",
    pincode: rider?.pincode || "",
    address: rider?.address || "",
    vehicleType: rider?.vehicleType || "bike",
    vehicleNumber: rider?.vehicleNumber || "",
    pan: rider?.pan || "",
    aadhaar: rider?.aadhaar || "",
    drivingLicense: rider?.drivingLicense || "",
    rcNumber: rider?.rcNumber || "",
    trainingCompleted: rider?.trainingCompleted || false,
    quizCompleted: rider?.quizCompleted || false,
    accountName: rider?.bank?.accountName || "",
    accountNumber: rider?.bank?.accountNumber || "",
    ifsc: rider?.bank?.ifsc || "",
    bankName: rider?.bank?.bankName || "",
    upi: rider?.bank?.upi || "",
  };
}
export function OnboardingScreen(): React.ReactElement {
  const { rider, setRider } = useRider();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => fromRider(rider));
  const [docs, setDocs] = useState(() =>
    DOCUMENTS.map((doc) => {
      const existing = rider?.documents?.find((item) => item.key === doc.key);
      return {
        ...doc,
        uri: existing?.uri || "",
        verified: existing?.verified || false,
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((old) => ({ ...old, [key]: value }));
  const save = async (body: Record<string, unknown>) => {
    const response = await riderApi.save(body);
    setRider(response.rider);
  };
  const next = async () => {
    setError("");
    if (
      step === 0 &&
      (!form.name.trim() ||
        !form.city.trim() ||
        !/^\d{6}$/.test(form.pincode) ||
        !form.address.trim())
    ) {
      setError("Add your name, city, valid 6-digit PIN and address.");
      return;
    }
    if (
      step === 1 &&
      (!form.vehicleNumber.trim() ||
        !form.pan.trim() ||
        !form.aadhaar.trim() ||
        !form.drivingLicense.trim() ||
        !form.rcNumber.trim())
    ) {
      setError("Complete vehicle and identity details to continue.");
      return;
    }
    if (
      step === 2 &&
      (!form.accountName.trim() ||
        !form.accountNumber.trim() ||
        !form.ifsc.trim() ||
        !form.bankName.trim())
    ) {
      setError("Complete account holder, account number, IFSC and bank name.");
      return;
    }
    setBusy(true);
    try {
      if (step === 0)
        await save({
          name: form.name.trim(),
          email: form.email.trim(),
          city: form.city.trim(),
          pincode: form.pincode,
          address: form.address.trim(),
        });
      if (step === 1)
        await save({
          vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber.toUpperCase(),
          pan: form.pan.toUpperCase(),
          aadhaar: form.aadhaar,
          drivingLicense: form.drivingLicense.toUpperCase(),
          rcNumber: form.rcNumber.toUpperCase(),
          trainingCompleted: form.trainingCompleted,
          quizCompleted: form.quizCompleted,
        });
      if (step === 2)
        await save({
          bank: {
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            ifsc: form.ifsc.toUpperCase(),
            bankName: form.bankName,
            upi: form.upi,
          },
        });
      setStep((old) => Math.min(3, old + 1));
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save details");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (key: string, label: string) => {
    const image = await pickImage();
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const result = await uploadRiderFile(image.blob, image.name);
      await riderApi.setDoc(key, result.url, label);
      setDocs((old) =>
        old.map((doc) => (doc.key === key ? { ...doc, uri: result.url } : doc)),
      );
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (docs.some((doc) => !doc.uri)) {
      setError("Upload all five documents before submitting.");
      return;
    }
    if (!form.trainingCompleted || !form.quizCompleted) {
      setError("Complete the training and safety quiz first.");
      return;
    }
    setBusy(true);
    try {
      const response = await riderApi.submit();
      setRider(response.rider);
      haptic.success();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit verification",
      );
    } finally {
      setBusy(false);
    }
  };
  const currentStep = STEPS[step] ||
    STEPS[0] || { title: "Onboarding", subtitle: "Partner profile" };
  return (
    <Screen
      title={currentStep.title}
      subtitle={`${currentStep.subtitle} · Step ${step + 1} of ${STEPS.length}`}
      keyboardAvoiding
    >
      <Card tone="tint" style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 9,
          }}
        >
          <Text variant="caption" color={colors.brand[700]} weight="bold">
            PARTNER ONBOARDING
          </Text>
          <Text variant="caption" color={colors.brand[600]}>
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </Text>
        </View>
        <ProgressBar value={(step + 1) / STEPS.length} />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 9,
          }}
        >
          {STEPS.map((item, index) => (
            <View
              key={item.title}
              style={{
                flex: 1,
                alignItems:
                  index === 0
                    ? "flex-start"
                    : index === STEPS.length - 1
                      ? "flex-end"
                      : "center",
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    index <= step ? colors.brand[600] : colors.brand[100],
                }}
              >
                <Text
                  variant="caption"
                  weight="bold"
                  color={index <= step ? colors.white : colors.brand[600]}
                >
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
      {step === 0 ? (
        <>
          <Text
            variant="bodySm"
            color={colors.textSecondary}
            style={{ marginBottom: 14 }}
          >
            Tell us where you live so we can show the right delivery zone.
          </Text>
          <Input
            label="Full name"
            value={form.name}
            onChangeText={(value) => set("name", value)}
            placeholder="As on your ID"
            leftIcon="user"
          />
          <Input
            label="Email (optional)"
            value={form.email}
            onChangeText={(value) => set("email", value)}
            keyboardType="email-address"
            leftIcon="mail"
          />
          <Input
            label="City"
            value={form.city}
            onChangeText={(value) => set("city", value)}
            placeholder="Pune"
            leftIcon="mapPin"
          />
          <Input
            label="PIN code"
            value={form.pincode}
            onChangeText={(value) =>
              set("pincode", value.replace(/\D/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            placeholder="411001"
          />
          <Input
            label="Home address"
            value={form.address}
            onChangeText={(value) => set("address", value)}
            multiline
            placeholder="House, street, landmark"
          />
        </>
      ) : null}
      {step === 1 ? (
        <>
          <Text
            variant="bodySm"
            color={colors.textSecondary}
            style={{ marginBottom: 12 }}
          >
            Use a vehicle you can legally operate for delivery.
          </Text>
          <Text
            variant="caption"
            weight="bold"
            color={colors.textSecondary}
            style={{ marginBottom: 8 }}
          >
            Vehicle type
          </Text>
          <View style={{ flexDirection: "row", gap: 7, marginBottom: 15 }}>
            {["bike", "scooter", "cycle", "ev"].map((item) => (
              <Pressable
                key={item}
                onPress={() => set("vehicleType", item)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor:
                    form.vehicleType === item
                      ? colors.brand[600]
                      : colors.surface,
                  borderWidth: 1,
                  borderColor:
                    form.vehicleType === item
                      ? colors.brand[600]
                      : colors.border,
                }}
              >
                <Icon
                  name={item === "ev" ? "zap" : "bike"}
                  size={18}
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
                  style={{ marginTop: 4 }}
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
          <Input
            label="PAN number"
            value={form.pan}
            onChangeText={(value) => set("pan", value.toUpperCase())}
            leftIcon="document"
          />
          <Input
            label="Aadhaar number"
            value={form.aadhaar}
            onChangeText={(value) =>
              set("aadhaar", value.replace(/\D/g, "").slice(0, 12))
            }
            keyboardType="number-pad"
            leftIcon="shield"
          />
          <Input
            label="Driving licence number"
            value={form.drivingLicense}
            onChangeText={(value) => set("drivingLicense", value.toUpperCase())}
            leftIcon="creditCard"
          />
          <Input
            label="RC number"
            value={form.rcNumber}
            onChangeText={(value) => set("rcNumber", value.toUpperCase())}
            leftIcon="clipboard"
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                Safety training completed
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                Know the OTP, COD and SOS rules.
              </Text>
            </View>
            <Switch
              value={form.trainingCompleted as boolean}
              onValueChange={(value) => set("trainingCompleted", value)}
              trackColor={{
                false: colors.borderStrong,
                true: colors.brand[300],
              }}
              thumbColor={
                form.trainingCompleted ? colors.brand[600] : colors.white
              }
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">
                Safety quiz passed
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                A quick check before going live.
              </Text>
            </View>
            <Switch
              value={form.quizCompleted as boolean}
              onValueChange={(value) => set("quizCompleted", value)}
              trackColor={{
                false: colors.borderStrong,
                true: colors.brand[300],
              }}
              thumbColor={form.quizCompleted ? colors.brand[600] : colors.white}
            />
          </View>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <Card tone="tint" style={{ marginBottom: 16 }}>
            <Icon name="shieldLock" size={22} color={colors.brand[600]} />
            <Text variant="title" weight="bold" style={{ marginTop: 7 }}>
              Your details are encrypted
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Payouts are sent only to the account you submit.
            </Text>
          </Card>
          <Input
            label="Account holder name"
            value={form.accountName}
            onChangeText={(value) => set("accountName", value)}
            leftIcon="user"
          />
          <Input
            label="Account number"
            value={form.accountNumber}
            onChangeText={(value) =>
              set("accountNumber", value.replace(/\D/g, ""))
            }
            keyboardType="number-pad"
            leftIcon="bank"
          />
          <Input
            label="IFSC code"
            value={form.ifsc}
            onChangeText={(value) => set("ifsc", value.toUpperCase())}
            autoCapitalize="characters"
            leftIcon="creditCard"
          />
          <Input
            label="Bank name"
            value={form.bankName}
            onChangeText={(value) => set("bankName", value)}
            leftIcon="bank"
          />
          <Input
            label="UPI ID (optional)"
            value={form.upi}
            onChangeText={(value) => set("upi", value)}
            leftIcon="smartphone"
          />
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Text
            variant="bodySm"
            color={colors.textSecondary}
            style={{ marginBottom: 12 }}
          >
            Upload clear, uncropped images. Admin reviews every document before
            you can go online.
          </Text>
          {docs.map((doc) => (
            <Pressable
              key={doc.key}
              onPress={() => void upload(doc.key, doc.label)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 11,
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {doc.uri ? (
                <Image
                  source={{ uri: doc.uri }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    backgroundColor: colors.surfaceAlt,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    backgroundColor: colors.brand[50],
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="camera" size={22} color={colors.brand[600]} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold">
                  {doc.label}
                </Text>
                <Text
                  variant="caption"
                  color={doc.uri ? colors.success : colors.textSecondary}
                >
                  {doc.uri
                    ? "Uploaded · tap to replace"
                    : "Required · tap to upload"}
                </Text>
              </View>
              <Icon
                name={doc.uri ? "circleCheck" : "plus"}
                size={20}
                color={doc.uri ? colors.success : colors.textTertiary}
              />
            </Pressable>
          ))}
          {busy ? (
            <ActivityIndicator
              color={colors.brand[600]}
              style={{ margin: 15 }}
            />
          ) : null}
        </>
      ) : null}
      {error ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 11 }}>
          {error}
        </Text>
      ) : null}
      <View style={{ gap: 8, marginTop: 18 }}>
        <Button
          title={step === 3 ? "Submit for verification" : "Save & continue"}
          variant={step === 3 ? "success" : "primary"}
          loading={busy}
          onPress={() => void (step === 3 ? submit() : next())}
        />
        {step > 0 ? (
          <Button
            title="Back"
            variant="ghost"
            onPress={() => setStep((old) => old - 1)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
