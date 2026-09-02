import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { uploadVendorImage, vendorApi } from '@/api/vendor';
import { pickImage } from '@/lib/pickImage';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';

const FOOD_CUISINES = ['North Indian', 'South Indian', 'Chinese', 'Biryani', 'Thali', 'Fast food', 'Sweets', 'Beverages'];
const SHOP_CATS = ['Grocery', 'Fashion', 'Electronics', 'Home', 'Beauty', 'Pharmacy', 'General'];

export function OnboardingScreen(): React.ReactElement {
  const { vendor, setVendor } = useVendor();
  const isFood = vendor?.module === 'food';
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<string[]>(vendor?.cuisines?.length ? vendor.cuisines : []);
  const [form, setForm] = useState({
    outletName: vendor?.outletName ?? '',
    legalName: vendor?.legalName ?? '',
    description: vendor?.description ?? '',
    address: vendor?.address ?? '',
    city: vendor?.city ?? '',
    pin: vendor?.pin ?? '',
    gstin: vendor?.gstin ?? '',
    pan: vendor?.pan ?? '',
    fssai: vendor?.fssai ?? '',
    tradeLicense: vendor?.tradeLicense ?? '',
    open: vendor?.hours?.open ?? '10:00',
    close: vendor?.hours?.close ?? '22:00',
    accountName: vendor?.bank?.accountName ?? '',
    accountNumber: vendor?.bank?.accountNumber ?? '',
    ifsc: vendor?.bank?.ifsc ?? '',
    bankName: vendor?.bank?.bankName ?? '',
    upi: vendor?.bank?.upi ?? '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const docs = vendor?.documents ?? [];
  const titles = useMemo(
    () => ['Outlet', isFood ? 'Kitchen & tax' : 'Shop & tax', 'Bank payouts', 'Documents'],
    [isFood],
  );

  const toggleTag = (t: string) => {
    haptic.selection();
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const saveStep = async () => {
    setBusy(true);
    setError('');
    try {
      if (step < 3) {
        const data = await vendorApi.save({
          outletName: form.outletName,
          legalName: form.legalName,
          description: form.description,
          address: form.address,
          city: form.city,
          pin: form.pin,
          gstin: form.gstin,
          pan: form.pan,
          fssai: form.fssai,
          tradeLicense: form.tradeLicense,
          cuisines: tags,
          hours: { open: form.open, close: form.close },
          bank: {
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            ifsc: form.ifsc,
            bankName: form.bankName,
            upi: form.upi,
          },
        });
        setVendor(data.vendor);
        haptic.light();
        setStep((s) => s + 1);
      } else {
        const data = await vendorApi.submit();
        haptic.success();
        setVendor(data.vendor);
      }
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (key: string, label: string) => {
    const picked = await pickImage();
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      const up = await uploadVendorImage(picked.blob, picked.name);
      const data = await vendorApi.setDoc(key, up.url || up.image.uri, label);
      setVendor(data.vendor);
      haptic.success();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const chips = isFood ? FOOD_CUISINES : SHOP_CATS;

  return (
    <Screen title={titles[step]} subtitle={`Step ${step + 1} of 4 · ${isFood ? 'Food kitchen' : 'Shop'}`} keyboardAvoiding>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {titles.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 4,
              backgroundColor: i <= step ? (isFood ? colors.food[500] : colors.brand[600]) : colors.ink[200],
            }}
          />
        ))}
      </View>

      {step === 0 ? (
        <>
          <Input label="Outlet name (customers see this)" value={form.outletName} onChangeText={(v) => set('outletName', v)} leftIcon="store" />
          <Input label="Legal / GST name" value={form.legalName} onChangeText={(v) => set('legalName', v)} />
          <Input label="What do you sell?" value={form.description} onChangeText={(v) => set('description', v)} multiline />
          <Input label="Street address" value={form.address} onChangeText={(v) => set('address', v)} leftIcon="mapPin" />
          <Input label="City" value={form.city} onChangeText={(v) => set('city', v)} />
          <Input label="PIN" value={form.pin} onChangeText={(v) => set('pin', v)} keyboardType="number-pad" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label="Opens" value={form.open} onChangeText={(v) => set('open', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Closes" value={form.close} onChangeText={(v) => set('close', v)} />
            </View>
          </View>
          <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            {isFood ? 'Cuisines' : 'Categories'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {chips.map((c) => {
              const on = tags.includes(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleTag(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: on ? colors.brand[600] : colors.surface,
                    borderWidth: 1,
                    borderColor: on ? colors.brand[600] : colors.border,
                  }}
                >
                  <Text variant="caption" color={on ? colors.white : colors.text} weight="semibold">
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 10 }}>
            {isFood
              ? 'FSSAI is mandatory for kitchens. GST if turnover requires it.'
              : 'GST or a municipal trade license — one of the two is enough for small shops.'}
          </Text>
          <Input label="PAN" value={form.pan} onChangeText={(v) => set('pan', v)} autoCapitalize="characters" />
          <Input label="GSTIN" value={form.gstin} onChangeText={(v) => set('gstin', v)} autoCapitalize="characters" />
          {isFood ? (
            <Input label="FSSAI license number" value={form.fssai} onChangeText={(v) => set('fssai', v)} />
          ) : (
            <Input label="Trade / shop license" value={form.tradeLicense} onChangeText={(v) => set('tradeLicense', v)} />
          )}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 10 }}>
            Settlements after delivered orders. Wrong IFSC is the #1 payout delay we see.
          </Text>
          <Input label="Account holder" value={form.accountName} onChangeText={(v) => set('accountName', v)} />
          <Input label="Account number" value={form.accountNumber} onChangeText={(v) => set('accountNumber', v)} keyboardType="number-pad" />
          <Input label="IFSC" value={form.ifsc} onChangeText={(v) => set('ifsc', v)} autoCapitalize="characters" />
          <Input label="Bank name" value={form.bankName} onChangeText={(v) => set('bankName', v)} />
          <Input label="UPI (backup)" value={form.upi} onChangeText={(v) => set('upi', v)} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 12 }}>
            Clear photos. Admin will not approve until every slot is ticked.
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
                  {d.uri ? 'Tap to replace' : 'Required · tap to upload'}
                </Text>
              </View>
              <Icon name={d.uri ? 'circleCheck' : 'plus'} size={20} color={d.uri ? colors.success : colors.textTertiary} />
            </Pressable>
          ))}
        </>
      ) : null}

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginTop: 8 }}>
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: 18, gap: 8 }}>
        <Button title={step === 3 ? 'Submit for verification' : 'Save & next'} loading={busy} onPress={saveStep} />
        {step > 0 ? <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} /> : null}
      </View>
    </Screen>
  );
}
