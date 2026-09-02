import React, { useState } from 'react';
import { useFloatingBarBottomInset } from '@/hooks/useBottomInset';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { CartButton } from '../../components/ui/CartButton';
import { SmartImage } from '../../components/ui/SmartImage';
import { Text } from '../../components/ui/Text';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '@/lib/icons';
import { Rating } from '../../components/ui/Rating';
import { Price } from '../../components/ui/Price';
import { Card } from '../../components/ui/Card';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useAppQuery } from '../../hooks/useAppQuery';
import { fetchProduct } from '@/api/shop';
import { useCart } from '../../context/CartContext';
import { cartItemFromProduct, getProductById, getStoreById } from '../../data/mock';
import { colors } from '@/theme/colors';
import { layout, radius } from '@/theme/tokens';
import { discountPercent, formatINR, formatRating } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { openCart } from '@/navigation/RootNavigation';
import type { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Product'>;

export function ProductScreen({ route, navigation }: Props): React.ReactElement {
  const { productId } = route.params;
  const barBottom = useFloatingBarBottomInset(10);
  const { add } = useCart();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  const { data, loading, refreshing, refresh } = useAppQuery(
    () => fetchProduct(productId),
    () => {
      const product = getProductById(productId) ?? null;
      return { product, store: product ? getStoreById(product.storeId) : undefined };
    },
  );

  const { product, store } = data;

  const handleAdd = (): void => {
    if (!product) return;
    if (product.colors.length > 1 && !selectedColor) {
      setWarn('Please select a colour.');
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setWarn('Please select a size.');
      return;
    }
    const meta = [selectedSize, selectedColor].filter(Boolean).join(' · ') || undefined;
    add(cartItemFromProduct(product, 1, meta));
    haptic.success();
    setSuccessOpen(true);
  };

  const header = (
    <View style={styles.topBar}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => navigation.navigate('Search')} hitSlop={10} style={styles.roundBtn}>
          <Icon name="share" size={18} color={colors.text} />
        </Pressable>
        <View style={{ width: 10 }} />
        <CartButton />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen header={header} refreshing={refreshing} onRefresh={refresh} contentStyle={{ paddingBottom: 96 }} scroll>
        {product ? (
          <>
            <View style={styles.imageWrap}>
              <SmartImage source={product.image} placeholderIcon="bag" style={styles.image} tint={colors.brand[50]} />
              {product.isNew ? <View style={styles.newBadge}><Badge label="NEW" tone="brand" size="md" /></View> : null}
              {discountPercent(product.mrp, product.price) > 0 ? (
                <View style={styles.offBadge}>
                  <Badge label={`${discountPercent(product.mrp, product.price)}% OFF`} tone="danger" />
                </View>
              ) : null}
            </View>

            <Card style={{ marginTop: 16 }}>
              <Text variant="caption" color={colors.brand[700]} weight="bold">
                {product.brand}
              </Text>
              <Text variant="h2" weight="bold" color={colors.text} style={{ marginTop: 4 }}>
                {product.name}
              </Text>
              <View style={styles.ratingRow}>
                <Rating value={product.rating} reviews={product.reviews} size={14} />
                <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 8 }}>
                  {formatRating(product.rating)} · {product.reviews} ratings
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Price price={product.price} mrp={product.mrp} variant="h2" />
              </View>
            </Card>

            {product.colors.length > 1 ? (
              <View style={styles.block}>
                <Text variant="title" weight="bold" color={colors.text}>
                  Colour
                </Text>
                <View style={styles.colorRow}>
                  {product.colors.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.swatch,
                        { backgroundColor: c },
                        selectedColor === c && styles.swatchActive,
                      ]}
                    >
                      {selectedColor === c ? <Icon name="check" size={16} color={c === '#FFFFFF' ? colors.text : colors.white} /> : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {product.sizes && product.sizes.length > 0 ? (
              <View style={styles.block}>
                <Text variant="title" weight="bold" color={colors.text}>
                  Size
                </Text>
                <View style={styles.sizeRow}>
                  {product.sizes.map((s, i) => (
                    <View key={s} style={{ marginRight: i === product.sizes!.length - 1 ? 0 : 8 }}>
                      <Pressable
                        onPress={() => setSelectedSize(s)}
                        style={({ pressed }) => [
                          styles.sizeChip,
                          selectedSize === s && styles.sizeChipActive,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Text variant="subtitle" weight="semibold" color={selectedSize === s ? colors.white : colors.text}>
                          {s}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {store ? (
              <Pressable
                onPress={() => navigation.navigate('Store', { storeId: store.id })}
                style={({ pressed }) => [styles.storeRow, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.storeIcon}>
                  <Icon name="store" size={16} color={colors.brand[700]} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text variant="caption" color={colors.textTertiary}>
                    Sold by
                  </Text>
                  <Text variant="title" weight="semibold" color={colors.text} numberOfLines={1}>
                    {store.name}
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.textTertiary} />
              </Pressable>
            ) : null}

            <Card variant="alt" style={{ marginTop: 8 }}>
              <Text variant="title" weight="bold" color={colors.text}>
                About this item
              </Text>
              <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6 }}>
                {product.description}
              </Text>
            </Card>

            <Card variant="alt" style={{ marginTop: 12 }}>
              <View style={styles.feature}>
                <Icon name="truck" size={18} color={colors.brand[600]} />
                <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 10, flex: 1 }}>
                  Free delivery by tomorrow
                </Text>
              </View>
              <View style={styles.feature}>
                <Icon name="refresh" size={18} color={colors.brand[600]} />
                <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 10, flex: 1 }}>
                  7-day easy returns
                </Text>
              </View>
              <View style={styles.feature}>
                <Icon name="shield" size={18} color={colors.brand[600]} />
                <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 10, flex: 1 }}>
                  1-year warranty included
                </Text>
              </View>
            </Card>

            <View style={{ height: 16 }} />
          </>
        ) : (
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 40 }}>
            Product not found.
          </Text>
        )}
      </Screen>

      {product ? (
        <View style={[styles.bottomBar, { bottom: barBottom }]}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textTertiary}>
              Total price
            </Text>
            <Text variant="title" weight="bold" color={colors.text}>
              {formatINR(product.price)}
            </Text>
          </View>
          <Button
            title="Add to cart"
            leftIcon="cart"
            onPress={handleAdd}
            size="lg"
            style={{ flex: 1.9, marginLeft: 14 }}
          />
        </View>
      ) : null}

      <BottomSheet visible={successOpen} onClose={() => setSuccessOpen(false)} title="Added to cart">
        <View>
          <View style={styles.successIcon}>
            <Icon name="circleCheck" size={34} color={colors.success} />
          </View>
          <Text variant="h3" weight="bold" color={colors.text} style={{ textAlign: 'center', marginTop: 8 }}>
            {product?.name} added
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 4 }}>
            Your item is waiting in the cart.
          </Text>
          <Button title="View cart" onPress={() => { setSuccessOpen(false); openCart(); }} fullWidth style={{ marginTop: 16 }} leftIcon="cart" />
          <Button title="Continue shopping" variant="ghost" onPress={() => setSuccessOpen(false)} fullWidth style={{ marginTop: 8 }} />
        </View>
      </BottomSheet>

      <BottomSheet visible={warn !== null} onClose={() => setWarn(null)} title="Almost there">
        <View>
          <View style={styles.successIcon}>
            <Icon name="circleAlert" size={34} color={colors.warning} />
          </View>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
            {warn}
          </Text>
          <Button title="Got it" onPress={() => setWarn(null)} fullWidth style={{ marginTop: 16 }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.contentHorizontalPadding,
    paddingTop: 14,
    paddingBottom: 6,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: colors.brand[50],
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 300,
  },
  newBadge: { position: 'absolute', top: 12, left: 12 },
  offBadge: { position: 'absolute', top: 12, right: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  block: { marginTop: 18 },
  colorRow: { flexDirection: 'row', marginTop: 10, gap: 0 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.brand[600],
  },
  sizeRow: { flexDirection: 'row', marginTop: 10 },
  sizeChip: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  feature: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 12,
  },
  storeIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: layout.contentHorizontalPadding,
    right: layout.contentHorizontalPadding,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    minHeight: 72,
    padding: 8,
    paddingLeft: 22,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
