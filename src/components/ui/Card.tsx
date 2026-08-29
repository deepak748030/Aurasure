import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, shadow } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radiusSize?: number;
  variant?: 'surface' | 'alt';
  elevated?: boolean;
}

export function Card({
  children,
  style,
  padding = 16,
  radiusSize = radius.md,
  variant = 'surface',
  elevated = true,
}: CardProps): React.ReactElement {
  return (
    <View
      style={[
        {
          backgroundColor: variant === 'surface' ? colors.surface : colors.surfaceAlt,
          borderRadius: radiusSize,
          padding,
        },
        elevated ? shadow.sm : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
