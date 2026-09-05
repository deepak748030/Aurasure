import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { MetaRow } from '@/components/list/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { getOrder } from '@/api/orders';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { minutes, money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav, Route } from '@/navigation/types';
import type { Order } from '@/types';

/** Post-place confirmation with the money the customer actually spent. */
export function OrderSuccessScreen({ navigation, route }: { navigation: Nav; route: Route<'OrderSuccess'> }): React.ReactElement {
  const c = useColors();
  const query = useQuery<Order>(useCallback(() => getOrder(route.params.id), [route.params.id]));
  const order = query.data;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptic.success();
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  }, [pop]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Screen scroll={false} back={false} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.edge, paddingVertical: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Animated.View style={[styles.badge, { backgroundColor: c.primary, transform: [{ scale }] }]}>
            <Icon name="check" size={40} color={c.onPrimary} />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="h2" weight="bold" center>
              Order placed
            </Text>
            <Text variant="bodySm" tone="muted" center>
              {order ? `${order.code} · ${order.module === 'food' ? 'Kitchen' : 'Store'} is preparing it` : 'Confirming with the store…'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {query.loading ? (
            <View style={{ paddingTop: spacing.xs }}>
              <SkeletonList rows={3} thumb={0} withDivider={false} />
            </View>
          ) : order ? (
            <>
              <MetaRow label="Items" value={`${order.items.length} · ${money(order.itemTotal)}`} />
              <MetaRow label="Delivery" value={order.deliveryFee === 0 ? 'FREE' : money(order.deliveryFee)} tone={order.deliveryFee === 0 ? 'success' : undefined} />
              {order.discount > 0 ? <MetaRow label={`Coupon · ${order.couponCode ?? ''}`} value={`-${money(order.discount)}`} tone="success" /> : null}
              <View style={styles.rule} />
              <MetaRow label={order.payBy === 'wallet' ? 'Paid from wallet' : 'Pay on delivery'} value={money(order.total)} strong />
              {order.loyaltyEarned > 0 ? <MetaRow label="Loyalty points earned" value={`+${order.loyaltyEarned}`} tone="success" /> : null}
              <View style={styles.rule} />
              <MetaRow label="Arriving" value={`~${minutes(order.etaMinutes)}`} />
              <MetaRow label="Delivering to" value={order.address.split(',')[0] ?? 'your address'} />
            </>
          ) : (
            <Text variant="bodySm" tone="danger">
              {query.error?.message ?? 'The order was created but we could not load the receipt yet.'}
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Button title="Track this order" size="lg" icon="navigation" onPress={() => navigation.replace('OrderDetail', { id: route.params.id })} style={{ alignSelf: 'stretch' }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Back to home" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.popToTop()} />
            <Button title="All orders" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('Tabs')} />
          </View>
        </View>

        <Text variant="micro" tone="faint" center>
          You can cancel for free until the store confirms the order.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 84, height: 84, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)', marginVertical: 6 },
});
