import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { SkeletonHero } from '@/components/ui/Skeleton';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { Banner } from '@/types';

/**
 * `banner_view_widget.dart`: full-bleed carousel, height = width * 0.45,
 * 7s auto-play, dot indicator. Cards here are flush (0 radius) because the
 * section touches both screen edges.
 */
export function BannerCarousel({ banners, onPress }: { banners: Banner[]; onPress: (banner: Banner) => void }): React.ReactElement {
  const c = useColors();
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Banner> | null>(null);
  const height = Math.round(width * 0.45);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);

  const scrollTo = useCallback(
    (next: number) => {
      if (banners.length === 0) return;
      const wrapped = ((next % banners.length) + banners.length) % banners.length;
      listRef.current?.scrollToIndex({ index: wrapped, animated: true, viewPosition: 0.5 });
      setIndex(wrapped);
    },
    [banners.length],
  );

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => scrollTo(index + 1), 7000);
    return () => clearInterval(timer);
  }, [banners.length, index, scrollTo]);

  const onLayout = (event: LayoutChangeEvent): void => {
    const laid = Math.round(event.nativeEvent.layout.width);
    if (laid > 0 && laid !== width) setWidth(laid);
  };

  if (banners.length === 0) return <SkeletonHero height={height} />;

  return (
    <View style={{ backgroundColor: c.bg }} onLayout={onLayout}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => { haptic.light(); onPress(item); }} style={{ width, height }}>
            <View style={{ width, height }}>
              <SmartImage source={item.image} name={item.title} style={{ width, height }} radiusOverride={radius.flush} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: 'rgba(20,6,20,0.30)' }}>
                {item.badge ? (
                  <View style={{ alignSelf: 'flex-start', marginBottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: c.secondary }}>
                    <Text variant="micro" weight="semibold" color="#10241D">
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
                <Text variant="h3" weight="semibold" color={c.white} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.86)" numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={<View style={{ width: 0 }} />}
      />
      {banners.length > 1 ? (
        <View style={{ position: 'absolute', bottom: spacing.sm, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          {banners.map((banner, i) => (
            <View
              key={banner.id}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: i === index ? c.white : 'rgba(255,255,255,0.55)',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Small promo strip under the banner when there is nothing to carousel. */
export function BannerStrip({ banner }: { banner: Banner }): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.edge, paddingVertical: 6, backgroundColor: c.surfaceHi }}>
      <Icon name="megaphone" size={14} color={c.primary} />
      <Text variant="caption" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
        {banner.title}
      </Text>
    </View>
  );
}
