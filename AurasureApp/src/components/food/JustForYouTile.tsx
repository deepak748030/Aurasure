import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { FoodVibe } from '@/types';

interface JustForYouTileProps {
  vibe: FoodVibe;
  onPress: (vibe: FoodVibe) => void;
}

/** Skeleton twin of a collection tile - same 122px-tall rounded block. */
export function JustForYouTileSkeleton(): React.ReactElement {
  return <Skeleton width="100%" height={122} radius={radius.lg} />;
}

/**
 * Big coloured collection tile ("Litti Chokha", "Veg Biryani"...) with the
 * dish photo on a brand gradient and an "Explore more" pill - part of the
 * Just for You grid, tap opens every item of the vibe.
 */
export function JustForYouTile({ vibe, onPress }: JustForYouTileProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress(vibe);
      }}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.94 : 1 }]}
    >
      <LinearGradient colors={[vibe.from, vibe.to]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.photoWrap}>
        <SmartImage source={vibe.image} style={styles.photo} contentFit="cover" />
      </View>
      <View style={styles.content}>
        <View style={styles.explore}>
          <Text variant="overline" color={colors.ink[700]} weight="bold">
            EXPLORE MORE
          </Text>
          <Icon name="arrowRight" size={11} color={colors.ink[700]} style={{ marginLeft: 3 }} />
        </View>
        <Text variant="title" weight="bold" color={colors.white} numberOfLines={1} style={{ marginTop: 6 }}>
          {vibe.name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'relative',
    height: 122,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoWrap: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  photo: {
    width: 80,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  explore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
});
