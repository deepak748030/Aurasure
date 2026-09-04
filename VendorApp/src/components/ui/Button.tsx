import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'login';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { height: number; variant: 'button' | 'title' | 'subtitle'; icon: number }> = {
  sm: { height: 42, variant: 'subtitle', icon: 16 },
  md: { height: 50, variant: 'button', icon: 18 },
  lg: { height: 62, variant: 'button', icon: 20 },
};

// Flat solid background for every variant — no gradients
const BG_COLOR: Record<Variant, string> = {
  primary: colors.brand[600],
  login: colors.brand[800],
  success: colors.success,
  danger: colors.danger,
  secondary: colors.brand[50],
  ghost: colors.surface,
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.white,
  login: colors.white,
  success: colors.white,
  danger: colors.white,
  secondary: colors.brand[700],
  ghost: colors.textSecondary,
};

const BORDER_COLOR: Record<Variant, string | undefined> = {
  primary: undefined,
  login: undefined,
  success: undefined,
  danger: undefined,
  secondary: colors.brand[200],
  ghost: colors.border,
};

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: IconName;
  rightIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps): React.ReactElement {
  const s = SIZE[size];
  const textColor = TEXT_COLOR[variant];
  const bgColor = BG_COLOR[variant];
  const borderColor = BORDER_COLOR[variant];

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        haptic.light();
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          height: s.height,
          borderRadius: radius.pill,
          backgroundColor: bgColor,
          opacity: disabled || loading ? 0.5 : pressed ? 0.88 : 1,
          borderWidth: borderColor ? 1 : 0,
          borderColor: borderColor,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          minWidth: fullWidth ? 0 : 120,
        },
        style,
      ]}
    >
      <View style={styles.row} pointerEvents="none">
        {loading ? (
          <>
            <ActivityIndicator color={textColor} style={styles.leftIcon} />
            <Text variant={s.variant} color={textColor} weight="bold" numberOfLines={1} style={styles.label}>
              {title}
            </Text>
          </>
        ) : (
          <>
            {leftIcon ? <Icon name={leftIcon} size={s.icon} color={textColor} style={styles.leftIcon} /> : null}
            <Text variant={s.variant} color={textColor} weight="bold" numberOfLines={1} style={styles.label}>
              {title}
            </Text>
            {rightIcon ? <Icon name={rightIcon} size={s.icon} color={textColor} style={styles.rightIcon} /> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
  label: { textAlign: 'center', letterSpacing: 0.2 },
});
