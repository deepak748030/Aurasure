import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from 'react-native';
import { typography, type FontWeightKey, type TypographyVariant } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeContext';

const WEIGHT: Record<FontWeightKey, RNTextProps['style'] extends never ? never : '400' | '500' | '600' | '700' | '800'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export interface TextProps extends Omit<RNTextProps, 'style'> {
  style?: StyleProp<TextStyle>;
  variant?: TypographyVariant;
  weight?: FontWeightKey;
  /** Explicit colour wins over `tone`. */
  color?: string;
  tone?: 'default' | 'muted' | 'faint' | 'primary' | 'danger' | 'success' | 'onPrimary' | 'warning' | 'plain';
  center?: boolean;
}

export function Text({
  variant = 'body',
  weight,
  color,
  tone = 'default',
  center,
  style,
  children,
  ...rest
}: TextProps): React.ReactElement {
  const c = useColors();
  const t = typography[variant];
  const toneColor =
    color ??
    (tone === 'plain'
      ? undefined
      : tone === 'muted'
      ? c.textSecondary
      : tone === 'faint'
        ? c.textTertiary
        : tone === 'primary'
          ? c.primary
          : tone === 'danger'
            ? c.danger
            : tone === 'warning'
              ? c.warning
              : tone === 'success'
                ? c.success
                : tone === 'onPrimary'
                  ? c.onPrimary
                  : c.text);

  return (
    <RNText
      accessibilityRole="text"
      style={[
        {
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          fontWeight: WEIGHT[weight ?? t.weight],
          color: toneColor,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
