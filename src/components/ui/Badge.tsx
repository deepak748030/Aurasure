import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { IconName } from '@/types';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'food';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.ink[100], fg: colors.textSecondary },
  brand: { bg: colors.brand[50], fg: colors.brand[700] },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  food: { bg: colors.food[50], fg: colors.food[700] },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

export function Badge({ label, tone = 'neutral', icon, style, size = 'sm' }: BadgeProps): React.ReactElement {
  const t = TONE[tone];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: t.bg,
          borderRadius: radius.pill,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? 8 : 10,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text variant="overline" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}
