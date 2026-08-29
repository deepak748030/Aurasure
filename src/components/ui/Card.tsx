import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radiusSize?: number;
  variant?: 'surface' | 'alt';
  /**
   * Flat cards are separated by a hairline border instead of a drop shadow.
   * Pass false when the card sits on a contrasting background and needs no edge.
   */
  elevated?: boolean;
}

export function Card({
  children,
  style,
  padding = spacing.md,
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
        // Flat separation: a hairline edge instead of a drop shadow. Tinted
        // (alt) cards already read as a separate layer, so they stay borderless.
        elevated && variant === 'surface' ? styles.border : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  border: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
