import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * Leaf component (no imports from Primitives/ErrorState) so both of those
 * modules can depend on it without creating a require cycle.
 */
export function EmptyState({
  icon = 'package',
  title,
  subtitle,
  actionLabel,
  onAction,
  compact,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 44, paddingHorizontal: 24, gap: spacing.sm }}>
      <View
        style={{
          width: compact ? 54 : 72,
          height: compact ? 54 : 72,
          borderRadius: radius.xxl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.primarySoft,
        }}
      >
        <Icon name={icon} size={compact ? 24 : 32} color={c.primary} />
      </View>
      <Text variant="h3" weight="bold" center>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodySm" tone="muted" center>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic.medium();
            onAction?.();
          }}
          style={{
            marginTop: 4,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: radius.pill,
            backgroundColor: c.primary,
          }}
        >
          <Text variant="subtitle" weight="bold" color={c.onPrimary}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
