import React from 'react';
import { View } from 'react-native';
import { IconBox } from './IconBox';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { IconName } from '@/types';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  tint?: string;
}

export function EmptyState({ icon = 'package', title, subtitle, actionLabel, onAction, tint }: EmptyStateProps): React.ReactElement {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 32 }}>
      <IconBox icon={icon} size={76} radiusSize={radius.lg} tint={tint ?? colors.brand[50]} iconColor={colors.brand[500]} iconSize={34} />
      <Text variant="h3" weight="bold" color={colors.text} style={{ marginTop: 20, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} leftIcon="arrowRight" style={{ marginTop: 20 }} /> : null}
    </View>
  );
}
