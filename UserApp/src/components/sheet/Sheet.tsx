import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { motion, radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * THE bottom sheet. This project does not use `Alert.alert` anywhere - every
 * confirmation, error, success, info note and option picker is a modal that
 * rises from the bottom edge of the screen and can be dragged back down.
 *
 * `Sheet` is the reusable surface (used declaratively by screens for filters,
 * coupon pickers, address pickers…) and `SheetHost` renders the imperative
 * queue used by `useSheet()` - see `./useSheet.tsx`.
 */

export interface SheetAction {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconTint?: string;
  actions?: SheetAction[];
  /** Show a "cancel/close" secondary action automatically under custom actions. */
  dismissLabel?: string;
  children?: React.ReactNode;
  /** Max height as a fraction of the window (the rest scrolls). */
  maxHeightRatio?: number;
  /** Allow the drag-down gesture + backdrop tap. */
  dismissible?: boolean;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Render children in a ScrollView (default true so long sheets never clip). */
  scrollable?: boolean;
}

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconTint,
  actions = [],
  dismissLabel,
  children,
  maxHeightRatio = 0.86,
  dismissible = true,
  footer,
  style,
  scrollable = true,
}: SheetProps): React.ReactElement {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(1)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(1);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: motion.sheetIn, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: motion.sheetIn, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 1, duration: motion.sheetOut, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: motion.sheetOut, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, backdrop, translateY]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) => dismissible && gesture.dy > 14 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_evt, gesture) => {
          if (!dismissible) return;
          translateY.setValue(Math.max(0, gesture.dy / 320));
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (!dismissible) return;
          if (gesture.dy > 90 || gesture.vy > 0.7) {
            haptic.light();
            onClose();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 2 }).start();
          }
        },
      }),
    [dismissible, onClose, translateY],
  );

  const styles = useMemo(() => createStyles(c), [c]);

  // Do not leave an empty native Modal mounted after the exit animation.
  // Android can keep its white surface above the tab bar for a frame when a
  // placeholder View is returned here.
  if (!mounted) return null;

  const dismiss = (): void => {
    if (dismissible) {
      haptic.light();
      onClose();
    }
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        {/* Keep the backdrop as a full-screen hit target. Without an explicit
            absolute frame, RN Web can measure this Pressable at zero height,
            allowing the tab bar underneath to receive touches. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            style,
            {
              maxHeight: `${maxHeightRatio * 100}%`,
              backgroundColor: c.sheet,
              transform: [{ translateY: translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 720] }) }],
              paddingBottom: Math.max(insets.bottom, spacing.md) + 4,
            },
          ]}
        >
          <View {...drag.panHandlers} style={styles.handleZone}>
            <View style={styles.handle} />
          </View>

          {(title || subtitle || icon) && (
            <View style={styles.header}>
              {icon ? (
                <View style={[styles.iconPlate, { backgroundColor: `${iconTint ?? c.primary}1A` }]}>
                  <Icon name={icon} size={20} color={iconTint ?? c.primary} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                {title ? (
                  <Text variant="h3" weight="bold" numberOfLines={2}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="bodySm" color={c.textSecondary} style={{ marginTop: 2 }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {dismissible ? (
                <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
                  <Icon name="x" size={18} color={c.textTertiary} />
                </Pressable>
              ) : null}
            </View>
          )}

          {scrollable ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: actions.length || footer ? 4 : 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingHorizontal: spacing.md }]}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}

          {(actions.length > 0 || dismissLabel) && (
            <View style={styles.actions}>
              {actions.map((action) => (
                <Button
                  key={action.label}
                  title={action.label}
                  variant={action.variant ?? 'primary'}
                  icon={action.icon}
                  loading={action.loading}
                  disabled={action.disabled}
                  onPress={action.onPress ?? onClose}
                  fullWidth
                />
              ))}
              {dismissLabel ? (
                <Button title={dismissLabel} variant="ghost" onPress={onClose} fullWidth size="sm" />
              ) : null}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    // The sheet must always sit above the floating tab bar on native and web.
    root: { flex: 1, justifyContent: 'flex-end', zIndex: 9999, elevation: 9999 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    sheet: {
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
      overflow: 'hidden',
    },
    handleZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    iconPlate: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flexGrow: 0, paddingTop: spacing.xs },
    footer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
    actions: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
  });

/** Small list row used inside option sheets (never a native action sheet). */
export function SheetOption({
  label,
  description,
  icon,
  selected,
  onPress,
  right,
}: {
  label: string;
  description?: string;
  icon?: IconName;
  selected?: boolean;
  onPress: () => void;
  right?: React.ReactNode;
}): React.ReactElement | null {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 12,
          borderRadius: radius.md,
          backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceAlt : 'transparent',
          borderWidth: 1,
          borderColor: selected ? c.primary : 'transparent',
          marginTop: spacing.listGap,
        },
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? c.primary : c.surfaceAlt,
          }}
        >
          <Icon name={icon} size={17} color={selected ? c.onPrimary : c.textSecondary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="title" weight={selected ? 'bold' : 'semibold'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color={c.textSecondary} style={{ marginTop: 1 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {right ?? (selected ? <Icon name="circleCheck" size={18} color={c.primary} filled /> : null)}
    </Pressable>
  );
}
