import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'login';
type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { height: number; pad: number; variant: 'button' | 'title' | 'subtitle'; icon: number }> = {
  sm: { height: 38, pad: 14, variant: 'subtitle', icon: 16 },
  md: { height: 46, pad: 18, variant: 'button', icon: 18 },
  lg: { height: 54, pad: 22, variant: 'button', icon: 20 },
};

const GRADIENT: Record<Variant, [string, string]> = {
  primary: colors.brandGradient,
  login: ['#A4006B', '#72003F'],
  success: ['#16A34A', '#0E9F88'],
  danger: ['#EF4444', '#DC2626'],
  secondary: [colors.surfaceAlt, colors.surfaceAlt],
  ghost: [colors.brand[50], colors.brand[50]],
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.white,
  login: colors.white,
  success: colors.white,
  danger: colors.white,
  secondary: colors.text,
  ghost: colors.brand[700],
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
  fullWidth = false,
  style,
}: ButtonProps): React.ReactElement {
  const s = SIZE[size];
  const textColor = TEXT_COLOR[variant];
  const isFlat = variant === 'secondary' || variant === 'ghost';

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        haptic.light();
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.pad,
          borderRadius: radius.md,
          opacity: disabled || loading ? 0.5 : pressed ? 0.94 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: isFlat ? GRADIENT[variant][0] : 'transparent',
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.inner}>
          {!isFlat && !disabled && (
            <LinearGradient
              colors={GRADIENT[variant]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.row} pointerEvents="none">
            {loading ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <>
                {leftIcon ? (
                  <Icon name={leftIcon} size={s.icon} color={textColor} style={styles.leftIcon} />
                ) : null}
                <Text variant={s.variant} color={textColor} weight="semibold">
                  {title}
                </Text>
                {rightIcon ? (
                  <Icon name={rightIcon} size={s.icon} color={textColor} style={styles.rightIcon} />
                ) : null}
              </>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
});
