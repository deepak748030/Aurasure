import React, { useRef, useState } from 'react';
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
import { useAppQuery } from '../../hooks/useAppQuery';
import { addAddressToServer, fetchCoupons, fetchMe, placeOrder } from '@/api/account';
import { isApiEnabled } from '@/api/config';
import { userProfile } from '../../data/mock';
import { colors } from '@/theme/colors';
import { layout, radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { switchTab } from '@/navigation/RootNavigation';
import type { Address, Coupon, IconName } from '@/types';
import type { MainTabsParamList, CartStackParamList } from '../../navigation/types';
import { useModuleCart } from '../../hooks/useModuleCart';

const DELIVERY_FEE = 29;

/** Coupon catalogue used when the API is off (mirrors the server seed). */
const FALLBACK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat', offValue: 50, expiresAt: null, usedAt: null },
  { id: 'c2', code: 'FOOD25', title: '25% off on food delivery', subtitle: 'Up to ₹120', minOrder: 349, offType: 'percent', offValue: 25, expiresAt: null, usedAt: null },
  { id: 'c3', code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat', offValue: 0, expiresAt: null, usedAt: null },
];

function couponDiscountValue(c: Coupon, subtotal: number): number {
  if (c.offType === 'percent') return Math.min(Math.round((subtotal * c.offValue) / 100), 120);
  return Math.min(c.offValue, subtotal);
}

interface PayOption {
  id: string;
  label: string;
  icon: IconName;
  sub?: string;
}

const PAYMENTS: PayOption[] = [
  { id: 'wallet', label: 'Aurasure Wallet', icon: 'wallet' },
  { id: 'upi', label: 'UPI', icon: 'smartphone' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'creditCard' },
  { id: 'cod', label: 'Cash on Delivery', icon: 'rupee' },
];

type Props = NativeStackScreenProps<CartStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props): React.ReactElement {
  const barBottom = useFloatingBarBottomInset(10);
  const { remove, availPrefFor, setAvailPref } = useCart();
  const { module, items, subtotal } = useModuleCart();
  const { data: profileData } = useAppQuery(fetchMe, () => userProfile);
  const [extraAddresses, setExtraAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>(userProfile.addresses.find((a) => a.isDefault)?.id ?? '');
  const [payment, setPayment] = useState('wallet');
  const [coupon, setCoupon] = useState('');
  const [couponCatalog, setCouponCatalog] = useState<Coupon[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [addr, setAddr] = useState<{ label: string; line: string; city: string; pin: string }>({ label: '', line: '', city: '', pin: '' });
  const [addrSaving, setAddrSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  // Synchronous single-flight guard: the Button only disables after a re-render,
  // so two ultra-fast taps could otherwise both reach placeOrder().
  const placingLock = useRef(false);

  const profile = profileData ?? userProfile;
  const addresses: Address[] = [...profile.addresses, ...extraAddresses];
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
  const wallet = profile.wallet;
  const payOptions = PAYMENTS.map((p) => (p.id === 'wallet' ? { ...p, sub: `Balance ${formatINR(wallet)}` } : p));

  const appliedCoupon = couponCatalog?.find((c) => c.code === coupon && !c.usedAt) ?? null;
  const couponValid = appliedCoupon ? subtotal >= appliedCoupon.minOrder : false;
  const freeDeliveryCoupon = appliedCoupon?.code === 'FREEDEL' && couponValid;
  const discount = appliedCoupon && couponValid ? couponDiscountValue(appliedCoupon, subtotal) : 0;
  const delivery = freeDeliveryCoupon || subtotal === 0 || subtotal - discount > 149 ? 0 : DELIVERY_FEE;
  const total = Math.max(0, subtotal + delivery - discount);
  const walletShort = Math.max(0, total - wallet);

  const selectAddress = (id: string): void => {
    haptic.light();
    setAddressId(id);
  };

  const ensureCouponCatalog = async (): Promise<Coupon[]> => {
    if (couponCatalog) return couponCatalog;
    let list: Coupon[] = FALLBACK_COUPONS;
    try {
      const remote = await fetchCoupons();
      if (remote && remote.length > 0) list = remote;
    } catch {
      /* keep fallback */
    }
    setCouponCatalog(list);
    return list;
  };

  const applyCoupon = async (): Promise<void> => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const list = await ensureCouponCatalog();
      const hit = list.find((c) => c.code === code);
      if (!hit) {
        setCouponMsg("We couldn't find that coupon code.");
      } else if (hit.usedAt) {
        setCouponMsg('This coupon has already been used on another order.');
      } else if (subtotal < hit.minOrder) {
        setCouponMsg(`This coupon needs a minimum order of ${formatINR(hit.minOrder)}.`);
      } else {
        haptic.light();
        setCoupon(code);
      }
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = (): void => {
    setCoupon('');
    setCouponMsg(null);
  };

  const placeOrderNow = async (): Promise<void> => {
    // Guard against double submission before any async work happens.
    if (placingLock.current) return;
    if (items.length === 0) {
      navigation.goBack();
      return;
    }
    if (!selectedAddress) {
      setPlaceError('Please add a delivery address first.');
      return;
    }
    if (payment === 'wallet' && walletShort > 0 && isApiEnabled) {
      setPlaceError(`Insufficient wallet balance — add ₹${formatINR(walletShort)} or choose another payment method.`);
      return;
    }

    placingLock.current = true;
    setPlacing(true);
    setPlaceError(null);
    try {
      await placeOrder({
        module,
        items,
        deliveryFee: delivery,
        // The server consumes the coupon and prices it authoritatively; the
        // client only previews the bill (same rules, mirror image).
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        address: `${selectedAddress.label}, ${selectedAddress.line}, ${selectedAddress.city} ${selectedAddress.pin}`.trim(),
        payBy: payment === 'wallet' ? 'wallet' : 'cod',
        etaMinutes: module === 'food' ? 25 : 0,
        // "If any product is not available" preference chosen in the cart -
        // travels with the order so ops/fulfilment can honour it.
        instructions: availPrefFor(module),
      });
      haptic.success();
      items.forEach((i) => remove(i.id));
      setAvailPref(module, null);
      setDone(true);
    } catch (err) {
      console.warn('[checkout] could not place order:', err);
      setPlaceError(err instanceof Error && err.message ? err.message : 'Order could not be placed. Please try again.');
    } finally {
      placingLock.current = false;
      setPlacing(false);
    }
  };

  const saveAddress = async (): Promise<void> => {
    if (!addr.label.trim() || !addr.line.trim() || !addr.city.trim() || !addr.pin.trim()) return;
    const payload = {
      label: addr.label.trim(),
      line: addr.line.trim(),
      city: addr.city.trim(),
      pin: addr.pin.trim(),
    };
    setAddrSaving(true);
    try {
      if (isApiEnabled) {
        try {
          const saved = await addAddressToServer(payload);
          setExtraAddresses((prev) => [...prev, saved]);
          setAddressId(saved.id);
          setSheetOpen(false);
          haptic.success();
          setAddr({ label: '', line: '', city: '', pin: '' });
          return;
        } catch (err) {
          console.warn('[checkout] address not synced with server:', err);
          setPlaceError('Address could not be saved on the server - kept locally for this session.');
        }
      } else {
        // Demo latency so the Save button's busy state is visible offline.
        await new Promise((r) => setTimeout(r, 600));
      }

      const local: Address = { id: `local-${Date.now()}`, ...payload, isDefault: false };
      setExtraAddresses((prev) => [...prev, local]);
      setAddressId(local.id);
      setSheetOpen(false);
      haptic.success();
      setAddr({ label: '', line: '', city: '', pin: '' });
    } finally {
      setAddrSaving(false);
    }
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
          {addresses.length === 0 ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginVertical: 8 }}>
              No saved address yet - add one below.
            </Text>
          ) : null}
          {addresses.map((a) => (
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
          {availPrefFor(module) ? (
            <View style={styles.availNote}>
              <Icon name="info" size={14} color="#9C005E" />
              <Text variant="caption" color="#8B0057" style={{ marginLeft: 6, flex: 1 }}>
                If an item is unavailable: {availPrefFor(module)}
              </Text>
            </View>
          ) : null}
        </Card>

        <Card variant="alt" style={{ marginTop: 14 }}>
          <View style={styles.sectionHead}>
            <Icon name="creditCard" size={18} color={colors.brand[600]} />
            <Text variant="title" weight="bold" color={colors.text}>
              Payment method
            </Text>
          </View>
          {payOptions.map((p) => (
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
          {payment === 'wallet' && walletShort > 0 ? (
            <Text variant="caption" color={colors.danger} style={{ marginTop: 6, paddingHorizontal: 4 }}>
              Short by {formatINR(walletShort)} — add money to your wallet or pick another method.
            </Text>
          ) : null}
        </Card>

        <Card variant="alt" style={{ marginTop: 14 }}>
          <View style={styles.sectionHead}>
            <Icon name="tag" size={18} color={colors.brand[600]} />
            <Text variant="title" weight="bold" color={colors.text}>
              Coupon
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Input
                label={appliedCoupon ? 'Applied code' : 'Coupon code'}
                value={coupon}
                onChangeText={(t) => {
                  setCoupon(t);
                  setCouponMsg(null);
                }}
                placeholder="e.g. AURA50"
                leftIcon="tag"
                autoCapitalize="characters"
                editable={!appliedCoupon}
              />
            </View>
            {appliedCoupon ? (
              <Button
                variant="ghost"
                size="sm"
                title="Remove"
                leftIcon="x"
                fullWidth={false}
                onPress={removeCoupon}
                style={{ marginLeft: 8, marginTop: 26 }}
              />
            ) : (
              <Button
                variant="secondary"
                size="sm"
                title="Apply"
                loading={couponBusy}
                disabled={coupon.trim().length === 0}
                fullWidth={false}
                onPress={applyCoupon}
                style={{ marginLeft: 8, marginTop: 26 }}
              />
            )}
          </View>
          {couponMsg ? (
            <Text variant="caption" color={colors.danger} style={{ marginTop: -6 }}>
              {couponMsg}
            </Text>
          ) : null}
          {appliedCoupon && couponValid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6 }}>
              <Icon name="check" size={14} color={colors.success} />
              <Text variant="caption" color={colors.success} weight="semibold" style={{ marginLeft: 6 }}>
                {appliedCoupon.code} applied — {appliedCoupon.title}
              </Text>
            </View>
          ) : null}
          {appliedCoupon && !couponValid ? (
            <Text variant="caption" color={colors.danger} style={{ marginTop: -6 }}>
              Cart no longer qualifies — minimum order {formatINR(appliedCoupon.minOrder)}.
            </Text>
          ) : null}
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
            <Text variant="body" color={delivery === 0 ? colors.success : colors.text}>
              {freeDeliveryCoupon ? 'FREE (FREEDEL)' : delivery === 0 ? 'FREE' : formatINR(delivery)}
            </Text>
          </View>
          {discount > 0 ? (
            <View style={styles.billRow}>
              <Text variant="body" color={colors.textSecondary}>Coupon discount ({coupon})</Text>
              <Text variant="body" weight="bold" color={colors.success}>− {formatINR(discount)}</Text>
            </View>
          ) : null}
          <View style={[styles.billRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
            <Text variant="title" weight="bold" color={colors.text}>Total</Text>
            <Text variant="title" weight="bold" color={colors.text}>{formatINR(total)}</Text>
          </View>
        </Card>
        <View style={{ height: 8 }} />
      </Screen>

      {placeError ? (
        <View
          style={{
            position: 'absolute',
            left: layout.contentHorizontalPadding,
            right: layout.contentHorizontalPadding,
            bottom: barBottom + 84,
          }}
        >
          <Text
            variant="caption"
            color={colors.danger}
            style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}
          >
            {placeError}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { bottom: barBottom }]}>
        <View style={styles.footerInner}>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.85)">To pay</Text>
            <Text variant="title" weight="bold" color={colors.white}>{formatINR(total)}</Text>
          </View>
          <Button
            title={placing ? 'Placing…' : 'Place order'}
            onPress={() => void placeOrderNow()}
            variant="secondary"
            leftIcon="lock"
            size="lg"
            loading={placing}
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
        <Button title="Save address" fullWidth style={{ marginTop: 4 }} loading={addrSaving} onPress={() => void saveAddress()} leftIcon="check" />
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
    borderRadius: radius.lg,
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
  availNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F9',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E4BBD8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
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
    minHeight: 72,
    paddingVertical: 8,
    paddingLeft: 22,
    paddingRight: 8,
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
