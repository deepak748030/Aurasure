import React, { useState } from "react";
import { Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { Card } from "@/components/ui/RiderUI";
import { riderLogin } from "@/api/session";
import { useRider } from "@/context/RiderContext";
import { colors } from "@/theme/colors";
import { haptic } from "@/lib/haptics";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
export function LoginScreen({ navigation }: Props): React.ReactElement {
  const { setRider } = useRider();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (password.length < 1) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await riderLogin(phone, password);
      setRider(result.rider);
      haptic.success();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
      haptic.error();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Welcome back"
      subtitle="Sign in to start your rider shift"
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
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            backgroundColor: colors.brand[100],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="shield" size={22} color={colors.brand[600]} />
        </View>
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text variant="title" weight="bold">
            Partner login
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Your account is protected with Aurasure security.
          </Text>
        </View>
      </Card>
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
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Your password"
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
        title="Sign in"
        variant="login"
        size="lg"
        loading={busy}
        onPress={() => void submit()}
      />
      <Button
        title="Create a rider account"
        variant="ghost"
        onPress={() => navigation.navigate("Register")}
      />
      <Text
        variant="caption"
        color={colors.textTertiary}
        style={{ textAlign: "center", marginTop: 14 }}
      >
        Only a verified delivery partner account can go online.
      </Text>
    </Screen>
  );
}
