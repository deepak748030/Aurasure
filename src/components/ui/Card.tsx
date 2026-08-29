import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radiusSize?: number;
  variant?: 'surface' | 'alt';
}

export function Card({
  children,
  style,
  padding = spacing.md,
  radiusSize = radius.md,
  variant = 'surface',
}: CardProps): React.ReactElement {
  return (
    <View
      style={[
        {
          backgroundColor: variant === 'surface' ? colors.surface : colors.surfaceAlt,
          borderRadius: radiusSize,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
