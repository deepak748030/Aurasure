import React, { useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Icon } from '@/lib/icons';
import { vendorLogin } from '@/api/session';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.ReactElement {
  const { setVendor } = useVendor();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      haptic.error();
      setError('Enter a valid 10-digit Indian mobile.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await vendorLogin(phone.trim(), password);
      haptic.success();
      setVendor(data.vendor);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      title="Vendor sign in"
      subtitle="The number you locked to food or shop"
    >
      <View style={{ alignItems: 'center', marginBottom: 18, marginTop: 8 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: '#F4D5EC',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="store" size={28} color="#9C005E" />
        </View>
      </View>
      <Input
        label="Mobile"
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        leftIcon="phone"
        placeholder="10-digit number"
      />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry leftIcon="lock" placeholder="••••••••" />
      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Text>
      ) : null}
      <Button title="Continue" variant="login" size="lg" loading={busy} onPress={submit} />
      <Button title="Create account" variant="ghost" onPress={() => navigation.navigate('Register')} />
    </Screen>
  );
}
