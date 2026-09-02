import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Icon } from '@/lib/icons';
import { vendorRegister } from '@/api/session';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props): React.ReactElement {
  const { setVendor } = useVendor();
  const [module, setModule] = useState<'food' | 'shop' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!module) {
      setError('Pick food or shop — this cannot change later.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await vendorRegister({ name, phone: phone.trim(), password, module });
      haptic.success();
      setVendor(data.vendor);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Could not register');
    } finally {
      setBusy(false);
    }
  };

  const Card = ({
    id,
    title,
    body,
    icon,
    tint,
  }: {
    id: 'food' | 'shop';
    title: string;
    body: string;
    icon: IconName;
    tint: string;
  }) => {
    const on = module === id;
    return (
      <Pressable
        onPress={() => {
          haptic.selection();
          setModule(id);
          setError('');
        }}
        style={{
          flex: 1,
          borderRadius: radius.xl,
          borderWidth: 1.5,
          borderColor: on ? tint : colors.border,
          backgroundColor: on ? `${tint}18` : colors.surface,
          padding: 14,
          minHeight: 148,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: on ? tint : colors.ink[100],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={22} color={on ? colors.white : colors.textSecondary} />
        </View>
        <Text variant="title" style={{ marginTop: 12 }}>
          {title}
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {body}
        </Text>
      </Pressable>
    );
  };

  return (
    <Screen
      keyboardAvoiding
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      title="Create vendor"
      subtitle="One phone · one module · forever"
    >
      <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 10 }}>
        What will customers order from you?
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Card id="food" title="Food" body="Kitchen / restaurant. We will ask for FSSAI + kitchen photos." icon="utensils" tint={colors.food[500]} />
        <Card id="shop" title="Shop" body="Store / ecommerce. We will ask for GST or trade license." icon="bag" tint={colors.brand[600]} />
      </View>
      {module ? (
        <Animated.View entering={FadeIn}>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 12 }}>
            Next screens collect {module === 'food' ? 'FSSAI, menu and kitchen' : 'GST, inventory and shop floor'} documents only.
          </Text>
        </Animated.View>
      ) : null}
      <Input label="Owner name (as on PAN)" value={name} onChangeText={setName} leftIcon="user" placeholder="Kavya Sharma" />
      <Input
        label="Mobile"
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        leftIcon="phone"
        placeholder="Not used on customer or rider app"
      />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry leftIcon="lock" />
      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Text>
      ) : null}
      <Button title="Lock module & continue" variant="login" size="lg" loading={busy} onPress={submit} disabled={!module} />
    </Screen>
  );
}
