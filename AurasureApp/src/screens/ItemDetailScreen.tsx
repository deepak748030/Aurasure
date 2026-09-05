import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { Divider, EmptyState, Price, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import { Rail } from '@/components/ui/Rail';
import { ItemCard } from '@/components/cards/Cards';
import { ItemOptionSheet } from '@/components/item/ItemOptionSheet';
import { SkeletonHero, SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { MetaRow } from '@/components/list/ListRow';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { minutes } from '@/lib/format';
import { fetchFoodItem, fetchFoodPopular, fetchProduct, fetchShopPopular } from '@/api/catalog';
import { needsChoices } from '@/hooks/useCartActions';
import { useOutletResolver } from '@/hooks/useOutletResolver';
import type { Nav, Route } from '@/navigation/types';
import type { CatalogItem } from '@/types';

/**
 * Item / product page. Full-bleed hero image, then options, description and
 * "what others also ordered" - the same structure as the reference app's
 * `item_details_screen.dart` / `product_details_screen.dart`.
 */
export function ItemDetailScreen({ navigation, route }: { navigation: Nav; route: Route<'Item'> }): React.ReactElement {
  const c = useColors();
  const { module, id } = route.params;
  const isFood = module === 'food';
  const cart = useCart();
  const actions = useCartActions();
  const resolveOutlet = useOutletResolver(module);
  const { isFavorite, toggleFavorite } = useSession();
  const [sheet, setSheet] = useState(false);

  const itemQuery = useQuery<CatalogItem>(useCallback(async () => (isFood ? fetchFoodItem(id) : fetchProduct(id)), [id, isFood]));
  const relatedQuery = useQuery<CatalogItem[]>(useCallback(() => (isFood ? fetchFoodPopular(8) : fetchShopPopular(8)), [isFood]));

  const item = itemQuery.data;
  const inCart = item ? cart.qtyOf(module, item.id) : 0;

  const outletOf = useCallback((row: CatalogItem) => resolveOutlet(row), [resolveOutlet]);

  const outletNameQuery = useQuery<string | undefined>(
    useCallback(async () => {
      if (!item) return undefined;
      const snapshot = await resolveOutlet(item);
      return snapshot.name || undefined;
    }, [resolveOutlet, item]),
    {},
  );

  const add = (row: CatalogItem): void => {
    if (needsChoices(row)) {
      setSheet(true);
      return;
    }
    void (async () => actions.quickAdd(module, row, await outletOf(row)))();
  };

  return (
    <Screen
      scroll
      padded={false}
      back={false}
      onRefresh={itemQuery.refresh}
      refreshing={itemQuery.refreshing}
      stickyFooter={
        item ? (
          <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text variant="micro" tone="faint">
                Total
              </Text>
              <Price price={item.price} mrp={item.mrp} />
            </View>
            {inCart > 0 ? (
              <Button title={`In cart (${inCart}) · View`} variant="secondary" icon="cart" onPress={() => navigation.navigate('Cart')} />
            ) : null}
            <Button title={isFood ? 'Add to cart' : 'Add to bag'} icon="plus" onPress={() => add(item)} disabled={isFood ? item.isAvailable === false : item.inStock === false} />
          </View>
        ) : undefined
      }
    >
      {itemQuery.loading ? (
        <View>
          <SkeletonHero height={260} />
          <View style={{ padding: spacing.edge, gap: spacing.sm }}>
            <SkeletonList rows={3} thumb={0} />
          </View>
        </View>
      ) : !item ? (
        <EmptyState icon="package" title="Item not found" subtitle={itemQuery.error?.message ?? 'It may have been removed from the menu.'} actionLabel="Go back" onAction={() => navigation.goBack()} />
      ) : (
        <View>
          <FlushSurface height={250} style={{ backgroundColor: c.surfaceAlt }}>
            <SmartImage source={item.image} name={item.name} style={StyleSheet.absoluteFill} radiusOverride={radius.flush} />
            <View style={styles.floatRow}>
              <IconButton name="chevronLeft" onPress={() => navigation.goBack()} accessibilityLabel="Go back" tone="translucent" />
              <View style={{ flex: 1 }} />
              <IconButton
                name="heart"
                filled={isFavorite(module, item.id)}
                tone="translucent"
                accessibilityLabel="Favourite"
                onPress={() => void toggleFavorite(module, item.id)}
              />
            </View>
            {(item.isBestseller || item.isSpecial || item.isTrending) && (
              <View style={styles.ribbon}>
                {item.isBestseller ? <Tag label="Bestseller" icon="flame" /> : null}
                {item.isSpecial ? <Tag label="Special offer" icon="zap" tone="warning" /> : null}
                {item.isTrending ? <Tag label="Trending" icon="sparkles" tone="success" /> : null}
              </View>
            )}
          </FlushSurface>

          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md, gap: spacing.sm, backgroundColor: c.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              {isFood ? <VegMark veg={Boolean(item.isVeg)} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h2" weight="bold">
                  {item.name}
                </Text>
                {item.brand ? (
                  <Text variant="caption" tone="muted">
                    by {item.brand}
                  </Text>
                ) : null}
              </View>
              <Price price={item.price} mrp={item.mrp} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <RatingPill value={item.rating} count={item.reviews} />
              {isFood && item.prepTime ? <Tag label={`${minutes(item.prepTime)} prep`} icon="timer" tone="muted" /> : null}
              {!isFood ? <Tag label={item.inStock === false ? 'Out of stock' : 'In stock'} icon={item.inStock === false ? 'circleX' : 'box'} tone={item.inStock === false ? 'danger' : 'success'} /> : null}
              {isFood && item.isAvailable === false ? <Tag label="Currently unavailable" icon="circleX" tone="danger" /> : null}
            </View>

            {item.description ? (
              <Text variant="body" tone="muted">
                {item.description}
              </Text>
            ) : null}

            {(item.variants?.length ?? 0) > 0 || (item.addonGroups?.length ?? 0) > 0 || (item.colors?.length ?? 0) > 0 || (item.sizes?.length ?? 0) > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet(true)}
                style={({ pressed }) => [styles.options, { borderColor: c.border, backgroundColor: pressed ? c.surfaceAlt : c.surfaceHi }]}
              >
                <Icon name="sliders" size={17} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="subtitle" weight="semibold">
                    {isFood ? 'Choose size and add-ons' : 'Choose size and colour'}
                  </Text>
                  <Text variant="micro" tone="muted">
                    {(item.variants?.length ?? 0) > 0 ? `${item.variants?.length} option(s)` : ''}
                    {(item.addonGroups?.length ?? 0) > 0 ? ` · ${(item.addonGroups ?? []).map((group) => String(group.title ?? group.name ?? '')).join(', ')}` : ''}
                    {(item.sizes?.length ?? 0) > 0 ? `${item.sizes?.length} size(s)` : ''}
                    {(item.colors?.length ?? 0) > 0 ? ` · ${item.colors?.length} colour(s)` : ''}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={c.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          <Divider inset={false} />

          <View style={{ paddingHorizontal: spacing.edge, paddingVertical: spacing.sm, backgroundColor: c.surface, gap: 2 }}>
            <MetaRow label="Delivery time" value={isFood ? minutes(item.prepTime ?? 25) : minutes(item.deliveryMins ?? 40)} />
            <View style={styles.divider} />
            <MetaRow label="Served by" value={item.restaurantId ? 'Partner kitchen' : item.storeId ? 'Partner store' : 'Aurasure'} />
          </View>

          {(item.tags?.length ?? 0) > 0 ? (
            <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm, backgroundColor: c.bg }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(item.tags ?? []).map((tag) => (
                  <Tag key={tag} label={tag} icon="tag" tone="muted" />
                ))}
              </View>
            </View>
          ) : null}

          {relatedQuery.data ? (
            <Rail title={isFood ? 'Others also ordered' : 'Similar products'} subtitle="From around you" icon="sparkles" style={{ paddingHorizontal: spacing.edge }}>
              {relatedQuery.data
                .filter((row) => row.id !== item.id)
                .slice(0, 8)
                .map((row) => (
                  <ItemCard
                    key={row.id}
                    item={row}
                    module={module}
                    qty={cart.qtyOf(module, row.id)}
                    favorite={isFavorite(module, row.id)}
                    onFavorite={() => void toggleFavorite(module, row.id)}
                    onOpen={() => navigation.navigate('Item', { module, id: row.id })}
                    onAdd={() => void (async () => actions.quickAdd(module, row, await outletOf(row)))()}
                    onInc={() => void (async () => actions.quickAdd(module, row, await outletOf(row)))()}
                    onDec={() => {
                      const line = cart.linesFor(module).find((row2) => row2.refId === row.id);
                      if (line) actions.dec(module, line.id, line.qty);
                    }}
                  />
                ))}
            </Rail>
          ) : relatedQuery.loading ? (
            <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.lg }}>
              <SkeletonRail count={3} />
            </View>
          ) : null}

          <View style={{ height: spacing.xxl }} />
        </View>
      )}

      <ItemOptionSheet
        visible={sheet}
        item={item ?? null}
        module={module}
        onClose={() => setSheet(false)}
        outletName={outletNameQuery.data ?? undefined}
        onSubmit={(selection) => {
          if (!item) return;
          setSheet(false);
          void (async () => actions.addSelection(module, { ...selection, item }, await outletOf(item)))();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  floatRow: { position: 'absolute', top: spacing.sm + 12, left: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  ribbon: { position: 'absolute', bottom: spacing.md, left: spacing.edge, flexDirection: 'row', gap: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingHorizontal: spacing.edge, borderTopWidth: 1 },
  options: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.14)' },
});
