import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, type DimensionValue, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height = 14, radius = 8, style }: SkeletonProps): React.ReactElement {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.ink[100] }, { opacity }, style]}
    />
  );
}
