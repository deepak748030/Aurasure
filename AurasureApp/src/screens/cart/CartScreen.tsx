import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { SmartImage } from '../../components/ui/SmartImage';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useCart } from '../../context/CartContext';
import { useModuleCart } from '../../hooks/useModuleCart';
import { switchTab } from '@/navigation/RootNavigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../navigation/types';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import type { CartItem } from '@/types';

const FREE_DELIVERY_AT = 700;
const DELIVERY_FEE = 29;

const UNAVAILABLE_OPTIONS = [
  'Remove it from my cart',
  "I'll wait until it's restocked",
  'Please cancel the order',
  'Call me ASAP',
  "Notify me when it's back",
];

type Props = NativeStackScreenProps<CartStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props): React.ReactElement {
  const { setQty, remove } = useCart();
  const { module, items, subtotal } = useModuleCart();
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const delivery = subtotal >= FREE_DELIVERY_AT || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const remaining = Math.max(0, FREE_DELIVERY_AT - subtotal);

  const insets = useSafeAreaInsets();
  useScreenBars(colors.appBar);

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      {/* App-bar strip: the status bar / notification bar sits on this. */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.appBar }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={10}>
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <Text variant="h2" weight="bold" color={colors.text}>
          My Cart
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading
          ? [1, 2].map((k) => (
              <View key={k} style={styles.itemCard}>
                <Skeleton width={78} height={78} radius={10} />
                <View style={{ flex: 1, marginLeft: 12, paddingVertical: 4 }}>
                  <Skeleton width="52%" height={15} />
                  <Skeleton width="38%" height={13} style={{ marginTop: 10 }} />
                  <Skeleton width={70} height={13} style={{ marginTop: 12, alignSelf: 'flex-end' }} />
                </View>
              </View>
            ))
          : items.length === 0
          ? (
            <View style={styles.empty}>
              <Icon name="cart" size={42} color={colors.textTertiary} />
              <Text variant="subtitle" color={colors.textSecondary} style={{ marginTop: 12, textAlign: 'center' }}>
                Your cart is empty
              </Text>
              <Button title="Browse products" fullWidth style={{ marginTop: 16 }} onPress={() => switchTab('Home')} />
            </View>
          )
          : items.map((item) => <CartRow key={item.id} item={item} onQty={(q) => setQty(item.id, q)} onRemove={() => remove(item.id)} />)}

        {items.length > 0 ? (
          <>
            <Pressable onPress={() => switchTab('Home')} style={({ pressed }) => [styles.addMore, { opacity: pressed ? 0.9 : 1 }]}>
              <View style={styles.addMoreIcon}>
                <Icon name="plus" size={22} color="#9C005E" />
              </View>
              <Text variant="title" weight="bold" color="#9C005E">
                Add More Items
              </Text>
            </Pressable>

            <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [styles.availability, { opacity: pressed ? 0.92 : 1 }]}>
              <Icon name="info" size={20} color="#9C005E" />
              <Text variant="subtitle" weight="semibold" color={colors.text} style={{ flex: 1, marginLeft: 10 }}>
                If any product is not available
              </Text>
              <View style={styles.chevBox}>
                <Icon name="chevronDown" size={18} color="#9C005E" />
              </View>
            </Pressable>

            {selected ? (
              <View style={styles.availNote}>
                <Icon name="check" size={14} color="#2C9B4D" />
                <Text variant="caption" color="#2C9B4D" weight="semibold" style={{ marginLeft: 6, flex: 1 }}>
                  We'll follow this for your order: {selected}
                </Text>
              </View>
            ) : null}

            <View style={styles.priceCard}>
              <View style={styles.priceHead}>
                <View style={styles.priceHeadIcon}>
                  <Icon name="receipt" size={16} color={colors.white} />
                </View>
                <Text variant="title" weight="bold" color={colors.white} style={{ marginLeft: 10 }}>
                  Price Breakdown
                </Text>
              </View>
              <View style={styles.priceRule} />
              <View style={styles.priceRow}>
                <Text variant="body" color="rgba(255,255,255,0.85)">
                  Item Price
                </Text>
                <Text variant="body" color={colors.white}>
                  {formatINR(subtotal)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text variant="body" color="rgba(255,255,255,0.85)">
                  Discount
                </Text>
                <Text variant="body" color={colors.white}>
                  (-) {formatINR(0)}
                </Text>
              </View>
            </View>

            <View style={styles.freeDelivery}>
              <View style={styles.freeDeliveryIcon}>
                <Icon name="percent" size={18} color="#D4770B" />
              </View>
              <Text variant="subtitle" color="#7A4A00" style={{ flex: 1 }}>
                {delivery === 0 ? 'You have unlocked FREE delivery!' : `₹${remaining} more for free delivery`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((subtotal / FREE_DELIVERY_AT) * 100))}%` }]} />
            </View>

            <View style={styles.subtotalRow}>
              <Text variant="title" weight="bold" color={colors.text}>
                Subtotal
              </Text>
              <Text variant="title" weight="bold" color="#9C005E">
                {formatINR(total)}
              </Text>
            </View>

            <Button title="Confirm Delivery Details" variant="login" leftIcon="cart" rightIcon="arrowRight" fullWidth size="lg" style={{ marginTop: 18 }} onPress={() => navigation.navigate('Checkout')} />
          </>
        ) : null}
        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="If any product is not available">
        <View style={{ paddingBottom: 16 }}>
          {UNAVAILABLE_OPTIONS.map((opt) => {
            const on = selected === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  haptic.selection();
                  setSelected(opt);
                }}
                style={({ pressed }) => [styles.sheetOption, on ? styles.sheetOptionOn : null, { opacity: pressed ? 0.92 : 1 }]}
              >
                <Text variant="subtitle" weight={on ? 'bold' : 'medium'} color={on ? '#9C005E' : colors.text}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
          {!selected ? (
            <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 14 }}>
              Pick one so we know how to handle it.
            </Text>
          ) : null}
          <Button
            title="Apply"
            variant="login"
            fullWidth
            size="lg"
            disabled={!selected}
            style={{ marginTop: 18 }}
            onPress={() => {
              haptic.success();
              setSheet(false);
            }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
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
    <View style={styles.itemCard}>
      <SmartImage source={item.image} placeholderIcon={item.kind === 'food' ? 'utensils' : 'bag'} style={styles.itemThumb} tint="#F7E2F1" />
      <View style={styles.itemInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="title" weight="semibold" color={colors.text} numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.name}
          </Text>
          {item.meta ? (
            <View style={styles.unitBadge}>
              <Text variant="caption" color="#9C005E" style={{ fontSize: 10 }}>
                {item.meta}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.itemActions}>
          <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteBtn}>
            <Icon name="trash" size={20} color="#C9507E" />
          </Pressable>
          <View style={styles.qtyRow}>
            <Text variant="title" weight="bold" color={colors.text} style={{ minWidth: 26, textAlign: 'center' }}>
              {item.qty}
            </Text>
            <Pressable
              onPress={() => {
                haptic.light();
                onQty(item.qty + 1);
              }}
              style={styles.qtyPlus}
            >
              <Icon name="plus" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Single price per line - shows the line total (== unit price when qty is 1). */}
        <Text variant="title" weight="bold" color={colors.text} style={{ marginTop: 6, textAlign: 'right' }}>
          {formatINR(item.unitPrice * item.qty)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F4FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 6, paddingBottom: 30 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EFE7F0',
  },
  itemThumb: { width: 78, height: 78, borderRadius: 10, backgroundColor: '#F7E2F1' },
  itemInfo: { flex: 1, marginLeft: 14 },
  unitBadge: {
    backgroundColor: '#F7E2F1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCEAF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyPlus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#9C005E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  // Same box as the gradient CTA under it: stretches the card column, 56 tall,
  // pill - so the two stacked actions read as one pair.
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#D9B2CB',
    backgroundColor: '#FBF3F9',
  },
  addMoreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7E2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE7F0',
    padding: 12,
    marginTop: 16,
  },
  chevBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7E2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCard: {
    backgroundColor: '#10111D',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  priceHead: { flexDirection: 'row', alignItems: 'center' },
  priceHeadIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: '#9C005E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.16)', marginVertical: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  freeDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  freeDeliveryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE1B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F2E3C9',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', backgroundColor: '#F5A623', borderRadius: 999 },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sheetOption: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E5D9E5',
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: colors.surface,
  },
  availNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  sheetOptionOn: { borderColor: '#9C005E', backgroundColor: '#FBF3F9' },
});
