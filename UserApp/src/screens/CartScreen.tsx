import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { Divider, EmptyState, Tag } from '@/components/ui/Primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { CouponCard } from '@/components/rewards/CouponCard';

import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing, feedback } from '@/theme/tokens';
import { money } from '@/lib/format';
import type { Nav } from '@/navigation/types';
import { couponLabel, isCouponUsable } from '@/api/rewards';
import type { CartLine, ModuleKey } from '@/types';

/**
 * Cart / bag. Mirrors `features/cart/widget/*`: outlet block, item rows with a
 * 76×28 stepper, "if unavailable" preference, note, coupon strip, then the
 * bill. Rows are flush (0 vertical gap).
 */
export function CartScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { user, isLoggedIn } = useSession();
  const [module, setModule] = useState<ModuleKey>(cart.lines.food.length > 0 && cart.lines.shop.length === 0 ? 'shop' : cart.lines.shop.length > 0 ? 'food' : 'food');

  const lines = cart.linesFor(module);
  const outlet = cart.outletFor(module);
  const itemTotal = cart.totalFor(module);
  const coupon = cart.couponFor(module);
  const discount = cart.discountFor(module);
  const deliveryFee = cart.deliveryType === 'pickup' ? 0 : outlet?.deliveryFee ?? 0;
  const total = Math.max(0, itemTotal + deliveryFee - discount);
  const belowMin = Boolean(outlet?.minOrder && itemTotal < outlet.minOrder);

  const ownedCoupons = useMemo(() => (user?.coupons ?? []).filter((row) => isCouponUsable(row, itemTotal).ok), [user, itemTotal]);

  const openCouponSheet = async (): Promise<void> => {
    if (!isLoggedIn) {
      sheet.show({
        title: 'Sign in to use coupons',
        message: 'Coupons live in your Aurasure wallet. Sign in and your offers appear here automatically.',
        icon: 'coupon',
        tone: 'info',
        dismissLabel: 'Later',
        actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }],
      });
      return;
    }
    if (ownedCoupons.length === 0) {
      sheet.show({
        title: 'No coupon fits this cart yet',
        message: 'Most offers need a minimum order value. Add a little more, or claim a code from the coupon centre.',
        icon: 'coupon',
        tone: 'warning',
        dismissLabel: 'Close',
        actions: [{ label: 'Open coupon centre', onPress: () => navigation.navigate('Coupons'), variant: 'secondary' }],
      });
      return;
    }
    const chosen = await sheet.pick({
      title: 'Apply a coupon',
      subtitle: `Your ${module === 'food' ? 'cart' : 'bag'} total is ${money(itemTotal)}`,
      options: [
        ...ownedCoupons.map((row) => ({
          label: row.code,
          value: row.code,
          description: `${couponLabel(row)}${cart.couponCode[module] === row.code ? ' · applied' : ''}`,
          icon: 'coupon' as const,
        })),
        ...(cart.couponCode[module] ? [{ label: 'Remove coupon', value: '__none', description: 'Pay the full price', icon: 'x' as const }] : []),
      ],
    });
    if (!chosen) return;
    if (chosen === '__none') {
      cart.setCoupon(module, null);
      sheet.show({ title: 'Coupon removed', message: 'Your order total is back to the full price.', icon: 'info', tone: 'neutral', dismissLabel: 'OK' });
      return;
    }
    cart.setCoupon(module, chosen);
    sheet.success('Coupon applied', `${chosen} will be checked against the minimum order when you place the order.`);
  };

  const pickUnavailablePref = async (): Promise<void> => {
    const value = await sheet.pick({
      title: 'If something is unavailable',
      subtitle: 'Tells the store what to do without calling you',
      options: feedback.unavailableOptions.map((option) => ({ label: option.label, value: option.key, icon: 'info' as const })),
    });
    if (!value) return;
    cart.setUnavailablePref(module, value === cart.unavailablePref[module] ? null : value);
  };

  const editNote = async (): Promise<void> => {
    const value = await sheet.pick({
      title: 'Note for the store',
      subtitle: 'Tap a suggestion or write your own in checkout',
      options: feedback.deliveryInstructions.map((text) => ({ label: text, value: text, icon: 'edit' as const })),
    });
    if (!value) return;
    cart.setNote(module, value);
    sheet.success('Note saved', 'The store will see it with your order.');
  };

  const removeLine = async (line: CartLine): Promise<void> => {
    const ok = await sheet.confirm({
      title: 'Remove item?',
      message: `${line.name} will be taken out of your ${module === 'food' ? 'cart' : 'bag'}.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      destructive: true,
      icon: 'trash',
    });
    if (!ok) return;
    cart.remove(module, line.id);
  };

  const clearCart = async (): Promise<void> => {
    const ok = await sheet.confirm({
      title: `Empty ${module === 'food' ? 'cart' : 'bag'}?`,
      message: 'Every item in this cart will be removed. Your favourites stay saved.',
      confirmLabel: 'Empty cart',
      cancelLabel: 'Cancel',
      destructive: true,
      icon: 'trash',
    });
    if (!ok) return;
    cart.clear(module);
  };

  return (
    <Screen
      title={module === 'food' ? 'Your cart' : 'Your bag'}
      subtitle={lines.length > 0 ? `${cart.countFor(module)} item${cart.countFor(module) === 1 ? '' : 's'} · ${outlet?.name || 'one store'}` : 'Nothing here yet'}
      back={navigation.canGoBack()}
      onRefresh={cart.hydrated ? undefined : undefined}
      headerRight={
        lines.length > 0 ? <IconButton name="trash" accessibilityLabel="Empty cart" onPress={() => void clearCart()} size={34} iconSize={17} /> : undefined
      }
      stickyFooter={
        lines.length > 0 ? (
          <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text variant="micro" tone="faint">
                To pay · {module === 'food' ? 'cart' : 'bag'} total
              </Text>
              <Text variant="h2" weight="bold">
                {money(total)}
              </Text>
            </View>
            <Button
              title={belowMin ? `Add ${money((outlet?.minOrder ?? 0) - itemTotal)} more` : 'Proceed to checkout'}
              iconRight="arrowRight"
              disabled={belowMin}
              size="lg"
              onPress={() => {
                if (!isLoggedIn) {
                  sheet.show({
                    title: 'Sign in to check out',
                    message: 'Orders are tied to your Aurasure account so you can track and cancel them.',
                    icon: 'user',
                    tone: 'info',
                    dismissLabel: 'Not now',
                    actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }],
                  });
                  return;
                }
                navigation.navigate('Checkout');
              }}
            />
          </View>
        ) : undefined
      }
    >
      {/* Cart switch when both modules have items */}
      {cart.lines.food.length > 0 && cart.lines.shop.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 6, padding: spacing.edge, backgroundColor: c.surfaceHi }}>
          {(['food', 'shop'] as ModuleKey[]).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              onPress={() => setModule(key)}
              style={[styles.tab, { backgroundColor: module === key ? c.primary : 'transparent', borderColor: module === key ? c.primary : c.border }]}
            >
              <Icon name={key === 'food' ? 'utensils' : 'store'} size={14} color={module === key ? c.onPrimary : c.textSecondary} />
              <Text variant="caption" weight="bold" color={module === key ? c.onPrimary : c.textSecondary}>
                {key === 'food' ? `Food · ${cart.countFor('food')}` : `Shop · ${cart.countFor('shop')}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {lines.length === 0 ? (
        <EmptyState
          icon={module === 'food' ? 'cart' : 'bag'}
          title={module === 'food' ? 'Your cart is empty' : 'Your bag is empty'}
          subtitle="Add a dish or a daily need and it will wait for you here."
          actionLabel="Browse stores"
          onAction={() => navigation.navigate('Tabs')}
        />
      ) : (
        <View>
          {outlet ? (
            <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm, paddingBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={module === 'food' ? 'storefront' : 'store'} size={15} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="bold">
                  {outlet.name}
                </Text>
                <Text variant="micro" tone="muted">
                  {cart.deliveryType === 'pickup' ? 'Pickup at the store' : `${money(outlet.deliveryFee)} delivery · ${outlet.etaMinutes ?? 30} min`}
                </Text>
              </View>
              <Tag label={module === 'food' ? 'Delivery' : 'Home delivery'} tone="muted" />
            </View>
          ) : null}

          {/* Item rows - flush, hairline separated */}
          <FlushSurface style={{ backgroundColor: c.surface }}>
            {lines.map((line, index) => (
              <View key={line.id}>
                <CartRow
                  line={line}
                  module={module}
                  onInc={() => cart.setQty(module, line.id, Math.min(20, line.qty + 1))}
                  onDec={() => cart.setQty(module, line.id, line.qty - 1)}
                  onRemove={() => void removeLine(line)}
                  onOpen={() => navigation.navigate('Item', { module, id: line.refId })}
                />
                {index < lines.length - 1 ? <Divider inset={false} /> : null}
              </View>
            ))}
          </FlushSurface>

          {/* Options */}
          <ListSection title="Order options">
            <ListRow
              title="If something is unavailable"
              subtitle={feedback.unavailableOptions.find((option) => option.key === cart.unavailablePref[module])?.label ?? 'Ask the store to call me'}
              icon="info"
              onPress={() => void pickUnavailablePref()}
              trailing={<Icon name="chevronRight" size={16} color={c.textTertiary} />}
            />
            <ListRow
              title={module === 'food' ? 'Note for the kitchen' : 'Note for the store'}
              subtitle={cart.note[module] || 'No note yet'}
              icon="edit"
              iconTone="muted"
              onPress={() => void editNote()}
              last
            />
          </ListSection>

          <ListSection title="Delivery">
            <ListRow
              title={cart.deliveryType === 'pickup' ? 'I will pick it up' : 'Deliver to my address'}
              subtitle={cart.deliveryType === 'pickup' ? 'No delivery fee' : 'Change in checkout'}
              icon={cart.deliveryType === 'pickup' ? 'bag' : 'truck'}
              onPress={() => cart.setDeliveryType(cart.deliveryType === 'pickup' ? 'delivery' : 'pickup')}
            />
            <ListRow title="Contactless delivery" subtitle={cart.contactless[module] ? 'Leave it at the door' : 'Hand it to me'} icon="shieldCheck" iconTone={cart.contactless[module] ? 'success' : 'muted'} onPress={() => cart.setContactless(module, !cart.contactless[module])} last />
          </ListSection>

          {/* Coupon */}
          <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.edge }}>
            {coupon ? (
              <CouponCard
                coupon={coupon}
                applied
                itemTotal={itemTotal}
                onRemove={() => {
                  cart.setCoupon(module, null);
                  sheet.show({ title: 'Coupon removed', icon: 'info', tone: 'neutral', dismissLabel: 'OK' });
                }}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openCouponSheet()}
                style={({ pressed }) => [styles.couponStrip, { borderColor: c.primary, opacity: pressed ? 0.9 : 1 }]}
              >
                <Icon name="coupon" size={18} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="subtitle" weight="bold" color={c.primary}>
                    Apply coupon
                  </Text>
                  <Text variant="micro" tone="muted">
                    {ownedCoupons.length > 0 ? `${ownedCoupons.length} offer${ownedCoupons.length === 1 ? '' : 's'} fit this cart` : 'No fitting offer right now'}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={c.primary} />
              </Pressable>
            )}
          </View>

          {/* Bill */}
          <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.edge, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              PRICE DETAILS
            </Text>
            <MetaRow label={`Item total (${lines.length} items)`} value={money(itemTotal)} />
            <MetaRow label="Delivery fee" value={deliveryFee === 0 ? 'FREE' : money(deliveryFee)} tone={deliveryFee === 0 ? 'success' : undefined} />
            {discount > 0 ? <MetaRow label={`Coupon · ${coupon?.code}`} value={`-${money(discount)}`} tone="success" /> : null}
            <View style={styles.rule} />
            <MetaRow label="To pay" value={money(total)} strong />
            {outlet?.minOrder && itemTotal < outlet.minOrder ? (
              <Text variant="micro" color={c.danger} style={{ paddingTop: 6 }}>
                Minimum order at {outlet.name} is {money(outlet.minOrder)}
              </Text>
            ) : null}
            {cart.payBy === 'wallet' ? (
              <Text variant="micro" tone="muted" style={{ paddingTop: 4 }}>
                Wallet balance {money(user?.wallet ?? 0)} · the server takes the wallet first, the rest stays due on delivery
              </Text>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md, gap: 6 }}>
            <Button title={module === 'food' ? 'Add more dishes' : 'Add more products'} variant="secondary" icon="plus" onPress={() => navigation.navigate('Tabs')} style={{ alignSelf: 'stretch' }} />
          </View>
          <View style={{ height: spacing.xxl }} />
        </View>
      )}
    </Screen>
  );
}

