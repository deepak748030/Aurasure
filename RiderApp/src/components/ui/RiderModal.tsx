import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, type ButtonProps } from "./Button";
import { Text } from "./Text";
import { Icon } from "@/lib/icons";
import { colors } from "@/theme/colors";
import type { IconName } from "@/types";

type ActionVariant = NonNullable<ButtonProps["variant"]>;

export interface RiderModalAction {
  label: string;
  onPress: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
}

export interface RiderModalProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: IconName;
  iconColor?: string;
  actions: RiderModalAction[];
  onClose: () => void;
}

/**
 * One confirmation/feedback surface for the rider app. Native Alert dialogs
 * look different across Android, iOS and Expo web; this bottom sheet keeps
 * every destructive action, error and success message consistent and thumb
 * reachable while still handling Android back and backdrop dismissal.
 */
export function RiderModal({
  visible,
  title,
  message,
  icon = "circleAlert",
  iconColor = colors.brand[600],
  actions,
  onClose,
}: RiderModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              maxWidth: Math.min(width - 8, 560),
              paddingBottom: Math.max(insets.bottom, 14) + 8,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={[styles.iconWrap, { backgroundColor: `${iconColor}16` }]}>
              <Icon name={icon} size={22} color={iconColor} />
            </View>
            <View style={styles.headingCopy}>
              <Text variant="h2" weight="bold">
                {title}
              </Text>
              {message ? (
                <Text
                  variant="body"
                  color={colors.textSecondary}
                  style={styles.message}
                >
                  {message}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                title={action.label}
                variant={action.variant ?? "secondary"}
                size="md"
                disabled={action.disabled}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(12, 9, 14, .52)",
  },
  sheet: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    alignSelf: "center",
    backgroundColor: colors.borderStrong,
    marginBottom: 18,
  },
  heading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1, minWidth: 0 },
  message: { marginTop: 6, lineHeight: 21 },
  actions: { gap: 9, marginTop: 22 },
});
