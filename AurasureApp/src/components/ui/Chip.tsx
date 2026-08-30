import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

interface ChipProps {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress?: () => void;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, icon, active = false, onPress, activeColor, style }: ChipProps): React.ReactElement {
  const tint = activeColor ?? colors.brand[600];
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          backgroundColor: active ? tint : colors.surface,
          borderWidth: 1,
          borderColor: active ? tint : colors.border,
          paddingVertical: 8,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon ? <Icon name={icon} size={15} color={active ? colors.white : colors.textSecondary} style={{ marginRight: 6 }} /> : null}
        <Text variant="caption" color={active ? colors.white : colors.textSecondary} weight="semibold">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
