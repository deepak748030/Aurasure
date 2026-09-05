import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dark' | 'light';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, { height: number; pad: number; icon: number; variant: 'button' | 'title' | 'subtitle' }> = {
  sm: { height: 38, pad: spacing.sm, icon: 15, variant: 'subtitle' },
  md: { height: 48, pad: spacing.md, icon: 18, variant: 'button' },
  lg: { height: 56, pad: spacing.lg, icon: 20, variant: 'button' },
};

export interface ButtonProps {
  /** Either `title` or `label` may be used; both render the same text. */
  title?: string;
  label?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Squared buttons for compact rows; pills (default) for CTAs. */
  squared?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/** Every tappable action in the app. No native alerts, no system menus. */
export function Button({
  title,
  label,
  onPress,
  onLongPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  squared,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps): React.ReactElement {
  const c = useColors();
  const s = SIZES[size];

  const bg =
    variant === 'primary'
      ? c.primary
      : variant === 'secondary'
        ? c.primarySoft
        : variant === 'danger'
          ? c.danger
          : variant === 'success'
            ? c.success
            : variant === 'dark'
              ? c.primaryDeep
              : variant === 'light'
                ? c.white
                : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger' || variant === 'success' || variant === 'dark'
      ? c.onPrimary
      : variant === 'light'
        ? c.primary
        : variant === 'secondary'
          ? c.primary
          : c.textSecondary;
  const border = variant === 'ghost' ? c.border : variant === 'light' ? c.border : 'transparent';

  const isDisabled = Boolean(disabled) || Boolean(loading);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      onPress={() => {
        if (isDisabled) return;
        haptic.light();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.pad,
          borderRadius: squared ? radius.md : radius.pill,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'ghost' || variant === 'light' ? 1 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={s.icon} color={fg} /> : null}
          <Text variant={s.variant} weight="bold" color={fg} numberOfLines={1} style={{ marginHorizontal: icon || iconRight ? 4 : 0 }}>
            {title ?? label}
          </Text>
          {iconRight ? <Icon name={iconRight} size={s.icon} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

/** Round icon-only control (header actions, qty steppers, close buttons). */
export function IconButton({
  name,
  onPress,
  size = 38,
  iconSize = 18,
  tone = 'surface',
  badge,
  filled,
  disabled,
  accessibilityLabel,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  tone?: 'surface' | 'primary' | 'ghost' | 'danger' | 'translucent';
  badge?: number;
  filled?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  const bg =
    tone === 'primary' ? c.primary : tone === 'danger' ? c.dangerBg : tone === 'surface' ? c.surface : tone === 'translucent' ? `${c.white}CC` : 'transparent';
  const fg = tone === 'primary' || tone === 'danger' ? (tone === 'danger' ? c.danger : c.onPrimary) : c.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      disabled={disabled}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: tone === 'ghost' || tone === 'surface' || tone === 'translucent' ? 1 : 0,
          borderColor: tone === 'translucent' ? `${c.white}55` : c.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={fg} filled={filled} />
      {typeof badge === 'number' && badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: c.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: c.surface,
          }}
        >
          <Text variant="micro" weight="bold" color={c.white}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
