import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Icon, BRAND } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';

/**
 * Branded splash. The reference app waits a fixed 2s; here we wait for the
 * session restore + the `/health` probe, with a 1.6s ceiling so a slow network
 * never traps the user on the logo.
 */
export function SplashScreen({ navigation }: { navigation: { replace: (name: string) => void } }): React.ReactElement {
  const c = useColors();
  const { ready, online, checkHealth, onboarded } = useSession();
  const pulse = useRef(new Animated.Value(0)).current;
  const decided = useRef(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    const timer = setTimeout(() => {
      navigation.replace(onboarded ? 'Tabs' : 'Onboarding');
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, onboarded, navigation]);

  // If the boot probe already failed, ping once more — cheap, and it makes the
  // "offline" pill on this screen truthful.
  useEffect(() => {
    if (ready && online === false) void checkHealth();
  }, [ready, online, checkHealth]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.fill, { backgroundColor: c.isDark ? c.bg : c.primaryDeep }]>
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.logoPlate,
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] },
            ]}
          >
            <Icon name={BRAND.icon} size={46} color={c.white} />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text variant="h2" weight="bold" color={c.white}>
              {BRAND.name}
            </Text>
            <Text variant="bodySm" color="rgba(255,255,255,0.72)">
              {BRAND.tagline}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {online === false ? <Icon name="wifiOff" size={14} color="#FFD9A0" /> : <Icon name="shield" size={14} color="rgba(255,255,255,0.7)" />}
            <Text variant="caption" color="rgba(255,255,255,0.8)">
              {online === false ? 'Aurasure API unreachable — you can still browse' : 'Connected to Aurasure API v1'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  logoPlate: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.sm },
});
