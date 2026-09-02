import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import type { IconName } from '@/types';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  /** Custom right-side node; takes precedence over actionLabel/onAction. */
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, subtitle, icon, actionLabel, onAction, action, style }: SectionHeaderProps): React.ReactElement {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon ? <Icon name={icon} size={18} color={colors.brand[600]} style={{ marginRight: 8 }} /> : null}
        <View>
          <Text variant="h3" weight="bold" color={colors.text}>
            {title}
          </Text>
          {subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ?? (actionLabel ? (
        <Pressable
          onPress={onAction}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 10 }}
        >
          <Text variant="caption" color={colors.brand[700]} weight="semibold">
            {actionLabel}
          </Text>
          <Icon name="chevronRight" size={14} color={colors.brand[700]} />
        </Pressable>
      ) : null)}
    </View>
  );
}
