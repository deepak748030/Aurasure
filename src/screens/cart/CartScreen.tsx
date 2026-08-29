import React, { useEffect, useState } from 'react';
import { useFloatingBarBottomInset } from '@/hooks/useBottomInset';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '../../components/ui/SmartImage';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCart } from '../../context/CartContext';
import { useModuleCart } from '../../hooks/useModuleCart';
import { switchTab } from '@/navigation/RootNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../navigation/types';
import { colors } from '@/theme/colors';
import { layout, radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { CartItem } from '@/types';

const DELIVERY_FEE = 29;

type Props = NativeStackScreenProps<CartStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props): React.ReactElement {
  const barBottom = useFloatingBarBottomInset(10);
  const { setQty, remove } = useCart();
  const { module, items, subtotal } = useModuleCart();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = (): void => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const delivery = subtotal > 149 || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  const goCheckout = (): void => {
    void navigation.navigate('Checkout');
  };

  const footer = items.length > 0 ? (
    <View style={[styles.footer, { bottom: barBottom }]}>
      <View style={styles.footerInner}>
        <View>
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            {delivery === 0 ? 'Free delivery' : `Delivery ₹${formatINR(delivery)}`}
          </Text>
          <Text variant="title" weight="bold" color={colors.white}>
            {formatINR(total)}
          </Text>
        </View>
        <Button title="Checkout" variant="secondary" onPress={goCheckout} leftIcon="arrowRight" />
      </View>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen
        title="My Cart"
        subtitle={items.length > 0 ? `${items.length} item(s)` : undefined}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentStyle={{ paddingBottom: items.length > 0 ? 100 : 8 }}
        scroll
      >
        {items.length === 0 && !loading ? (
          <EmptyState
            icon="cart"
            title="Your cart is empty"
            subtitle={module === 'food' ? "Add dishes from a nearby restaurant and they'll show up here." : "Add products from the store and they'll show up here."}
            actionLabel="Browse now"
            onAction={() => switchTab('Home')}
          />
        ) : null}

        {loading
          ? [1, 2, 3].map((k) => (
              <View key={k} style={{ marginBottom: 12 }}>
                <View style={[styles.rowCard, { flexDirection: 'row', padding: 12 }]}>
                  <Skeleton width={64} height={64} radius={radius.md} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
                    <Skeleton width="30%" height={13} style={{ marginTop: 10 }} />
                  </View>
                </View>
              </View>
            ))
          : items.map((item) => <CartRow key={item.id} item={item} onQty={(q) => setQty(item.id, q)} onRemove={() => remove(item.id)} />)}

        {!loading && items.length > 0 ? (
          <Card variant="alt" style={{ marginTop: 4 }}>
            <Text variant="title" weight="bold" color={colors.text}>
              Bill details
            </Text>
            <View style={styles.billRow}>
              <Text variant="body" color={colors.textSecondary}>
                Item total
              </Text>
              <Text variant="body" color={colors.text}>
                {formatINR(subtotal)}
              </Text>
            </View>
            <View style={styles.billRow}>
              <Text variant="body" color={colors.textSecondary}>
                Delivery fee
              </Text>
              <Text variant="body" color={delivery === 0 ? colors.success : colors.text}>
                {delivery === 0 ? 'FREE' : formatINR(delivery)}
              </Text>
            </View>
            <View style={[styles.billRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
              <Text variant="title" weight="bold" color={colors.text}>
                Total
              </Text>
              <Text variant="title" weight="bold" color={colors.text}>
                {formatINR(total)}
              </Text>
            </View>
          </Card>
        ) : null}
        <View style={{ height: 8 }} />
      </Screen>
      {footer}
    </View>
  );
}

function CartRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (qty: number) => void;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <View style={styles.rowCard}>
      <SmartImage source={item.image} placeholderIcon={item.kind === 'food' ? 'utensils' : 'bag'} style={styles.thumb} tint={colors.brand[50]} />
      <View style={styles.rowInfo}>
        <Text variant="title" weight="semibold" color={colors.text} numberOfLines={1}>
          {item.name}
        </Text>
        {item.meta ? <Text variant="caption" color={colors.textSecondary}>{item.meta}</Text> : null}
        <Text variant="subtitle" weight="bold" color={colors.text} style={{ marginTop: 4 }}>
          {formatINR(item.unitPrice * item.qty)}
        </Text>
        <View style={styles.rowActions}>
          <View style={styles.stepper}>
            <Pressable onPress={() => { haptic.light(); onQty(Math.max(1, item.qty - 1)); }} style={styles.stepBtn}>
              <Icon name="minus" size={16} color={colors.text} />
            </Pressable>
            <Text variant="subtitle" weight="bold" color={colors.text} style={{ minWidth: 26, textAlign: 'center' }}>
              {item.qty}
            </Text>
            <Pressable onPress={() => { haptic.light(); onQty(item.qty + 1); }} style={styles.stepBtn}>
              <Icon name="plus" size={16} color={colors.text} />
            </Pressable>
          </View>
          <Pressable onPress={() => { haptic.medium(); onRemove(); }} hitSlop={8}>
            <Icon name="trash" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: layout.contentHorizontalPadding,
    right: layout.contentHorizontalPadding,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand[600],
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
