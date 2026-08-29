import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { colors } from '@/theme/colors';
import { radius, shadow } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { ImageRef } from '@/types';

interface BannerCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  image: ImageRef;
  height?: number;
  onPress?: () => void;
}

export function BannerCard({ title, subtitle, badge, image, height = 150, onPress }: BannerCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={({ pressed }) => [styles.card, { height, opacity: pressed ? 0.96 : 1 }]}
    >
      <SmartImage source={image} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(11,16,32,0.04)', 'rgba(11,16,32,0.66)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {badge ? <Badge label={badge} tone="brand" style={{ marginBottom: 8 }} /> : null}
        <Text variant="h2" weight="bold" color={colors.white}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subtitle" color="rgba(255,255,255,0.9)" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadow.sm,
  },
  content: {
    padding: 16,
  },
});
