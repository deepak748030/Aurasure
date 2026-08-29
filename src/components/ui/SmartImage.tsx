import React from 'react';
import { View, type ImageStyle, type StyleProp } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import type { IconName, ImageRef } from '@/types';

interface SmartImageProps {
  source: ImageRef;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholderIcon?: IconName;
  iconSize?: number;
  tint?: string;
}

export function SmartImage({
  source,
  style,
  contentFit = 'cover',
  placeholderIcon = 'image',
  iconSize = 26,
  tint,
}: SmartImageProps): React.ReactElement {
  if (!source) {
    return (
      <View style={[styles.placeholder, style]}>
        <Icon name={placeholderIcon} size={iconSize} color={tint ?? colors.brand[300]} strokeWidth={1.6} />
      </View>
    );
  }
  const expoSource = source.kind === 'asset' ? source.source : { uri: source.uri };
  return (
    <ExpoImage source={expoSource} contentFit={contentFit} style={style} cachePolicy="memory-disk" transition={160} />
  );
}

const styles = {
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
  },
} as const;
