import React, { useState } from "react";
import { Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { Card } from "@/components/ui/RiderUI";
import { riderRegister } from "@/api/session";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;
const VEHICLES = ["bike", "scooter", "cycle", "ev"];
export function RegisterScreen({ navigation }: Props): React.ReactElement {
  const { setRider } = useRider();
  const [vehicleType, setVehicleType] = useState("bike");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await riderRegister({
        name: name.trim(),
        phone,
        password,
        vehicleType,
      });
      setRider(result.rider);
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
      haptic.error();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Become a rider"
      subtitle="Create your partner account"
      headerLeft={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginRight: 8 }}
        >
          <Icon name="chevronLeft" size={23} color={colors.text} />
        </Pressable>
      }
      keyboardAvoiding
    >
      <Card
        tone="tint"
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
      >
        <Icon name="bike" size={25} color={colors.brand[600]} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text variant="title" weight="bold">
            Choose your ride, then complete KYC
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Admin verification is required before going online.
          </Text>
        </View>
      </Card>
      <Text
        variant="caption"
        color={colors.textSecondary}
        weight="bold"
        style={{ marginBottom: 8 }}
      >
        I will deliver with
      </Text>
      <View style={{ flexDirection: "row", gap: 7, marginBottom: 18 }}>
        {VEHICLES.map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setVehicleType(item);
              haptic.selection();
            }}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor:
                vehicleType === item ? colors.brand[600] : colors.border,
              backgroundColor:
                vehicleType === item ? colors.brand[600] : colors.surface,
            }}
          >
            <Icon
              name={item === "ev" ? "zap" : "bike"}
              size={19}
              color={vehicleType === item ? colors.white : colors.textSecondary}
            />
            <Text
              variant="caption"
              weight="bold"
              color={vehicleType === item ? colors.white : colors.textSecondary}
              style={{ marginTop: 4 }}
            >
              {item.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="As on your ID"
        leftIcon="user"
      />
      <Input
        label="Mobile number"
        value={phone}
        onChangeText={(value) =>
          setPhone(value.replace(/\D/g, "").slice(0, 10))
        }
        keyboardType="phone-pad"
        placeholder="10-digit mobile"
        leftIcon="phone"
      />
      <Input
        label="Create password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Minimum 6 characters"
        leftIcon="lock"
      />
      {error ? (
        <Text
          variant="caption"
          color={colors.danger}
          style={{ marginBottom: 10 }}
        >
          {error}
        </Text>
      ) : null}
      <Button
        title="Create account & continue"
        variant="login"
        size="lg"
        loading={busy}
        onPress={() => void submit()}
      />
      <Text
        variant="caption"
        color={colors.textTertiary}
        style={{ textAlign: "center", marginTop: 12 }}
      >
        Your number cannot be used for a customer or vendor role.
      </Text>
    </Screen>
  );
}