function CartRow({
  line,
  module,
  onInc,
  onDec,
  onRemove,
  onOpen,
}: {
  line: CartLine;
  module: ModuleKey;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onOpen: () => void;
}): React.ReactElement {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}>
      <View style={{ width: 68, height: 68, borderRadius: radius.md, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
        <SmartImage source={line.image} name={line.name} style={{ width: 68, height: 68 }} radiusOverride={radius.md} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="title" weight="semibold" numberOfLines={2}>
          {line.name}
        </Text>
        {line.meta ? (
          <Text variant="micro" tone="muted" numberOfLines={2}>
            {line.meta}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="subtitle" weight="bold">
            {money(line.linePrice * line.qty)}
          </Text>
          {line.unitPrice !== line.linePrice ? (
            <Text variant="micro" tone="faint">
              {money(line.unitPrice)} each
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.stepper, { borderColor: c.primary }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Decrease" onPress={line.qty <= 1 ? onRemove : onDec} hitSlop={6} style={styles.stepBtn}>
              <Icon name={line.qty <= 1 ? 'trash' : 'minus'} size={13} color={line.qty <= 1 ? c.danger : c.primary} />
            </Pressable>
            <Text variant="caption" weight="bold" color={c.primary}>
              {line.qty}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Increase" onPress={onInc} hitSlop={6} style={styles.stepBtn}>
              <Icon name="plus" size={13} color={c.primary} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text variant="micro" weight="bold" color={c.textTertiary}>
              Remove
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {module === 'shop' && line.size ? <Tag label={line.size} tone="muted" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, height: 28, borderRadius: radius.pill, borderWidth: 1.2 },
  stepBtn: { paddingHorizontal: 2, paddingVertical: 4 },
  couponStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.2, borderStyle: 'dashed' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)', marginVertical: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.edge, borderTopWidth: 1 },
});
