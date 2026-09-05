import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon, type IconName } from '@/lib/icons';
import { Divider, EmptyState, Tag } from '@/components/ui/Primitives';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { CouponCard } from '@/components/rewards/CouponCard';
import { useCart, buildSlots } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing, feedback } from '@/theme/tokens';
import { money } from '@/lib/format';
import { useAppSettings } from '@/hooks/useAppSettings';
import { fetchDeliveryEstimate } from '@/api/app';
import { useQuery } from '@/hooks/useQuery';
import { createOrder } from '@/api/orders';
import { PaymentSheet } from '@/components/payments/PaymentSheet';
import type { PayMethod } from '@/api/payments';
import { ApiError } from '@/api/client';
import { isCouponUsable } from '@/api/rewards';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';
import type { ModuleKey, PayBy } from '@/types';

/** Shown only until `/app/settings` loads — the live methods always win. */
const FALLBACK_PAYMENTS: { key: PayBy; label: string; sub: string; icon: IconName; enabled: boolean }[] = [
  { key: 'cod', label: 'Cash on delivery', sub: 'Pay the rider when it arrives', icon: 'cash', enabled: true },
  { key: 'wallet', label: 'Aurasure wallet', sub: 'Deducted instantly, refunded on cancellation', icon: 'wallet', enabled: true },
  { key: 'upi', label: 'UPI / Paytm / PhonePe', sub: 'Pay online with Razorpay', icon: 'upi', enabled: true },
  { key: 'card', label: 'Debit / credit card', sub: 'Visa, Mastercard, RuPay', icon: 'creditCard', enabled: true },
  { key: 'netbanking', label: 'Net banking', sub: 'All major Indian banks', icon: 'bank', enabled: true },
];

const FALLBACK_TIPS = [0, 10, 20, 30, 50];
const CHECKOUT_PAY_BY = ['cod', 'wallet', 'upi', 'card', 'netbanking'] as const;
type OnlinePayBy = Extract<PayBy, PayMethod>;

function isCheckoutPayBy(value: string): value is PayBy {
  return CHECKOUT_PAY_BY.includes(value as PayBy);
}

function onlineMethodFor(payBy: PayBy): OnlinePayBy | null {
  return payBy === 'upi' || payBy === 'card' || payBy === 'netbanking' ? payBy : null;
}

/**
 * Checkout. Same block order as `features/checkout/*` in the reference app:
 * outlet → address → delivery option → instructions → time slot → note → tips →
 * coupon → payment → pay bar. Totals are a preview; the server recomputes the
 * invoice when the order is created and that response is what the success
 * screen and the order record show.
 */
