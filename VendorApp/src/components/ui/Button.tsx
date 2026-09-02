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

// Pill shapes at every size (borderRadius 999 + generous vertical padding).
const SIZE: Record<Size, { height: number; pad: number; variant: 'button' | 'title' | 'subtitle'; icon: number }> = {
  sm: { height: 42, pad: 0, variant: 'subtitle', icon: 16 },
  md: { height: 50, pad: 0, variant: 'button', icon: 18 },
  lg: { height: 62, pad: 0, variant: 'button', icon: 20 },
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
  secondary: '#8B0057',
  ghost: colors.textSecondary,
};

// Flat (non-gradient) variants borrow the Sign In button's skin from the More
// screen: soft plum fill, thin plum outline, fully rounded.
const FLAT: Record<'secondary' | 'ghost', { bg: string; border: string }> = {
  secondary: { bg: '#FAF0F9', border: '#E4BBD8' },
  ghost: { bg: colors.surface, border: colors.border },
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
  /** Stretches across the row. On by default - CTAs are full width app-wide. */
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
  const isFlat = variant === 'secondary' || variant === 'ghost';
  const flat = isFlat ? FLAT[variant as 'secondary' | 'ghost'] : undefined;

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
        // A single width source: when fullWidth, the button occupies 100% of its
        // parent's width. This is the only thing that decides width, so any two
        // fullWidth buttons in the same container always match exactly — even
        // when their label/icon lengths or fills (border vs no border) differ.
        {
          width: fullWidth ? '100%' : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          height: s.height,
          paddingHorizontal: s.pad,
          borderRadius: radius.pill,
          opacity: disabled || loading ? 0.5 : pressed ? 0.94 : 1,
          // Gradient variants fall back to their first stop when disabled,
          // since the gradient layer is skipped for the dimmed state.
          backgroundColor: flat ? flat.bg : disabled ? GRADIENT[variant][0] : 'transparent',
          borderWidth: flat ? 1 : 0,
          borderColor: flat ? flat.border : 'transparent',
          // Keep a full-width button from ever being clipped by long content.
          minWidth: fullWidth ? 0 : 120,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.inner}>
          {!isFlat && !disabled && (
            <LinearGradient
              colors={GRADIENT[variant]}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.row} pointerEvents="none">
            {loading ? (
              <View style={styles.row}>
                <ActivityIndicator color={textColor} style={styles.leftIcon} />
                <Text variant={s.variant} color={textColor} weight="bold" numberOfLines={1} style={styles.label}>
                  {title}
                </Text>
              </View>
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
  label: { textAlign: 'center', letterSpacing: 0.2, maxWidth: '100%' },
});
