import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/ui/Primitives';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

/** Inline error card (never an alert). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ margin: spacing.edge, padding: spacing.sm }}>
      <EmptyState icon="wifiOff" title="Something went wrong" subtitle={message} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry} />
    </View>
  );
}
