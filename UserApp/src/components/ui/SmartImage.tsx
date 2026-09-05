import React, { useState } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { Icon, type IconName } from '@/lib/icons';
import { Text } from './Text';
import { useColors } from '@/theme/ThemeContext';
import { radius } from '@/theme/tokens';
import type { ImageRef } from '@/types';

/**
 * Every remote image in the app goes through here: server `ImageRef` in,
 * skeleton-while-loading + branded placeholder-on-error out. Nothing else
 * renders a network image, so no screen ever shows a grey dead box.
 */

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TINTS = ['#F4E7F0', '#E9F7F3', '#FFF3E2', '#EAF4FE', '#F3ECFF', '#FDEDEC'];

interface SmartImageProps {
  source: ImageRef | undefined | null;
  /** Fallback label (usually the store/item name) drawn when there is no image. */
  name?: string;
  icon?: IconName;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  radiusOverride?: number;
  rounded?: boolean;
}

export function SmartImage({
  source,
  name,
  icon = 'image',
  style,
  contentFit = 'cover',
  radiusOverride,
  rounded,
}: SmartImageProps): React.ReactElement {
  const c = useColors();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const uri = source?.kind === 'uri' ? source.uri : null;

  const corner = radiusOverride ?? (rounded ? radius.pill : radius.md);

  if (!uri || failed) {
    const tint = TINTS[hashSeed(name ?? 'aurasure') % TINTS.length] ?? TINTS[0] ?? '#EFE7EE';
    return (
      <View
        style={[
          styles.fill,
          { backgroundColor: c.isDark ? c.surfaceAlt : tint, borderRadius: corner },
          style as object,
        ]}
      >
        {name ? (
          <Text variant="caption" weight="bold" color={c.primary} center numberOfLines={3} style={{ padding: 6, opacity: 0.85 }}>
            {name}
          </Text>
        ) : (
          <Icon name={icon} size={22} color={c.textTertiary} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { borderRadius: corner }, style as object]}>
      {loading ? (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: c.surfaceAlt }]}>
          <Icon name="image" size={18} color={c.textTertiary} />
        </View>
      ) : null}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={220}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        accessibilityLabel={name ? `${name} photo` : 'Photo'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
