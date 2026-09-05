import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { Divider, EmptyState, Tag } from '@/components/ui/Primitives';
import { MetaRow } from '@/components/list/ListRow';
import { SmartImage } from '@/components/ui/SmartImage';
import { TrackingStepper } from '@/components/orders/TrackingStepper';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { cancelOrder, canCancel, getOrder, isRunning } from '@/api/orders';
import { ApiError } from '@/api/client';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { useSession } from '@/context/SessionContext';
import { buildLine, useCart, type Selection } from '@/context/CartContext';
import { radius, spacing, feedback } from '@/theme/tokens';
import { dayLabel, minutes, money, relative } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav, Route } from '@/navigation/types';
import type { Order } from '@/types';

/**
 * Order detail: live stepper, the store's own status line, invoice, rider card,
 * cancel (free until the store confirms) and reorder.
 */
export function OrderDetailScreen({ navigation, route }: { navigation: Nav; route: Route<'OrderDetail'> }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);

  const query = useQuery<Order>(useCallback(() => getOrder(route.params.id), [route.params.id]));
  const order = query.data;

  const chooseCancelReason = async (current: Order): Promise<void> => {
    const reason = await sheet.pick({
      title: 'Why are you cancelling?',
      subtitle: 'The store is notified right away',
      options: feedback.cancelReasons.map((text) => ({ label: text, value: text, icon: 'info' as IconName })),
    });
    if (!reason) return;
    const ok = await sheet.confirm({
      title: 'Cancel this order?',
      message: `${current.code} will be cancelled. Wallet payments are refunded instantly; loyalty points from it are removed.`,
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      destructive: true,
      icon: 'alert',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await cancelOrder(current.id, reason);
      haptic.warning();
      query.refresh();
      sheet.show({
        title: 'Order cancelled',
        message: `${current.code} is cancelled. ${current.walletPaid > 0 ? `${money(current.walletPaid)} was refunded to your wallet.` : 'Nothing was charged.'}`,
        icon: 'circleCheck',
        tone: 'success',
        dismissLabel: 'Back to orders',
      });
    } catch (error) {
      sheet.error('Could not cancel', error instanceof ApiError ? error.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (current: Order): Promise<void> => {
    cart.clear(current.module);
    current.items.forEach((line) => {
      const selection: Selection = { item: { id: line.refId, name: line.name, price: line.unitPrice, image: line.image } as never, qty: line.qty };
      cart.add(current.module, { ...buildLine(current.module, selection), outletId: current.outletId ?? '', outletName: current.outletId ? `Outlet ${current.outletId.slice(-4)}` : 'Aurasure' });
    });
    haptic.success();
    sheet.show({
      title: 'Items added to cart',
      message: `${current.items.length} item${current.items.length === 1 ? '' : 's'} from ${current.code}.`,
      icon: 'cart',
      tone: 'success',
      dismissLabel: 'Stay here',
      actions: [{ label: 'Review cart', onPress: () => navigation.navigate('Cart'), variant: 'primary' }],
    });
  };

  const call = async (phone?: string): Promise<void> => {
    if (!phone) {
      sheet.info('No number yet', 'A rider number appears here as soon as someone is assigned.');
      return;
    }
    const ok = await sheet.confirm({ title: 'Call?', message: `Dial ${phone}`, confirmLabel: 'Call', icon: 'phone' });
    if (!ok) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      sheet.info('Calling unavailable', `Dial ${phone} from your phone app.`);
    }
  };

  if (query.loading) {
    return (
      <Screen title="Order" back>
        <SkeletonList rows={4} thumb={32} />
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen title="Order" back>
        <EmptyState icon="package" title="Order not found" subtitle={query.error?.message ?? 'It may have been removed.'} actionLabel="My orders" onAction={() => navigation.navigate('Tabs')} />
      </Screen>
    );
  }

  const running = isRunning(order);
  const cancelable = canCancel(order);

  return (
    <Screen
      title={order.code}
      subtitle={`${dayLabel(order.placedAt)} · ${relative(order.placedAt)}`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      headerRight={<IconButton name="refresh" accessibilityLabel="Refresh" onPress={query.refresh} size={34} iconSize={17} />}
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm, gap: 8 }}>
          {running ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cancelable ? <Button title={busy ? 'Cancelling…' : 'Cancel order'} variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => void chooseCancelReason(order)} /> : null}
              <Button title="Track" variant={cancelable ? 'secondary' : 'primary'} icon="navigation" style={{ flex: 1 }} onPress={() => navigation.navigate('TrackOrder', { id: order.id })} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Reorder" icon="refresh" style={{ flex: 1 }} onPress={() => void reorder(order)} />
              <Button title="Help" variant="secondary" icon="chat" onPress={() => navigation.navigate('Help')} />
            </View>
          )}
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <TrackingStepper order={order} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag label={order.module === 'food' ? 'Food' : 'Shop'} icon={order.module === 'food' ? 'utensils' : 'store'} tone="muted" />
          <Tag label={order.payBy === 'wallet' ? 'Paid by wallet' : 'Cash on delivery'} icon={order.payBy === 'wallet' ? 'wallet' : 'cash'} tone="muted" />
          {order.etaMinutes > 0 ? <Tag label={running ? `~${minutes(order.etaMinutes)} left` : `${minutes(order.etaMinutes)} eta`} icon="clock" tone="muted" /> : null}
          {order.couponCode ? <Tag label={order.couponCode} icon="coupon" tone="success" /> : null}
        </View>

        {/* Items */}
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 4 }}>
            <Text variant="overline" tone="faint">
              {order.items.length} ITEM{order.items.length === 1 ? '' : 'S'}
            </Text>
          </View>
          {order.items.map((line, index) => (
            <View key={line.id}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('Item', { module: line.kind, id: line.refId })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}
              >
                <View style={{ width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
                  <SmartImage source={line.image} name={line.name} style={{ width: 44, height: 44 }} radiusOverride={radius.sm} />
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
                <Text variant="micro" tone="muted">
                  {line.qty}×
                </Text>
                <Text variant="bodySm" weight="bold">
                  {money(line.unitPrice * line.qty)}
                </Text>
              </Pressable>
              {index < order.items.length - 1 ? <Divider inset={false} /> : null}
            </View>
          ))}
        </View>

        {/* Invoice */}
        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
            BILL
          </Text>
          <MetaRow label="Item total" value={money(order.itemTotal)} />
          <MetaRow label="Delivery fee" value={order.deliveryFee === 0 ? 'FREE' : money(order.deliveryFee)} tone={order.deliveryFee === 0 ? 'success' : undefined} />
          {order.discount > 0 ? <MetaRow label="Coupon discount" value={`-${money(order.discount)}`} tone="success" /> : null}
          <View style={styles.rule} />
          <MetaRow label="Total" value={money(order.total)} strong />
          {order.walletPaid > 0 ? <MetaRow label="Paid from wallet" value={money(order.walletPaid)} /> : <MetaRow label="Pay on delivery" value={money(order.total)} />}
          {order.loyaltyEarned > 0 ? <MetaRow label="Loyalty points" value={`+${order.loyaltyEarned}`} tone="success" /> : null}
        </View>

        {/* Address + note */}
        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Icon name="mapPin" size={16} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" weight="bold">
                {order.address.split(',')[0] ?? 'Delivery address'}
              </Text>
              <Text variant="micro" tone="muted">
                {order.address}
              </Text>
            </View>
          </View>
          {order.instructions ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Icon name="note" size={16} color={c.textSecondary} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {order.instructions}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Rider */}
        {order.deliveryPartnerName || order.deliveryPartnerPhone ? (
          <FlushSurface style={{ backgroundColor: c.surface, borderRadius: radius.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bike" size={19} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="bold">
                  {order.deliveryPartnerName ?? 'Your rider'}
                </Text>
                <Text variant="micro" tone="muted">
                  {order.deliveryPartnerPhone ?? 'Number shared when the order is picked up'}
                </Text>
              </View>
              <IconButton name="phone" accessibilityLabel="Call rider" onPress={() => void call(order.deliveryPartnerPhone)} size={36} iconSize={17} tone="primary" />
            </View>
          </FlushSurface>
        ) : null}

        {order.cancelReason ? (
          <View style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.dangerBg }}>
            <Text variant="caption" color={c.danger}>
              Cancelled — {order.cancelReason}
            </Text>
          </View>
        ) : null}

        {order.status === 'delivered' && user ? (
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceHi, gap: 4 }}>
            <Text variant="subtitle" weight="bold">
              Thanks for ordering
            </Text>
            <Text variant="caption" tone="muted">
              You now have {money(user.wallet)} in your wallet and {user.loyaltyPoints} loyalty points ({user.loyaltyPoints >= 100 ? `worth ${money(Math.floor(user.loyaltyPoints / 100) * 10)}` : '100 points = ₹10'}).
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)', marginVertical: 6 },
});
