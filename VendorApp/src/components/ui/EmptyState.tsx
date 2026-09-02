import React from 'react';
import { View } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '@/theme/colors';
import type { IconName } from '@/types';

export function EmptyState({
  icon = 'package',
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: colors.brand[50],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={32} color={colors.brand[600]} />
      </View>
      <Text variant="h3" weight="bold" style={{ marginTop: 16, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6, textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 18 }} /> : null}
    </View>
  );
}
