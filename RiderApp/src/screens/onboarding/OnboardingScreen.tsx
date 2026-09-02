import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Switch, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { riderApi, type Rider } from '@/api/rider';
import { uploadRiderFile } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { pickImage } from '@/lib/pickImage';
import type { IconName } from '@/types';

const TITLES = ['Personal', 'Vehicle & ID', 'Bank', 'Documents'];
const REQUIRED_DOCS: { key: string; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'drivingLicense', label: 'Driving Licence' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'vehicle', label: 'Vehicle Registration (RC)' },
  { key: 'photo', label: 'Profile Photo' },
];

interface DocState {
  key: string;
  label: string;
  uri: string;
  verified: boolean;
}

function docsFrom(rider: Rider | null): DocState[] {
  const base = REQUIRED_DOCS.map((d) => ({ ...d, uri: '', verified: false }));
  if (!rider?.documents?.length) return base;
  return base.map((b) => {
    const found = rider.documents.find((d) => d.key === b.key);
    return found ? { ...b, uri: found.uri, verified: found.verified } : b;
  });
}

export function OnboardingScreen(): React.ReactElement {
  const { rider, setRider } = useRider();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: rider?.name || '',
    email: rider?.email || '',
    city: rider?.city || '',
    pincode: rider?.pincode || '',
    address: rider?.address || '',
    vehicleType: rider?.vehicleType || 'bike',
    vehicleNumber: rider?.vehicleNumber || '',
    pan: rider?.pan || '',
    aadhaar: rider?.aadhaar || '',
    drivingLicense: rider?.drivingLicense || '',
    rcNumber: rider?.rcNumber || '',
    trainingCompleted: rider?.trainingCompleted || false,
    quizCompleted: rider?.quizCompleted || false,
    accountName: rider?.bank?.accountName || '',
    accountNumber: rider?.bank?.accountNumber || '',
    ifsc: rider?.bank?.ifsc || '',
    bankName: rider?.bank?.bankName || '',
    upi: rider?.bank?.upi || '',
  });
  const [docs, setDocs] = useState<DocState[]>(() => docsFrom(rider));

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const persist = async (body: Record<string, unknown>) => {
    const data = await riderApi.save(body);
    setRider(data.rider);
    return data.rider;
  };

  const saveStep = async () => {
    setError('');
    if (step === 0) {
      if (!form.name.trim() || !form.city.trim() || !form.pincode.trim() || !form.address.trim()) {
        setError('Fill name, city, PIN and address before continuing.');
        return;
      }
      if (!/^\d{6}$/.test(form.pincode.trim())) {
        setError('Enter a valid 6-digit PIN.');
        return;
      }
    }
    if (step === 1) {
      if (!form.vehicleNumber.trim()) {
        setError('Vehicle number is required.');
        return;
      }
      if (form.vehicleType && !['bike', 'scooter', 'cycle', 'ev'].includes(form.vehicleType)) {
        setError('Pick a valid vehicle type.');
        return;
      }
    }
    if (step === 2) {
      if (!form.accountName.trim() || !form.accountNumber.trim() || !form.ifsc.trim() || !form.bankName.trim()) {
        setError('Fill account holder, account number, IFSC and bank name.');
        return;
      }
    }
    setBusy(true);
    try {
      if (step === 0) {
        await persist({
          name: form.name,
          email: form.email,
          city: form.city,
          pincode: form.pincode,
          address: form.address,
        });
      } else if (step === 1) {
        await persist({
          vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber,
          pan: form.pan,
          aadhaar: form.aadhaar,
          drivingLicense: form.drivingLicense,
          rcNumber: form.rcNumber,
          trainingCompleted: form.trainingCompleted,
          quizCompleted: form.quizCompleted,
        });
      } else if (step === 2) {
        await persist({
          bank: {
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            ifsc: form.ifsc,
            bankName: form.bankName,
            upi: form.upi,
          },
        });
      }
      haptic.success();
      if (step < 3) setStep((s) => s + 1);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (key: string, label: string) => {
    setError('');
    const picked = await pickImage();
    if (!picked) return;
    setBusy(true);
    try {
      const uploaded = await uploadRiderFile(picked.blob, picked.name);
      await riderApi.setDoc(key, uploaded.url, label);
      setDocs((arr) => arr.map((d) => (d.key === key ? { ...d, uri: uploaded.url, verified: false } : d)));
      haptic.success();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await riderApi.submit();
      haptic.success();
      setRider(data.rider);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const chips = ['bike', 'scooter', 'cycle', 'ev'];

  return (
    <Screen title={TITLES[step]} subtitle={`Step ${step + 1} of ${TITLES.length}`} keyboardAvoiding>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {TITLES.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 4,
              backgroundColor: i <= step ? colors.food[500] : colors.ink[200],
            }}
          />
        ))}
      </View>

      {step === 0 ? (
        <>
          <Input label="Full name" value={form.name} onChangeText={(v) => set('name', v)} leftIcon="user" />
          <Input label="Email (optional)" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" leftIcon="mail" />
          <Input label="City" value={form.city} onChangeText={(v) => set('city', v)} />
          <Input label="PIN code" value={form.pincode} onChangeText={(v) => set('pincode', v.replace(/[^\d]/g, '').slice(0, 6))} keyboardType="number-pad" />
          <Input label="Home address" value={form.address} onChangeText={(v) => set('address', v)} multiline />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            Vehicle type
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {chips.map((c) => {
              const on = form.vehicleType === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    haptic.selection();
                    set('vehicleType', c);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    backgroundColor: on ? colors.brand[600] : colors.surface,
                    borderWidth: 1,
                    borderColor: on ? colors.brand[600] : colors.border,
                  }}
                >
                  <Text variant="caption" weight="semibold" color={on ? colors.white : colors.text}>
                    {c.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input label="Vehicle number" value={form.vehicleNumber} onChangeText={(v) => set('vehicleNumber', v.toUpperCase())} autoCapitalize="characters" />
          <Input label="PAN" value={form.pan} onChangeText={(v) => set('pan', v.toUpperCase())} autoCapitalize="characters" />
          <Input label="Aadhaar" value={form.aadhaar} onChangeText={(v) => set('aadhaar', v.replace(/[^\d]/g, '').slice(0, 12))} keyboardType="number-pad" />
          <Input label="Driving licence" value={form.drivingLicense} onChangeText={(v) => set('drivingLicense', v.toUpperCase())} autoCapitalize="characters" />
          <Input label="RC number" value={form.rcNumber} onChangeText={(v) => set('rcNumber', v.toUpperCase())} autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="title">Training completed</Text>
              <Text variant="caption" color={colors.textTertiary}>Watch the safety & billing clip before delivering.</Text>
            </View>
            <Switch value={form.trainingCompleted} onValueChange={(v) => set('trainingCompleted', v)} thumbColor={colors.surface} trackColor={{ false: colors.ink[200], true: colors.brand[500] }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="title">Quiz passed</Text>
              <Text variant="caption" color={colors.textTertiary}>A short safety quiz is part of onboarding.</Text>
            </View>
            <Switch value={form.quizCompleted} onValueChange={(v) => set('quizCompleted', v)} thumbColor={colors.surface} trackColor={{ false: colors.ink[200], true: colors.brand[500] }} />
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 10 }}>
            Payouts are transferred to this account after delivered COD trips.
          </Text>
          <Input label="Account holder" value={form.accountName} onChangeText={(v) => set('accountName', v)} />
          <Input label="Account number" value={form.accountNumber} onChangeText={(v) => set('accountNumber', v.replace(/[^\d]/g, ''))} keyboardType="number-pad" />
          <Input label="IFSC" value={form.ifsc} onChangeText={(v) => set('ifsc', v.toUpperCase())} autoCapitalize="characters" />
          <Input label="Bank name" value={form.bankName} onChangeText={(v) => set('bankName', v)} />
          <Input label="UPI (backup)" value={form.upi} onChangeText={(v) => set('upi', v)} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 12 }}>
            Clear, uncropped photos. Admin will not approve until every slot is verified.
          </Text>
          {docs.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => void upload(d.key, d.label)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              {d.uri ? (
                <Image source={{ uri: d.uri }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.ink[100] }} />
              ) : (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    backgroundColor: colors.brand[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="camera" size={22} color={colors.brand[600]} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text variant="title">{d.label}</Text>
                <Text variant="caption" color={d.uri ? colors.success : colors.textTertiary}>
                  {d.uri ? (d.verified ? 'Verified' : 'Tap to replace') : 'Required · tap to upload'}
                </Text>
              </View>
              <Icon name={d.uri ? 'circleCheck' : 'plus'} size={20} color={d.uri ? colors.success : colors.textTertiary} />
            </Pressable>
          ))}
          {busy && step === 3 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color={colors.brand[600]} />
            </View>
          ) : null}
        </>
      ) : null}

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginTop: 8 }}>
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: 18, gap: 8 }}>
        <Button
          title={step === 3 ? 'Save documents & submit' : 'Save & next'}
          variant={step === 3 ? 'success' : 'primary'}
          loading={busy}
          onPress={step === 3 ? submit : saveStep}
        />
        {step > 0 ? <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} /> : null}
      </View>
    </Screen>
  );
}
