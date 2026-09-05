import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/lib/icons';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

/**
 * Map surface for the location screen, store map and order tracking.
 *
 * Deliberately rendered from primitives (no native map SDK, no API key, works
 * in Expo Go and on web): a vector-looking street grid that pans with the
 * finger, a pulsing user dot and pins for the outlets. It behaves like the
 * reference app's map card — tap it to re-centre, drag it to look around — and
 * sits flush (0 radius, 0 gutter) per the design rules.
 */

export interface MapMarker {
  id: string;
  label: string;
  /**
   * 0..1 position on the canvas. Callers compute this with `lib/geo` from real
   * lat/lng — never from grid slots or index maths.
   */
  x: number;
  y: number;
  icon?: IconName;
  tone?: 'primary' | 'success' | 'danger';
  active?: boolean;
}

interface MapSurfaceProps {
  height?: number;
  markers?: MapMarker[];
  userLabel?: string;
  onCenterPress?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
  overlay?: React.ReactNode;
  footer?: React.ReactNode;
  showControls?: boolean;
  recentering?: boolean;
  /** Pulsing "you" dot at the centre. Hide it when there is no device fix. */
  showUserDot?: boolean;
}

export function MapSurface({
  height = 220,
  markers = [],
  userLabel = 'You are here',
  onCenterPress,
  onMarkerPress,
  overlay,
  footer,
  showControls = true,
  recentering = false,
  showUserDot = true,
}: MapSurfaceProps): React.ReactElement {
  const c = useColors();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Do not capture a plain tap: markers and the recenter chip must remain
        // pressable. Take ownership only after the finger has actually moved.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => pan.setOffset({ x: offsetRef.current.x, y: offsetRef.current.y }),
        onPanResponderMove: (_evt, gesture) => {
          pan.setValue({ x: gesture.dx, y: clamp(gesture.dy, -60, 60) });
        },
        onPanResponderRelease: (_evt, gesture) => {
          offsetRef.current = {
            x: clamp(offsetRef.current.x + gesture.dx, -48, 48),
            y: clamp(offsetRef.current.y + gesture.dy, -32, 32),
          };
          pan.flattenOffset();
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, speed: 18 }).start();
        },
      }),
    [pan],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const tone = (value: MapMarker['tone']): string => (value === 'success' ? c.success : value === 'danger' ? c.danger : c.primary);

  return (
    <View style={[styles.root, { height, backgroundColor: c.mapBase }, { borderColor: c.border }]}>
      <Animated.View {...panResponder.panHandlers} style={[StyleSheet.absoluteFill, { transform: pan.getTranslateTransform() }]}>
        {/* blocks */}
        <View style={styles.grid}>
          {BLOCKS.map((block, index) => (
            <View
              key={`b-${index}`}
              style={{
                position: 'absolute',
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.w}%`,
                height: `${block.h}%`,
                backgroundColor: c.mapBlock,
                borderRadius: 3,
                opacity: block.park ? 1 : 0.75,
              }}
            />
          ))}
        </View>

        {/* roads */}
        {ROADS_V.map((road, index) => (
          <View
            key={`rv-${index}`}
            style={{
              position: 'absolute',
              left: `${road.pos}%`,
              top: -40,
              bottom: -40,
              width: road.major ? 9 : 4,
              backgroundColor: c.mapRoad,
              transform: [{ rotate: `${road.tilt ?? 0}deg` }],
            }}
          />
        ))}
        {ROADS_H.map((road, index) => (
          <View
            key={`rh-${index}`}
            style={{
              position: 'absolute',
              top: `${road.pos}%`,
              left: -40,
              right: -40,
              height: road.major ? 9 : 4,
              backgroundColor: c.mapRoad,
              transform: [{ rotate: `${road.tilt ?? 0}deg` }],
            }}
          />
        ))}

        {/* user dot */}
        {showUserDot ? (
        <View style={[styles.userWrap, { left: '50%', top: '50%' }]}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 58,
              height: 58,
              borderRadius: radius.pill,
              backgroundColor: c.primarySoft,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] }) }],
            }}
          />
          <View style={[styles.userDot, { borderColor: c.white, backgroundColor: c.primary }]} />
        </View>
        ) : null}

        {markers.map((marker) => (
          <Pressable
            key={marker.id}
            accessibilityRole="button"
            accessibilityLabel={marker.label}
            onPress={() => onMarkerPress?.(marker)}
            style={[styles.marker, { left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }]}
          >
            <View
              style={[
                styles.markerPin,
                {
                  backgroundColor: marker.active ? tone(marker.tone) : c.surface,
                  borderColor: tone(marker.tone),
                  transform: [{ scale: marker.active ? 1.1 : 1 }],
                },
              ]}
            >
              <Icon name={marker.icon ?? 'store'} size={13} color={marker.active ? c.white : tone(marker.tone)} />
            </View>
            <View style={[styles.markerTip, { borderColor: tone(marker.tone) }]} />
          </Pressable>
        ))}
      </Animated.View>

      {overlay ? <View style={StyleSheet.absoluteFill}>{overlay}</View> : null}

      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onCenterPress}
          style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? c.sheet : c.sheet, borderColor: c.border }]}
        >
          <Icon name="crosshairs" size={13} color={c.primary} />
          <Text variant="micro" weight="semibold" color={c.text}>
            {userLabel}
          </Text>
        </Pressable>
      </View>

      {showControls ? (
        <View style={styles.controls}>
          <ControlButton icon="plus" onPress={() => Animated.spring(pan, { toValue: { x: 0, y: -18 }, useNativeDriver: false }).start()} />
          <ControlButton icon="minus" onPress={() => Animated.spring(pan, { toValue: { x: 0, y: 18 }, useNativeDriver: false }).start()} />
          <ControlButton icon="navigation" spinning={recentering} onPress={() => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()} />
        </View>
      ) : null}

      {footer ? <View style={[styles.footer, { backgroundColor: c.sheet, borderColor: c.divider }]}>{footer}</View> : null}
    </View>
  );
}

function ControlButton({ icon, onPress, spinning }: { icon: IconName; onPress: () => void; spinning?: boolean }): React.ReactElement {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon}
      onPress={onPress}
      style={({ pressed }) => [styles.control, { backgroundColor: pressed ? c.surfaceAlt : c.surface, borderColor: c.border }]}
    >
      <Icon name={icon} size={15} color={spinning ? c.primary : c.textSecondary} />
    </Pressable>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type Road = { pos: number; major: boolean; tilt?: number };
const ROADS_V: Road[] = [
  { pos: 12, major: false },
  { pos: 28, major: true },
  { pos: 47, major: false },
  { pos: 63, major: true },
  { pos: 81, major: false },
  { pos: 93, major: false, tilt: 6 },
];
const ROADS_H: Road[] = [
  { pos: 16, major: false },
  { pos: 34, major: true },
  { pos: 52, major: false },
  { pos: 70, major: true },
  { pos: 88, major: false },
];
const BLOCKS = [
  { x: 2, y: 3, w: 8, h: 10, park: false },
  { x: 14, y: 2, w: 12, h: 12, park: false },
  { x: 31, y: 4, w: 14, h: 9, park: true },
  { x: 50, y: 2, w: 11, h: 12, park: false },
  { x: 66, y: 5, w: 13, h: 9, park: false },
  { x: 3, y: 20, w: 7, h: 12, park: false },
  { x: 13, y: 18, w: 13, h: 14, park: false },
  { x: 50, y: 19, w: 12, h: 13, park: false },
  { x: 65, y: 17, w: 14, h: 15, park: true },
  { x: 2, y: 38, w: 9, h: 13, park: false },
  { x: 14, y: 36, w: 12, h: 14, park: false },
  { x: 52, y: 37, w: 10, h: 12, park: false },
  { x: 66, y: 36, w: 13, h: 14, park: false },
  { x: 3, y: 56, w: 8, h: 12, park: false },
  { x: 14, y: 55, w: 12, h: 13, park: true },
  { x: 50, y: 55, w: 11, h: 12, park: false },
  { x: 65, y: 55, w: 14, h: 13, park: false },
  { x: 2, y: 75, w: 9, h: 14, park: false },
  { x: 14, y: 74, w: 12, h: 15, park: false },
  { x: 51, y: 73, w: 11, h: 16, park: false },
  { x: 66, y: 74, w: 13, h: 15, park: false },
];

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden', borderWidth: 0, borderRadius: radius.flush },
  grid: { ...StyleSheet.absoluteFillObject },
  userWrap: { position: 'absolute', marginLeft: -29, marginTop: -29, width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  userDot: { width: 16, height: 16, borderRadius: radius.pill, borderWidth: 3 },
  marker: { position: 'absolute', marginLeft: -13, marginTop: -28, alignItems: 'center' },
  markerPin: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerTip: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', opacity: 0.9 },
  topRow: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, alignSelf: 'flex-start' },
  controls: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, gap: 6 },
  control: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.sm, borderTopWidth: 1 },
});
