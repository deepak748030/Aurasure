import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { EmptyState, Price, Progress, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { SkeletonHero, SkeletonList } from '@/components/ui/Skeleton';
import { FlashSaleTimer } from '@/components/home/FlashSaleTimer';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { fetchFoodOffers, fetchShopOffers } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { discountPercent } from '@/lib/format';
import type { CatalogItem } from '@/types';
import type { ScreenProps } from '@/navigation/types';

/**
 * `flash_sale_details_screen.dart`: timer band on a primary tint, then the
 * discounted items with their remaining stock. Data is the real offers feed
 * (`/food/offers`, `/shop/offers`) — the API has no flash-sale collection, so
 * the "flash" cut here is simply the live discounts, deepest first.
 */
export function FlashSaleScreen({ navigation, route }: ScreenProps<'FlashSale'>): React.ReactElement {
  const c = useColors();
  const cart = useCart();
  const actions = useCartActions();
  const { module, isFavorite, toggleFavorite } = useSession();

  const query = useQuery<CatalogItem[]>(useCallback(() => (module === 'food' ? fetchFoodOffers(40) : fetchShopOffers(40)), [module]), {});

  const rows = useMemo(() => {
    const list = (query.data ?? []).filter((item) => discountPercent(item.mrp, item.price) >= 5);
    return list.sort((a, b) => discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price));
  }, [query.data]);

  return (
    <Screen
      title="Flash sale"
      subtitle={query.loading ? 'Loading deals…' : `${rows.length} live discounts`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
        <View style={[styles.band, { backgroundColor: c.primaryFaint, borderColor: c.primarySoft }]}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h3" weight="bold">
              Ends in
            </Text>
            <Text variant="micro" tone="muted">
              Window resets every 6 hours · prices come from the live offers feed
            </Text>
          </View>
          <FlashSaleTimer />
        </View>
      </View>

      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md }}>
          <SkeletonHero height={120} />
          <View style={{ paddingTop: spacing.sm }}>
            <SkeletonList rows={4} thumb={62} />
          </View>
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="zap"
          title="No flash deals right now"
          subtitle="Nothing in this store is discounted at the moment. New offers appear through the day."
          actionLabel="Browse menu"
          onAction={() => navigation.navigate('Tabs')}
        />
      ) : (
        <View style={{ backgroundColor: c.surface, marginTop: spacing.md, paddingBottom: spacing.xxl }}>
          {rows.map((item, index) => {
            const off = discountPercent(item.mrp, item.price);
            const stock = item.stockQty ?? null;
            const soldOut = module === 'shop' ? item.inStock === false : item.isAvailable === false;
            const qty = cart.qtyOf(module, item.id);
            return (
              <View key={item.id} style={[styles.row, { borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: c.divider }]}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.thumbWrap, { backgroundColor: c.surfaceAlt }]}>
                    <SmartImage source={item.image} name={item.name} style={styles.thumb} radiusOverride={radius.md} />
                    {off > 0 ? (
                      <View style={[styles.offTag, { backgroundColor: c.primary }]}>
                        <Text variant="micro" weight="bold" color={c.white}>
                          {off}%
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      {module === 'food' ? <VegMark veg={Boolean(item.isVeg)} /> : null}
                      <Text variant="title" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                        {item.name}
                      </Text>
                      {soldOut ? <Tag label="Sold out" tone="danger" icon="circleX" /> : null}
                    </View>
                    <Text variant="micro" tone="faint" numberOfLines={1}>
                      {item.brand ?? item.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Price price={item.price} mrp={item.mrp} size="sm" />
                      {item.rating > 0 ? <RatingPill value={item.rating} count={item.reviews} compact /> : null}
                    </View>
                  </View>
                </View>

                {stock !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Progress value={Math.max(0.04, Math.min(1, stock / Math.max(stock, 12)))} tone={stock <= 3 ? 'danger' : 'warning'} />
                    </View>
                    <Text variant="micro" weight="bold" color={stock <= 3 ? c.danger : c.textSecondary}>
                      {stock} left
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Icon name="clock" size={12} color={c.textTertiary} />
                  <Text variant="micro" tone="faint" style={{ flex: 1 }}>
                    {module === 'food' ? `Ready in ${item.prepTime ?? 25} min` : `Delivered in ${item.deliveryMins ?? 45} min`}
                  </Text>
                  {soldOut ? (
                    <Text variant="caption" weight="bold" color={c.danger}>
                      Unavailable
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {qty > 0 ? (
                        <Text variant="caption" weight="bold" color={c.primary}>
                          {qty} in cart
                        </Text>
                      ) : null}
                      <View style={{ backgroundColor: c.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 }}>
                        <Text
                          variant="micro"
                          weight="bold"
                          color={c.onPrimary}
                          onPress={() => {
                            void actions.quickAdd(module, item, {
                              id: module === 'food' ? item.restaurantId ?? '' : item.storeId ?? '',
                              name: '',
                              deliveryFee: 0,
                              minOrder: 0,
                              etaMinutes: item.prepTime ?? item.deliveryMins ?? 30,
                            });
                          }}
                        >
                          {qty > 0 ? 'ADD MORE' : 'ADD'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = {
  band: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  row: { padding: spacing.sm, gap: 2 },
  thumbWrap: { width: 68, height: 68, borderRadius: radius.md, overflow: 'hidden' },
  thumb: { width: 68, height: 68 },
  offTag: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 5, paddingVertical: 2, borderBottomRightRadius: radius.sm },
} as const;
