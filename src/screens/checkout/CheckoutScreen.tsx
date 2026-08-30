import React, { useState } from 'react';
import { useFloatingBarBottomInset } from '@/hooks/useBottomInset';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useCart } from '../../context/CartContext';
import { userProfile } from '../../data/mock';
import { colors } from '@/theme/colors';
import { layout, radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { switchTab } from '@/navigation/RootNavigation';
import type { Address, IconName } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabsParamList, CartStackParamList } from '../../navigation/types';
import { useModuleCart } from '../../hooks/useModuleCart';

const DELIVERY_FEE = 29;

interface PayOption {
  id: string;
  label: string;
  icon: IconName;
  sub?: string;
}

const PAYMENTS: PayOption[] = [
  { id: 'wallet', label: 'Aurasure Wallet', icon: 'wallet', sub: `Balance ₹${formatINR(userProfile.wallet)}` },
  { id: 'upi', label: 'UPI', icon: 'smartphone' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'creditCard' },
  { id: 'cod', label: 'Cash on Delivery', icon: 'rupee' },
];

type Props = NativeStackScreenProps<CartStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props): React.ReactElement {
  const barBottom = useFloatingBarBottomInset(10);
  const { remove } = useCart();
  const { items, subtotal } = useModuleCart();
  const [addressId, setAddressId] = useState(userProfile.addresses.find((a) => a.isDefault)?.id ?? userProfile.addresses[0]?.id ?? '');
  const [payment, setPayment] = useState('wallet');
  const [coupon, setCoupon] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addr, setAddr] = useState<{ label: string; line: string; city: string; pin: string }>({ label: '', line: '', city: '', pin: '' });
  const [done, setDone] = useState(false);

  const delivery = subtotal > 149 || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  const selectAddress = (id: string): void => {
    haptic.light();
    setAddressId(id);
  };

  const placeOrder = (): void => {
    if (items.length === 0) {
      navigation.goBack();
      return;
    }
    haptic.success();
    items.forEach((i) => remove(i.id));
    setDone(true);
  };

  const finish = (tab: keyof MainTabsParamList): void => {
    setDone(false);
    switchTab(tab);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        title="Checkout"
        headerLeft={<BackButton onPress={() => navigation.goBack()} />}
        keyboardAvoiding
        contentStyle={{ paddingBottom: 100 }}
        scroll
      >
        <Card>
          <View style={styles.sectionHead}>
            <Icon name="mapPin" size={18} color={colors.brand[600]} />
            <Text variant="title" weight="bold" color={colors.text}>
              Delivery address
            </Text>
          </View>
          {userProfile.addresses.map((a) => (
            <Pressable key={a.id} onPress={() => selectAddress(a.id)} style={[styles.addrRow, addressId === a.id && styles.addrActive]}>
              <View style={[styles.radio, addressId === a.id && styles.radioActive]}>
                {addressId === a.id ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="subtitle" weight="bold" color={colors.text}>
                    {a.label}
                  </Text>
                  {a.isDefault ? <Text variant="caption" color={colors.brand[700]} weight="bold" style={{ marginLeft: 8 }}>DEFAULT</Text> : null}
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {a.line}, {a.city} {a.pin}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={() => setSheetOpen(true)} style={styles.addNew}>
            <Icon name="plusCircle" size={16} color={colors.brand[600]} />
            <Text variant="caption" color={colors.brand[700]} weight="semibold" style={{ marginLeft: 6 }}>
              Add new address
            </Text>
          </Pressable>
        </Card>

        <Card variant="alt" style={{ marginTop: 14 }}>
          <View style={styles.sectionHead}>
            <Icon name="creditCard" size={18} color={colors.brand[600]} />
            <Text variant="title" weight="bold" color={colors.text}>
              Payment method
            </Text>
          </View>
          {PAYMENTS.map((p) => (
            <Pressable key={p.id} onPress={() => { haptic.light(); setPayment(p.id); }} style={[styles.payRow, payment === p.id && styles.payActive]}>
              <View style={[styles.radio, payment === p.id && styles.radioActive]}>
                {payment === p.id ? <View style={styles.radioDot} /> : null}
              </View>
              <Icon name={p.icon} size={18} color={colors.textSecondary} style={{ marginHorizontal: 10 }} />
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="semibold" color={colors.text}>
                  {p.label}
                </Text>
                {p.sub ? <Text variant="caption" color={colors.textTertiary}>{p.sub}</Text> : null}
              </View>
            </Pressable>
          ))}
        </Card>

        <Card variant="alt" style={{ marginTop: 14 }}>
          <Input label="Coupon code" value={coupon} onChangeText={setCoupon} placeholder="e.g. AURA50" leftIcon="tag" autoCapitalize="characters" />
        </Card>

        <Card variant="alt" style={{ marginTop: 14 }}>
          <Text variant="title" weight="bold" color={colors.text}>
            Bill details
          </Text>
          <View style={styles.billRow}>
            <Text variant="body" color={colors.textSecondary}>Item total ({items.length})</Text>
            <Text variant="body" color={colors.text}>{formatINR(subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text variant="body" color={colors.textSecondary}>Delivery fee</Text>
            <Text variant="body" color={delivery === 0 ? colors.success : colors.text}>{delivery === 0 ? 'FREE' : formatINR(delivery)}</Text>
          </View>
          <View style={[styles.billRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
            <Text variant="title" weight="bold" color={colors.text}>Total</Text>
            <Text variant="title" weight="bold" color={colors.text}>{formatINR(total)}</Text>
          </View>
        </Card>
        <View style={{ height: 8 }} />
      </Screen>

      <View style={[styles.footer, { bottom: barBottom }]}>
        <View style={styles.footerInner}>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.85)">To pay</Text>
            <Text variant="title" weight="bold" color={colors.white}>{formatINR(total)}</Text>
          </View>
          <Button
            title="Place order"
            onPress={placeOrder}
            variant="secondary"
            leftIcon="lock"
            size="lg"
            style={{ flex: 1, marginLeft: 16 }}
          />
        </View>
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Add new address">
        <Input label="Label (Home/Work)" value={addr.label} onChangeText={(t) => setAddr((s) => ({ ...s, label: t }))} placeholder="Home" leftIcon="tag" />
        <Input label="Address line" value={addr.line} onChangeText={(t) => setAddr((s) => ({ ...s, line: t }))} placeholder="House / flat, street" leftIcon="mapPin" />
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Input label="City" value={addr.city} onChangeText={(t) => setAddr((s) => ({ ...s, city: t }))} placeholder="Raipur" leftIcon="mapPinned" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="PIN" value={addr.pin} onChangeText={(t) => setAddr((s) => ({ ...s, pin: t }))} placeholder="492001" keyboardType="number-pad" leftIcon="mapPin" />
          </View>
        </View>
        <Button title="Save address" fullWidth style={{ marginTop: 4 }} onPress={() => setSheetOpen(false)} leftIcon="check" />
      </BottomSheet>

      <BottomSheet visible={done} onClose={() => finish('Orders')} title="Order placed!">
        <View>
          <View style={styles.successIcon}>
            <Icon name="circleCheck" size={34} color={colors.success} />
          </View>
          <Text variant="h3" weight="bold" color={colors.text} style={{ textAlign: 'center', marginTop: 8 }}>
            Thank you for your order
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 4 }}>
            Your order is confirmed and will be with you shortly.
          </Text>
          <Button title="View orders" onPress={() => finish('Orders')} fullWidth style={{ marginTop: 16 }} leftIcon="receipt" />
          <Button title="Back to home" variant="ghost" onPress={() => finish('Home')} fullWidth style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  addrActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioActive: { borderColor: colors.brand[600] },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand[600] },
  addNew: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  payActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footer: { position: 'absolute', left: layout.contentHorizontalPadding, right: layout.contentHorizontalPadding },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand[600],
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 10,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
