import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

/**
 * The app never shows a spinner-only screen and never `Alert`s. Async blocks
 * paint a pulsing skeleton that matches the shape of the content that is about
 * to arrive, so the layout never jumps when data lands.
 */

interface PulseProps {
  width?: DimensionValue;
  height?: DimensionValue;
  round?: boolean;
  radiusOverride?: number;
  style?: ViewStyle;
}

export function Pulse({ width = '100%', height = 14, round = false, radiusOverride, style }: PulseProps): React.ReactElement {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radiusOverride ?? (round ? 999 : radius.xs),
          backgroundColor: c.shimmerFrom,
          overflow: 'hidden',
        },
        { opacity },
        style,
      ]}
    />
  );
}

export function SkeletonText({ lines = 2, width }: { lines?: number; width?: DimensionValue }): React.ReactElement {
  return (
    <View style={{ gap: 6 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Pulse key={index} height={index === 0 ? 14 : 11} width={index === lines - 1 && lines > 1 ? '62%' : width ?? '100%'} />
      ))}
    </View>
  );
}

/** Square media block (item / store thumbnail). */
export function SkeletonThumb({ size = 76, style }: { size?: number; style?: ViewStyle }): React.ReactElement {
  return <Pulse width={size} height={size} radiusOverride={radius.md} style={style} />;
}

export function SkeletonCard({ height = 168 }: { height?: number }): React.ReactElement {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Pulse height={height} radiusOverride={radius.md} />
      <Pulse height={13} width="70%" />
      <Pulse height={11} width="45%" />
    </View>
  );
}

export function SkeletonRail({ count = 3, cardWidth = 172, height = 190 }: { count?: number; cardWidth?: number; height?: number }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.railGap, paddingHorizontal: spacing.edge }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ width: cardWidth }}>
          <SkeletonCard height={height - 66} />
        </View>
      ))}
    </View>
  );
}

/**
 * Zero-gap list skeleton: rows touch each other exactly like the real
 * `ListRow`s do, separated only by a hairline.
 */
export function SkeletonList({
  rows = 6,
  thumb = 60,
  withDivider = true,
}: {
  rows?: number;
  thumb?: number;
  withDivider?: boolean;
}): React.ReactElement {
  const c = useColors();
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.sm,
            marginTop: index === 0 ? 0 : spacing.listGap,
            backgroundColor: c.surface,
            borderBottomWidth: withDivider && index < rows - 1 ? 1 : 0,
            borderBottomColor: c.divider,
          }}
        >
          <Pulse width={thumb} height={thumb} radiusOverride={radius.md} />
          <View style={{ flex: 1, gap: 6 }}>
            <Pulse height={13} width="58%" />
            <Pulse height={10} width="36%" />
          </View>
          <Pulse width={54} height={22} radiusOverride={radius.pill} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonRowSimple({ label = 'Loading' }: { label?: string }): React.ReactElement {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.edge,
      }}
      accessibilityLabel={label}
    >
      <Pulse width={30} height={30} round />
      <View style={{ flex: 1, gap: 5 }}>
        <Pulse height={12} width="50%" />
        <Pulse height={9} width="30%" />
      </View>
      <Pulse width={22} height={12} />
    </View>
  );
}

/** Header block used by every detail screen while its hero loads. */
export function SkeletonHero({ height = 190 }: { height?: number }): React.ReactElement {
  return (
    <View style={{ paddingHorizontal: spacing.edge }}>
      <Pulse height={height} radiusOverride={radius.lg} />
      <View style={{ height: spacing.sm }} />
      <Pulse height={18} width="55%" />
      <View style={{ height: 6 }} />
      <Pulse height={12} width="32%" />
    </View>
  );
}

/** Small helper so screens can delay a skeleton the same way everywhere. */
export function useMinDuration(loading: boolean, ms = 320): boolean {
  const [show, setShow] = useState(loading);
  useEffect(() => {
    if (loading) {
      setShow(true);
      return;
    }
    const timer = setTimeout(() => setShow(false), ms);
    return () => clearTimeout(timer);
  }, [loading, ms]);
  return show;
}
