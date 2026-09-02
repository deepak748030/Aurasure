import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { colors } from '@/theme/colors';
import { layout, radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { ImageRef } from '@/types';

interface BannerCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  image: ImageRef;
  height?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * true  -> the banner touches the left/right device edges (negative margin
   *          cancels the screen gutter, no side radius) - the default.
   * false -> keep the small radius and stay inside the gutter.
   */
  fullBleed?: boolean;
}

export function BannerCard({
  title,
  subtitle,
  badge,
  image,
  height = 150,
  onPress,
  style,
  fullBleed = true,
}: BannerCardProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.card,
        { height, opacity: pressed ? 0.96 : 1 },
        // Pull out of the screen gutter so the artwork is flush with the device edges.
        fullBleed
          ? { marginHorizontal: -layout.contentHorizontalPadding, borderRadius: 0 }
          : { borderRadius: radius.lg },
        style,
      ]}
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
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
});
