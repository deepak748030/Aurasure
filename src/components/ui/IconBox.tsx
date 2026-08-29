import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { IconName } from '@/types';

interface IconBoxProps {
  icon: IconName;
  size?: number;
  radiusSize?: number;
  tint?: string;
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconBox({
  icon,
  size = 44,
  radiusSize,
  tint,
  iconColor,
  iconSize,
  style,
}: IconBoxProps): React.ReactElement {
  // Flat, tight corners - was Math.min(14, ...) which read as a rounded square.
  const r = radiusSize ?? Math.min(radius.md, Math.round(size / 3));
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: tint ?? colors.brand[50],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.44)} color={iconColor ?? colors.brand[600]} filled />
    </View>
  );
}
