import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';
import { typography, type FontWeightKey, type TypographyVariant } from '@/theme/tokens';
import { FONT_FAMILIES } from '@/lib/fonts';
import { colors } from '@/theme/colors';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypographyVariant;
  weight?: FontWeightKey;
  color?: string;
  style?: RNTextProps['style'];
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  weight,
  color = colors.text,
  style,
  children,
  ...rest
}: TextProps): React.ReactElement {
  const t = typography[variant];
  const fontFamily = FONT_FAMILIES[weight ?? t.weight];
  return (
    <RNText
      style={[
        {
          fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
