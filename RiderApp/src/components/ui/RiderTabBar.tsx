import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon } from "@/lib/icons";
import { Text } from "./Text";
import { haptic } from "@/lib/haptics";
import { colors } from "@/theme/colors";
import type { IconName } from "@/types";

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "Home", label: "Home", icon: "home" },
  { key: "Tasks", label: "Requests", icon: "orders" },
  { key: "Earnings", label: "Earnings", icon: "wallet" },
  { key: "Profile", label: "Profile", icon: "user" },
];

export function RiderTabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS.find((item) => item.key === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const badge = descriptors[route.key]?.options.tabBarBadge;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={() => {
              haptic.light();
              navigation.navigate(route.name);
            }}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.72 }]}
          >
            <View style={styles.iconWrap}>
              <View
                style={[styles.iconPlate, focused && styles.iconPlateActive]}
              >
                <Icon
                  name={tab.icon}
                  size={21}
                  color={focused ? colors.brand[600] : colors.textTertiary}
                  filled={focused}
                />
              </View>
              {badge != null && Number(badge) > 0 ? (
                <View style={styles.badge}>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={colors.white}
                    style={{ fontSize: 10 }}
                  >
                    {Number(badge) > 9 ? "9+" : String(badge)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              weight={focused ? "bold" : "medium"}
              color={focused ? colors.brand[600] : colors.textSecondary}
            >
              {tab.label}
            </Text>
            <View style={[styles.activeLine, !focused && { opacity: 0 }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, minHeight: 58 },
  iconWrap: { position: "relative" },
  iconPlate: {
    width: 42,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlateActive: { backgroundColor: colors.brand[50] },
  activeLine: {
    width: 18,
    height: 3,
    borderRadius: 4,
    backgroundColor: colors.brand[600],
    marginTop: 3,
  },
  badge: {
    position: "absolute",
    right: -7,
    top: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
