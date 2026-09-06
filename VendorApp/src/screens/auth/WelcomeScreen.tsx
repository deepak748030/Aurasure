import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
const FEATURES = [
  ['orders', 'Stay ahead of the pass', 'New orders, prep timers and rider pickup in one clear board.'],
  ['utensils', 'Run your catalogue', 'Quickly pause stock, update prices and keep your storefront fresh.'],
  ['chart', 'Know your business', 'Today’s sales, payouts, ratings and outlet health at a glance.'],
] as const;

export function WelcomeScreen({ navigation }: Props): React.ReactElement {
  return <Screen scroll padded={false} appBarColor={colors.appBarHero} statusBarStyle="light" backgroundColor={colors.background}>
    <Animated.View entering={FadeInDown.duration(450)} style={styles.hero}>
      <Image source={require('../../../assets/images/logo_aurasure_light.png')} style={styles.logo} resizeMode="contain" />
      <Text variant="overline" color="#F9B9D7" style={{ marginTop: 30 }}>AURASURE PARTNER</Text>
      <Text variant="display" color={colors.white} style={{ marginTop: 12 }}>Make every order count.</Text>
      <Text variant="body" color="#F8DDEB" style={{ marginTop: 12 }}>The calm, capable command centre for kitchens and shops.</Text>
      <View style={styles.heroPills}><View style={styles.pill}><Icon name="shield" size={15} color="#FFD7EA" /><Text variant="caption" color="#FFEAF4">Verified vendors</Text></View><View style={styles.pill}><Icon name="timer" size={15} color="#FFD7EA" /><Text variant="caption" color="#FFEAF4">Live operations</Text></View></View>
    </Animated.View>
    <Animated.View entering={FadeInUp.delay(120).duration(450)} style={styles.content}>
      <Text variant="h2" weight="bold">Everything at the pass</Text>
      {FEATURES.map(([icon, title, body]) => <View key={title} style={styles.feature}><View style={styles.featureIcon}><Icon name={icon} size={21} color={colors.brand[600]} /></View><View style={{ flex: 1 }}><Text variant="title" weight="bold">{title}</Text><Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 3 }}>{body}</Text></View></View>)}
      <View style={styles.actions}><Button title="Sign in to your outlet" variant="login" size="lg" onPress={() => navigation.navigate('Login')} /></View>
      <Pressable onPress={() => navigation.navigate('Register')} style={styles.outline}><Text variant="button" color={colors.brand[700]}>Create a vendor account</Text><Icon name="arrowRight" size={18} color={colors.brand[700]} /></Pressable>
      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 18 }}>Food kitchen or shop · KYC protected · built for India</Text>
    </Animated.View>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.appBarHero, paddingHorizontal: 20, paddingTop: 38, paddingBottom: 30, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { width: 122, height: 32, alignSelf: 'flex-start' },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 24 },
  pill: { borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.13)', paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  content: { paddingHorizontal: 4, paddingTop: 26, paddingBottom: 28 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 18 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 30 },
  outline: { height: 54, borderWidth: 1, borderColor: colors.brand[200], borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 12 },
});
