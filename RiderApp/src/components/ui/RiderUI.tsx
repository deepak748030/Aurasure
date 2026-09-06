import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/tokens";
import { Icon } from "@/lib/icons";
import { Text } from "./Text";
import type { IconName } from "@/types";

export function Card({
  children,
  style,
  tone = "white",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "white" | "tint" | "plum";
}): React.ReactElement {
  return (
    <View
      style={[
        styles.card,
        tone === "tint" && styles.tintCard,
        tone === "plum" && styles.plumCard,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="h3" weight="bold">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="caption" weight="bold" color={colors.brand[600]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = colors.text,
  background = colors.surface,
  size = 42,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  background?: string;
  size?: number;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: background,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

export function StatusPill({
  label,
  color = colors.success,
  background = colors.successBg,
  icon,
}: {
  label: string;
  color?: string;
  background?: string;
  icon?: IconName;
}): React.ReactElement {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {icon ? (
        <Icon name={icon} size={13} color={color} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text variant="caption" weight="bold" color={color}>
        {label}
      </Text>
    </View>
  );
}

export function Metric({
  icon,
  label,
  value,
  color = colors.brand[600],
}: {
  icon: IconName;
  label: string;
  value: string;
  color?: string;
}): React.ReactElement {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}16` }]}>
        <Icon name={icon} size={17} color={color} />
      </View>
      <Text
        variant="h2"
        weight="bold"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={{ marginTop: 6 }}
      >
        {value}
      </Text>
      <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Rule(): React.ReactElement {
  return <View style={styles.rule} />;
}

export function ProgressBar({
  value,
  color = colors.brand[600],
  track = colors.brand[100],
  steps = 1,
}: {
  value: number;
  color?: string;
  track?: string;
  steps?: number;
}): React.ReactElement {
  const stepValue =
    steps > 1
      ? Math.round(value * steps) / steps
      : Math.max(0, Math.min(1, value));
  return (
    <View
      style={[
        styles.progressTrack,
        {
          backgroundColor: track,
          borderRadius: 14,
          height: 10,
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${stepValue * 100}%`,
            backgroundColor: color,
            borderRadius: 14,
          },
        ]}
      />
    </View>
  );
}

export function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  color = colors.brand[600],
  background = colors.brand[50],
  last = false,
  right,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
  background?: string;
  last?: boolean;
  right?: React.ReactNode;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !last && styles.menuBorder,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: background }]}>
        <Icon name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" weight="semibold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

export function RoutePoint({
  type,
  title,
  address,
  last = false,
}: {
  type: "pickup" | "drop";
  title: string;
  address: string;
  last?: boolean;
}): React.ReactElement {
  const pickup = type === "pickup";
  return (
    <View style={styles.routePoint}>
      <View style={styles.routeRail}>
        {
          <View
            style={[
              styles.routeDot,
              { backgroundColor: pickup ? colors.warning : colors.danger },
            ]}
          />
        }
        {!last ? <View style={styles.routeLine} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>
        <Text variant="caption" color={colors.textSecondary}>
          {pickup ? "PICKUP" : "DROP-OFF"}
        </Text>
        <Text variant="title" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodySm" color={colors.textSecondary} numberOfLines={2}>
          {address || "Address shared after acceptance"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  tintCard: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[100],
  },
  plumCard: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 7 },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    minWidth: 0,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rule: { height: 1, backgroundColor: colors.border },
  progressTrack: { height: 10, borderRadius: 14, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 14 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  routePoint: { flexDirection: "row", gap: 10 },
  routeRail: { width: 16, alignItems: "center" },
  routeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  routeLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.borderStrong,
    marginVertical: 2,
  },
});
