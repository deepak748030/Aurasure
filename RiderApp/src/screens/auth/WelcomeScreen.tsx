import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const ROWS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'bike', title: 'Deliver on bike, scooter or EV', body: 'Pick a vehicle, upload documents and go live after admin KYC.' },
  { icon: 'shield', title: 'Every document verified', body: 'Aadhaar, DL, PAN, vehicle RC and photo — approved only at 100%.' },
  { icon: 'wallet', title: 'Pay per trip, never per hour', body: 'Trip payout + incentives. COD collected stays with you briefly.' },
  { icon: 'phone', title: 'One phone = one role', body: 'The same number cannot be a customer, vendor and rider at once.' },
];

export function WelcomeScreen({ navigation }: Props): React.ReactElement {
  useEffect(() => undefined, []);

  return (
    <Screen scroll padded appBarColor={colors.appBarHero} statusBarStyle="light">
      <Animated.View entering={FadeInDown.duration(420)}>
        <LinearGradient colors={['#6A0A45', '#C3126A']} style={{ borderRadius: 24, padding: 22, marginTop: 8 }}>
          <Text variant="overline" color="rgba(255,255,255,0.72)">
            AURASURE DELIVERY PARTNER
          </Text>
          <Text variant="display" color={colors.white} style={{ marginTop: 8 }}>
            Deliver. Pick up. Get paid.
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.86)" style={{ marginTop: 10 }}>
            Accept nearby orders, verify pickup and drop OTPs, and keep your COD record clean in one rider profile.
          </Text>
        </LinearGradient>
      </Animated.View>

      <View style={{ marginTop: 18, gap: 10 }}>
        {ROWS.map((row, i) => (
          <Animated.View
            key={row.title}
            entering={FadeInUp.delay(80 * i).duration(380)}
            style={{
              flexDirection: 'row',
              gap: 12,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.brand[50],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={row.icon} size={22} color={colors.brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title">{row.title}</Text>
              <Text variant="bodySm" color={colors.textSecondary}>
                {row.body}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInUp.delay(420)} style={{ marginTop: 22, gap: 10 }}>
        <Button title="Register as a delivery partner" variant="login" size="lg" onPress={() => navigation.navigate('Register')} />
        <Button title="I already have a rider number" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </Animated.View>
    </Screen>
  );
}
