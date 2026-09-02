import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';

/**
 * Round "see all" arrow used on the right side of section headers
 * (Most popular, Special offers, New on Aurasure...).
 */
export function SeeAllArrow({ onPress }: { onPress: () => void }): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="See all"
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name="arrowRight" size={16} color={colors.brand[700]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
