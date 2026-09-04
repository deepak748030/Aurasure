import React from "react";
import { View } from "react-native";
import { Icon } from "@/lib/icons";
import { Text } from "./Text";
import { Button } from "./Button";
import { colors } from "@/theme/colors";
import type { IconName } from "@/types";

export function EmptyState({
  icon = "package",
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 40,
        paddingHorizontal: 22,
      }}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.brand[50],
        }}
      >
        <Icon name={icon} size={30} color={colors.brand[600]} />
      </View>
      <Text
        variant="h3"
        weight="bold"
        style={{ textAlign: "center", marginTop: 14 }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          variant="bodySm"
          color={colors.textSecondary}
          style={{ textAlign: "center", marginTop: 5 }}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
}
