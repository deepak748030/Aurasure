import React from "react";
import { Image, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/lib/icons";
import { Card } from "@/components/ui/RiderUI";
import { colors } from "@/theme/colors";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;
const BENEFITS = [
  {
    icon: "map" as const,
    title: "Nearby delivery requests",
    body: "See pickup, drop and guaranteed pay before you accept.",
  },
  {
    icon: "wallet" as const,
    title: "Clear earnings",
    body: "Track trip pay, incentives, payouts and COD in one place.",
  },
  {
    icon: "shield" as const,
    title: "Support when you need it",
    body: "OTP checks, proof of delivery and SOS keep every trip safer.",
  },
];
export function WelcomeScreen({ navigation }: Props): React.ReactElement {
  return (
    <Screen
      scroll
      padded={false}
      appBarColor={colors.brand[600]}
      statusBarStyle="light"
    >
      <View style={{ paddingHorizontal: 4 }}>
        <View
          style={{
            backgroundColor: colors.brand[600],
            paddingTop: 18,
            paddingBottom: 28,
            paddingHorizontal: 15,
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Image
              source={require("../../../assets/images/icon.png")}
              style={{ width: 42, height: 42, borderRadius: 13 }}
            />
            <View>
              <Text variant="title" weight="bold" color={colors.white}>
                AURASURE
              </Text>
              <Text variant="caption" color="rgba(255,255,255,.7)">
                DELIVERY PARTNER
              </Text>
            </View>
          </View>
          <Text
            variant="display"
            color={colors.white}
            style={{ marginTop: 36 }}
          >
            Ride with purpose.{`\n`}Earn with every trip.
          </Text>
          <Text
            variant="body"
            color="rgba(255,255,255,.8)"
            style={{ marginTop: 11 }}
          >
            Your workday, made simpler — from the first request to your final
            payout.
          </Text>
        </View>
        <View style={{ paddingHorizontal: 4, paddingTop: 20 }}>
          <Text variant="h2" weight="bold">
            Everything you need on the road
          </Text>
          {BENEFITS.map((item) => (
            <Card
              key={item.title}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
                padding: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: colors.brand[50],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={item.icon} size={21} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text variant="title" weight="bold">
                  {item.title}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {item.body}
                </Text>
              </View>
            </Card>
          ))}
          <Button
            title="Sign in to rider account"
            variant="login"
            size="lg"
            onPress={() => navigation.navigate("Login")}
            style={{ marginTop: 22 }}
          />
          <Button
            title="Create rider account"
            variant="ghost"
            onPress={() => navigation.navigate("Register")}
          />
          <Text
            variant="caption"
            color={colors.textTertiary}
            style={{ textAlign: "center", marginTop: 5 }}
          >
            One phone number · one Aurasure role
          </Text>
        </View>
      </View>
    </Screen>
  );
}
