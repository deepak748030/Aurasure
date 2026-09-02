import React, { useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { BannerCard } from '../common/BannerCard';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { Banner } from '@/types';

interface BannerCarouselProps {
  banners: Banner[];
  onPress: (banner: Banner) => void;
  height?: number;
}

/**
 * Full-bleed banner carousel: the carousel stretches edge-to-edge of the
 * screen (cancelling the 6px screen gutter), every slide is one screen width
 * and the artwork touches the left/right device edges with no side radius.
 * Pages one at a time and shows a small progress dot row underneath.
 */
export function BannerCarousel({ banners, onPress, height = 150 }: BannerCarouselProps): React.ReactElement | null {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (!banners.length) return null;

  const onLayout = (e: LayoutChangeEvent): void => setWidth(e.nativeEvent.layout.width);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (width <= 0) return;
    const next = Math.max(0, Math.min(banners.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    setIndex(next);
  };

  return (
    <View style={{ marginHorizontal: -layout.contentHorizontalPadding }} onLayout={onLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {banners.map((banner) => (
          <View key={banner.id} style={{ width }}>
            <BannerCard
              title={banner.title}
              subtitle={banner.subtitle}
              badge={banner.badge}
              image={banner.image}
              height={height}
              fullBleed={false}
              style={{ borderRadius: 0 }}
              onPress={() => {
                haptic.light();
                onPress(banner);
              }}
            />
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
        {banners.map((banner, i) => (
          <View
            key={banner.id}
            style={{
              width: i === index ? 18 : 6,
              height: 6,
              borderRadius: 3,
              marginHorizontal: 3,
              backgroundColor: i === index ? colors.brand[500] : colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function BannerCarouselSkeleton({
  height = 150,
}: {
  height?: number;
}): React.ReactElement {
  return (
    <View
      style={{
        marginHorizontal: -layout.contentHorizontalPadding,
        height: height + 16,
        borderRadius: 0,
        backgroundColor: colors.brand[50],
        opacity: 0.6,
      }}
    />
  );
}
