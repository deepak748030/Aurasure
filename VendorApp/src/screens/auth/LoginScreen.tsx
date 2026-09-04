import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
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
import { Card } from '@/components/ui/VendorUI';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
export function LoginScreen({ navigation }: Props): React.ReactElement {
  const { setVendor } = useVendor();
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    if (password.length < 1) { setError('Enter your password.'); return; }
    setBusy(true); setError('');
    try { const data = await vendorLogin(phone, password); setVendor(data.vendor); haptic.success(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); haptic.error(); }
    finally { setBusy(false); }
  };
  return <Screen keyboardAvoiding headerLeft={<BackButton onPress={() => navigation.goBack()} />} title="Welcome back" subtitle="Sign in to manage your outlet">
    <View style={styles.intro}><View style={styles.icon}><Icon name="store" size={28} color={colors.brand[700]} /></View><Text variant="h3" weight="bold" style={{ marginTop: 14 }}>Your outlet is ready when you are.</Text><Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 5, textAlign: 'center' }}>Use the mobile number linked to your vendor account.</Text></View>
    <Card style={{ marginTop: 22 }}><Input label="Mobile number" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" placeholder="10-digit number" leftIcon="phone" /><Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" leftIcon="lock" />
      {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 12 }}>{error}</Text> : null}<Button title="Sign in" loading={busy} onPress={() => void submit()} /></Card>
    <View style={styles.help}><Icon name="shield" size={16} color={colors.success} /><Text variant="caption" color={colors.textSecondary}>Your outlet data is scoped to this account.</Text></View>
    <Button title="Create a new vendor account" variant="ghost" onPress={() => navigation.navigate('Register')} />
  </Screen>;
}
const styles = StyleSheet.create({ intro: { alignItems: 'center', paddingTop: 20 }, icon: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }, help: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginVertical: 17 }, });
