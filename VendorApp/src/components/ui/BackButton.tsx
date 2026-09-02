import React from 'react';
import { Pressable } from 'react-native';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

export function BackButton({ onPress }: { onPress: () => void }): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name="chevronLeft" size={20} color={colors.text} />
    </Pressable>
  );
}
