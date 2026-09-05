import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
export function RegisterScreen({ navigation }: Props): React.ReactElement {
  const { setVendor } = useVendor();
  const [module, setModule] = useState<'food' | 'shop' | null>(null); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!module) return setError('Choose the type of outlet you run.');
    if (name.trim().length < 2) return setError('Enter the owner name shown on your documents.');
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit Indian mobile number.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true); setError(''); try { const data = await vendorRegister({ name: name.trim(), phone, password, module }); setVendor(data.vendor); haptic.success(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not create account.'); haptic.error(); } finally { setBusy(false); }
  };
  return <Screen keyboardAvoiding headerLeft={<BackButton onPress={() => navigation.goBack()} />} title="Start your outlet" subtitle="Choose once · build your storefront next">
    <Text variant="body" color={colors.textSecondary} style={{ marginTop: 14 }}>What do you sell on Aurasure?</Text>
    <View style={styles.modules}><ModuleCard selected={module === 'food'} icon="utensils" title="Food kitchen" copy="Restaurant, cloud kitchen or bakery" color={colors.food} onPress={() => { setModule('food'); setError(''); }} /><ModuleCard selected={module === 'shop'} icon="store" title="Shop" copy="Grocery, fashion or general store" color={colors.shop} onPress={() => { setModule('shop'); setError(''); }} /></View>
    <Input label="Owner name" value={name} onChangeText={setName} placeholder="As printed on PAN" leftIcon="user" /><Input label="Mobile number" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" placeholder="10-digit number" leftIcon="phone" /><Input label="Create password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" leftIcon="lock" />
    <View style={styles.note}><Icon name="shield" size={17} color={colors.info} /><Text variant="caption" color={colors.info} style={{ flex: 1 }}>One phone number stays linked to one vendor module. Your KYC is reviewed before you receive orders.</Text></View>
    {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Text> : null}<Button title="Create account" loading={busy} onPress={() => void submit()} disabled={!module} />
  </Screen>;
}
function ModuleCard({ selected, icon, title, copy, color, onPress }: { selected: boolean; icon: 'utensils' | 'store'; title: string; copy: string; color: string; onPress: () => void }): React.ReactElement { return <Pressable onPress={() => { haptic.selection(); onPress(); }} style={[styles.module, { borderColor: selected ? color : colors.border, backgroundColor: selected ? `${color}12` : colors.surface }]}><View style={[styles.moduleIcon, { backgroundColor: selected ? color : colors.surfaceAlt }]}><Icon name={icon} size={21} color={selected ? colors.white : colors.textSecondary} /></View><Text variant="title" weight="bold" style={{ marginTop: 10 }}>{title}</Text><Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>{copy}</Text>{selected ? <Icon name="circleCheck" size={18} color={color} style={styles.selected} /> : null}</Pressable>; }
const styles = StyleSheet.create({ modules: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 20 }, module: { flex: 1, minHeight: 128, borderWidth: 1.5, borderRadius: radius.lg, padding: 13 }, moduleIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, selected: { position: 'absolute', right: 11, top: 11 }, note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.infoBg, borderRadius: radius.md, marginBottom: 14 }, });
