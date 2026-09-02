import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Icon } from '@/lib/icons';
import { riderRegister } from '@/api/session';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const VEHICLES: { key: string; label: string; icon: IconName }[] = [
  { key: 'bike', label: 'Bike', icon: 'bike' },
  { key: 'scooter', label: 'Scooter', icon: 'bike' },
  { key: 'cycle', label: 'Cycle', icon: 'bike' },
  { key: 'ev', label: 'EV', icon: 'zap' },
];

export function RegisterScreen({ navigation }: Props): React.ReactElement {
  const { setRider } = useRider();
  const [vehicleType, setVehicleType] = useState('bike');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await riderRegister({ name: name.trim(), phone: phone.trim(), password, vehicleType });
      haptic.success();
      setRider(data.rider);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Could not register');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      headerLeft={<BackButton onPress={() => navigation.goBack()} />}
      title="Create rider profile"
      subtitle="One phone · one role"
    >
      <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 10 }}>
        What vehicle will you deliver with?
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {VEHICLES.map((v) => {
          const on = vehicleType === v.key;
          return (
            <Pressable
              key={v.key}
              onPress={() => {
                haptic.selection();
                setVehicleType(v.key);
                setError('');
              }}
              style={{
                flex: 1,
                borderRadius: radius.xl,
                borderWidth: 1.5,
                borderColor: on ? colors.brand[600] : colors.border,
                backgroundColor: on ? `${colors.brand[600]}18` : colors.surface,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Icon name={v.icon} size={22} color={on ? colors.brand[600] : colors.textSecondary} />
              <Text variant="caption" weight="semibold" color={on ? colors.brand[700] : colors.textSecondary} style={{ marginTop: 8 }}>
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input label="Full name" value={name} onChangeText={setName} leftIcon="user" placeholder="As on your ID" />
      <Input
        label="Mobile"
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        leftIcon="phone"
        placeholder="Not used on customer or vendor app"
      />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry leftIcon="lock" />
      <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: 8 }}>
        A number already registered as a customer or a vendor cannot be reused here.
      </Text>
      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Text>
      ) : null}
      <Button title="Create & continue" variant="login" size="lg" loading={busy} onPress={submit} />
    </Screen>
  );
}
