import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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
  { icon: 'utensils', title: 'Food kitchen', body: 'FSSAI, menu, prep times — accept or reject every ticket.' },
  { icon: 'store', title: 'Shop / ecommerce', body: 'GST, inventory, packed orders. Locked to this module.' },
  { icon: 'shield', title: 'KYC before live', body: 'Admin verifies each photo. Blurry IDs come back, not a silent reject.' },
  { icon: 'bike', title: 'Riders are separate', body: 'Delivery partner app uses its own phone. This number stays a vendor.' },
];

export function WelcomeScreen({ navigation }: Props): React.ReactElement {
  useEffect(() => undefined, []);

  return (
    <Screen scroll padded appBarColor={colors.appBarHero} statusBarStyle="light">
      <Animated.View entering={FadeInDown.duration(420)}>
        <View style={{ backgroundColor: '#A4006B', borderRadius: 20, padding: 22, marginTop: 8 }}>
          <Text variant="overline" color="rgba(255,255,255,0.80)">
            AURASURE PARTNER
          </Text>
          <Text variant="display" color={colors.white} style={{ marginTop: 8 }}>
            Your outlet. Your hours. One phone.
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.86)" style={{ marginTop: 10 }}>
            Pick food or shop once. Upload documents. Go live only after admin ticks every file.
          </Text>
        </View>
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
        <Button title="Create vendor account" variant="login" size="lg" onPress={() => navigation.navigate('Register')} />
        <Button title="I already have an outlet" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </Animated.View>
      <Pressable style={{ marginTop: 16 }}>
        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
          Same number cannot be a customer, a rider and a vendor.
        </Text>
      </Pressable>
    </Screen>
  );
}