export function CheckoutScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { user, isLoggedIn, addresses, selectedAddress, selectedAddressId, setSelectedAddressId, module: browsing } = useSession();
  const [placing, setPlacing] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [payOpenMethod, setPayOpenMethod] = useState<OnlinePayBy | null>(null);

  // Whichever cart actually has lines wins; ties fall back to what the user is
  // browsing. (Hardcoding 'food' sent shop-only carts to an empty checkout.)
  const module: ModuleKey = cart.lines[browsing].length > 0 ? browsing : cart.lines.food.length > 0 ? 'food' : cart.lines.shop.length > 0 ? 'shop' : browsing;
  const settings = useAppSettings();
  const payments = settings.data?.payments ?? FALLBACK_PAYMENTS;
  const tips = settings.data?.checkout.tips ?? FALLBACK_TIPS;
  const estimate = useQuery(
    useCallback(
      (signal: AbortSignal) => fetchDeliveryEstimate(module, selectedAddress?.city || undefined, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [module, selectedAddress?.city, isLoggedIn],
    ),
    { enabled: isLoggedIn },
  );
  const lines = cart.linesFor(module);
  const outlet = cart.outletFor(module);
  const itemTotal = cart.totalFor(module);
  const coupon = cart.couponFor(module);
  const discount = cart.discountFor(module);
  const deliveryFee = cart.deliveryType === 'pickup' ? 0 : outlet?.deliveryFee ?? 0;
  const tip = cart.tip[module];
  const toPay = Math.max(0, itemTotal + deliveryFee - discount);
  const slots = useMemo(() => {
    const list = buildSlots();
    const eta = estimate.data?.label;
    if (eta && list[0]) list[0] = { ...list[0], sub: eta };
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.data?.label]);
  const activeSlot = slots.find((slot) => slot.id === cart.slotId) ?? slots[0] ?? { id: 'asap', label: 'As soon as possible', sub: 'Usually 20-35 min', etaMinutes: null };

  const eligible = useMemo(() => (user?.coupons ?? []).filter((row) => isCouponUsable(row, itemTotal).ok), [user, itemTotal]);

  const addressText = useMemo(() => {
    if (cart.deliveryType === 'pickup') return `Pickup · ${outlet?.name ?? 'store'}`;
    if (!selectedAddress) return '';
    return [selectedAddress.label, selectedAddress.line, selectedAddress.city, selectedAddress.pin].filter(Boolean).join(', ');
  }, [cart.deliveryType, outlet?.name, selectedAddress]);

  const walletShort = cart.payBy === 'wallet' && toPay > (user?.wallet ?? 0);

  const place = async (): Promise<void> => {
    if (lines.length === 0) {
      sheet.warning('Nothing to order', 'Your cart is empty — add an item first.');
      return;
    }
    if (!isLoggedIn) {
      sheet.show({
        title: 'Sign in to place the order',
        message: 'Orders are linked to your Aurasure account so you can track and cancel them.',
        icon: 'user',
        tone: 'info',
        dismissLabel: 'Not now',
        actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }],
      });
      return;
    }
    if (cart.deliveryType === 'delivery' && !selectedAddress) {
      const ok = await sheet.confirm({
        title: 'Add a delivery address',
        message: 'We need somewhere to bring this order.',
        confirmLabel: 'Add address',
        cancelLabel: 'Cancel',
        icon: 'mapPin',
      });
      if (ok) navigation.navigate('AddressEdit', {});
      return;
    }
    let payBy: PayBy = cart.payBy;
    if (walletShort) {
      const ok = await sheet.confirm({
        title: 'Wallet is short',
        message: `You need ${money(toPay - (user?.wallet ?? 0))} more in your wallet, or pay with cash on delivery.`,
        confirmLabel: 'Add money to wallet',
        cancelLabel: 'Pay cash',
        icon: 'wallet',
      });
      if (ok) {
        navigation.navigate('Wallet');
        return;
      }
      payBy = 'cod';
      cart.setPayBy('cod');
    }

    const onlineMethod = onlineMethodFor(payBy);
    if (onlineMethod) {
      setPayOpenMethod(onlineMethod);
      return;
    }

    await submitOrder(undefined, payBy);
  };

  const submitOrder = async (paymentId?: string, payByOverride: PayBy = cart.payBy): Promise<void> => {
    setPlacing(true);
    try {
      const result = await createOrder({
        module,
        items: lines,
        address: addressText,
        deliveryFee,
        payBy: payByOverride,
        ...(paymentId ? { paymentId } : {}),
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
        ...(activeSlot.etaMinutes ? { etaMinutes: activeSlot.etaMinutes } : {}),
        instructions: cart.buildInstructions(module) || undefined,
      });
      cart.clear(module);
      haptic.success();
      navigation.replace('OrderSuccess', { id: result.order.id });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const code = apiError?.code ?? '';
      if (code === 'OUTLET_CLOSED') {
        sheet.show({
          title: 'Store just closed',
          message: 'The kitchen closed while you were checking out. Nothing was charged — your cart is intact.',
          icon: 'clock',
          tone: 'warning',
          dismissLabel: 'Keep shopping',
        });
      } else if (code === 'COUPON_UNAVAILABLE' || code === 'COUPON_MIN_ORDER') {
        cart.setCoupon(module, null);
        sheet.error('Coupon not applied', `${apiError?.message}\n\nThe coupon was removed from your cart so you can order without it.`);
      } else if (code === 'ITEM_UNAVAILABLE') {
        sheet.show({
          title: 'An item went off the menu',
          message: `${apiError?.message}\n\nRemove it and place the order again.`,
          icon: 'package',
          tone: 'danger',
          dismissLabel: 'Back to cart',
          actions: [{ label: 'Open cart', onPress: () => navigation.navigate('Cart'), variant: 'secondary' }],
        });
      } else if (code === 'DB_DISCONNECTED') {
        sheet.error('Server is not ready', 'The API is up but its database is not connected. Ask the operator to start MongoDB, then try again.');
      } else {
        sheet.error('Order not placed', apiError?.message ?? 'Check your connection and try again.');
      }
    } finally {
      setPlacing(false);
    }
  };

  const chooseAddress = async (): Promise<void> => {
    if (addresses.length === 0) {
      navigation.navigate('AddressEdit', {});
      return;
    }
    const value = await sheet.pick({
      title: 'Deliver to',
      subtitle: 'Saved addresses on your account',
      options: addresses.map((address) => ({
        label: address.label,
        value: address.id,
        description: `${address.line}, ${address.city} ${address.pin}${address.isDefault ? ' · default' : ''}`,
        icon: 'mapPin' as IconName,
      })),
    });
    if (value) setSelectedAddressId(value);
  };

  const chooseSlot = async (): Promise<void> => {
    const value = await sheet.pick({
      title: 'When should it arrive?',
      options: slots.map((slot) => ({ label: slot.label, value: slot.id, description: slot.sub, icon: 'clock' as IconName })),
    });
    if (value) cart.setSlot(value);
  };

  const selectPayment = (row: { key: string; label: string; sub: string; icon: IconName; enabled: boolean }): void => {
    if (!row.enabled) {
      sheet.show({
        title: `${row.label} is not available yet`,
        message: row.sub,
        icon: 'info',
        tone: 'info',
        dismissLabel: 'OK',
      });
      return;
    }
    if (!isCheckoutPayBy(row.key)) {
      sheet.show({
        title: `${row.label} is handled inside Razorpay`,
        message: 'Choose UPI / online payment at checkout, then complete this option in Razorpay.',
        icon: 'creditCard',
        tone: 'info',
        dismissLabel: 'OK',
      });
      return;
    }
    if (cart.payBy !== row.key) haptic.selection();
    cart.setPayBy(row.key);
  };

  const pickTip = async (): Promise<void> => {
    const value = await sheet.pick({
      title: 'Tip your delivery partner',
      subtitle: 'Added to the order note — hand it to the rider in cash',
      options: tips.map((amount) => ({ label: amount === 0 ? 'No tip' : `₹${amount}`, value: String(amount), icon: 'bike' as IconName })),
    });
    if (value === null) return;
    cart.setTip(module, Number(value) || 0);
  };

  const editNote = (): void => setNoteDraft(cart.note[module] || '');

  if (lines.length === 0) {
    return (
      <Screen title="Checkout" back>
        <EmptyState icon="cart" title="Nothing to check out" subtitle="Your cart was emptied — add items and come back." actionLabel="Browse" onAction={() => navigation.navigate('Tabs')} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Checkout"
      subtitle={`${lines.length} item${lines.length === 1 ? '' : 's'} · ${outlet?.name || 'one store'}`}
      back
      scroll
      padded={false}
      keyboardAvoiding
      stickyFooter={
        <View style={[styles.payBar, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
          <View style={{ flex: 1 }}>
            <Text variant="micro" tone="faint">
              {cart.payBy === 'wallet' ? 'Pay from wallet' : cart.payBy === 'cod' ? 'Pay on delivery' : 'Pay online'}
            </Text>
            <Text variant="h2" weight="bold">
              {money(toPay)}
            </Text>
          </View>
          <Button title={placing ? 'Placing order…' : 'Place order'} size="lg" loading={placing} onPress={() => void place()} iconRight={placing ? undefined : 'check'} />
        </View>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
          {/* Outlet + module */}
          <FlushSurface style={{ backgroundColor: c.surface, borderRadius: radius.lg, marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
              <View style={[styles.plate, { backgroundColor: c.primarySoft }]}>
                <Icon name={module === 'food' ? 'storefront' : 'store'} size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="title" weight="semibold">
                  {outlet?.name || 'Aurasure store'}
                </Text>
                <Text variant="micro" tone="muted">
                  {activeSlot.id === 'asap' ? `Arrives in ~${outlet?.etaMinutes ?? 30} min` : `Scheduled for ${activeSlot.label}`}
                </Text>
              </View>
              <Tag label={module === 'food' ? 'FOOD' : 'SHOP'} tone="muted" />
            </View>
          </FlushSurface>

          {/* Items */}
          <View>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              IN THIS ORDER
            </Text>
            <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
              {lines.map((line, index) => (
                <View key={line.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
                    <View style={[styles.qtyBadge, { backgroundColor: c.primarySoft }]}>
                      <Text variant="caption" weight="semibold" color={c.primary}>
                        {line.qty}×
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodySm" weight="semibold" numberOfLines={1}>
                        {line.name}
                      </Text>
                      {line.meta ? (
                        <Text variant="micro" tone="faint" numberOfLines={1}>
                          {line.meta}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="bodySm" weight="semibold">
                      {money(line.linePrice * line.qty)}
                    </Text>
                  </View>
                  {index < lines.length - 1 ? <Divider inset={false} /> : null}
                </View>
              ))}
            </View>
          </View>

          {/* Address */}
          <ListSection title="Delivery" action="Change" onAction={() => void chooseAddress()}>
            <ListRow
              title={cart.deliveryType === 'pickup' ? 'Store pickup' : selectedAddress ? selectedAddress.label : 'Add a delivery address'}
              subtitle={cart.deliveryType === 'pickup' ? `Collect from ${outlet?.name ?? 'the store'}` : addressText || 'Tap to choose where this order goes'}
              icon={cart.deliveryType === 'pickup' ? 'bag' : 'mapPin'}
              onPress={() => void chooseAddress()}
            />
            <ListRow
              title={cart.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}
              subtitle="Switch between delivery and collecting it yourself"
              icon="truck"
              iconTone="muted"
              onPress={() => cart.setDeliveryType(cart.deliveryType === 'pickup' ? 'delivery' : 'pickup')}
              trailing={
                <View style={[styles.switch, { backgroundColor: cart.deliveryType === 'delivery' ? c.primary : c.borderStrong }]}>
                  <View style={[styles.knob, { transform: [{ translateX: cart.deliveryType === 'delivery' ? 16 : 0 }] }]} />
                </View>
              }
              last
            />
          </ListSection>

          {/* Slot + instructions */}
          <ListSection title="Timing & instructions">
            <ListRow title="Time slot" subtitle={activeSlot.sub === 'Next available' ? activeSlot.label : `${activeSlot.label} · ${activeSlot.sub}`} icon="clock" onPress={() => void chooseSlot()} />
            <ListRow
              title="If something is unavailable"
              subtitle={feedback.unavailableOptions.find((option) => option.key === cart.unavailablePref[module])?.label ?? 'Not set — the store will call you'}
              icon="info"
              iconTone="warning"
              onPress={() => {
                void (async () => {
                  const value = await sheet.pick({
                    title: 'If something is unavailable',
                    options: feedback.unavailableOptions.map((option) => ({ label: option.label, value: option.key, icon: 'info' as IconName })),
                  });
                  if (value) cart.setUnavailablePref(module, value);
                })();
              }}
            />
            <ListRow title="Note for the store" subtitle={cart.note[module] || 'Add ringface, flat, or packing notes'} icon="edit" iconTone="muted" onPress={editNote} />
            <ListRow
              title="Contactless delivery"
              subtitle="Leave the order at the door and step back"
              icon="shieldCheck"
              iconTone={cart.contactless[module] ? 'success' : 'muted'}
              onPress={() => cart.setContactless(module, !cart.contactless[module])}
              trailing={
                <View style={[styles.switch, { backgroundColor: cart.contactless[module] ? c.primary : c.borderStrong }]}>
                  <View style={[styles.knob, { transform: [{ translateX: cart.contactless[module] ? 16 : 0 }] }]} />
                </View>
              }
            />
            <ListRow title="Tip the rider" subtitle={tip > 0 ? `${money(tip)} cash tip · added to the note` : 'Optional — helps your rider'} icon="bike" iconTone={tip > 0 ? 'success' : 'muted'} onPress={() => void pickTip()} last />
          </ListSection>

          {/* Coupon */}
          <View>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              COUPON
            </Text>
            {coupon ? (
              <CouponCard coupon={coupon} applied itemTotal={itemTotal} onRemove={() => cart.setCoupon(module, null)} />
            ) : eligible.length > 0 ? (
              <View style={{ gap: 0 }}>
                {eligible.slice(0, 2).map((row) => (
                  <CouponCard key={row.id} coupon={row} itemTotal={itemTotal} onPress={() => cart.setCoupon(module, row.code)} />
                ))}
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Coupons')} style={({ pressed }) => [styles.emptyCoupon, { borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}>
                <Icon name="coupon" size={16} color={c.textSecondary} />
                <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
                  No coupon fits a {money(itemTotal)} order yet — tap to browse the coupon centre
                </Text>
                <Icon name="chevronRight" size={15} color={c.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* Payment */}
          <ListSection title="Payment">
            {payments.map((row, index) => {
              const on = cart.payBy === row.key;
              return (
                <ListRow
                  key={row.key}
                  title={row.label}
                  subtitle={row.key === 'wallet' ? `Balance ${money(user?.wallet ?? 0)}${on ? ` · paying ${money(toPay)}` : ''}` : row.sub}
                  icon={row.icon}
                  iconTone={row.enabled ? 'primary' : 'muted'}
                  onPress={() => selectPayment(row)}
                  selected={on}
                  last={index === payments.length - 1}
                  trailing={
                    <View style={[styles.radio, { borderColor: on ? c.primary : c.borderStrong }]}>
                      {on ? <View style={{ width: 10, height: 10, borderRadius: radius.pill, backgroundColor: c.primary }} /> : null}
                    </View>
                  }
                />
              );
            })}
          </ListSection>

          {/* Bill */}
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              BILL SUMMARY
            </Text>
            <MetaRow label="Item total" value={money(itemTotal)} />
            <MetaRow label={cart.deliveryType === 'pickup' ? 'Pickup' : 'Delivery fee'} value={deliveryFee === 0 ? 'FREE' : money(deliveryFee)} tone={deliveryFee === 0 ? 'success' : undefined} />
            {discount > 0 ? <MetaRow label={`Coupon · ${coupon?.code}`} value={`-${money(discount)}`} tone="success" /> : null}
            {tip > 0 ? <MetaRow label="Rider tip (cash)" value={money(tip)} tone="muted" /> : null}
            <View style={styles.rule} />
            <MetaRow label="To pay" value={money(toPay)} strong />
            <Text variant="micro" tone="faint" style={{ paddingTop: 6 }}>
              The store confirms prices when the order is created; your final invoice is shown right after.
            </Text>
          </View>
        </View>

        {/* Note editor */}
        {noteDraft !== null ? (
          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md }}>
            <Input
              label="Note for the store"
              multiline
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Ring the bell twice, gate code 42…"
              hint={`${noteDraft.length}/160 characters`}
              containerStyle={{ marginBottom: spacing.sm }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
              <Button title="Save note" onPress={() => { cart.setNote(module, noteDraft); setNoteDraft(null); }} style={{ flex: 1 }} />
              <Button title="Cancel" variant="secondary" onPress={() => setNoteDraft(null)} />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
      <PaymentSheet
        visible={payOpenMethod != null}
        amount={toPay}
        purpose="order"
        method={payOpenMethod ?? undefined}
        onClose={() => setPayOpenMethod(null)}
        onPaid={(result) => {
          const paidBy = payOpenMethod ?? cart.payBy;
          setPayOpenMethod(null);
          void submitOrder(result.paymentId, paidBy);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  payBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.edge, borderTopWidth: 1 },
  plate: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  qtyBadge: { minWidth: 30, height: 24, paddingHorizontal: 6, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 38, height: 22, borderRadius: radius.pill, padding: 2, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: radius.pill, backgroundColor: '#FFFFFF' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)', marginVertical: 6 },
  emptyCoupon: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', backgroundColor: 'rgba(0,0,0,0.02)' },
});
