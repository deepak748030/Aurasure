import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { Chip, Divider, EmptyState, Price, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import { SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { useCartActions } from '@/hooks/useCartActions';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { distance, money } from '@/lib/format';
import { fetchRestaurant, fetchStore } from '@/api/catalog';
import { needsChoices } from '@/hooks/useCartActions';
import { ItemOptionSheet } from '@/components/item/ItemOptionSheet';
import { CartBar } from '@/components/ui/CartBar';
import type { Nav, Route } from '@/navigation/types';
import type { CatalogItem } from '@/types';

/**
 * Store / restaurant page (`features/store/screens/store_details_screen.dart`
 * from the reference app): full-bleed cover, identity card, then the menu as a
 * flat list with zero row gaps and an in-menu search + veg filter.
 */
export function OutletScreen({ navigation, route }: { navigation: Nav; route: Route<'Outlet'> }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { params } = route;
  const isFood = params.module === 'food';
  const cart = useCart();
  const actions = useCartActions();
  const { isFavorite, toggleFavorite } = useSession();

  const [term, setTerm] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [optionFor, setOptionFor] = useState<CatalogItem | null>(null);

  const detail = useQuery<{ outlet: import('@/types').Restaurant | import('@/types').ShopStore; items: CatalogItem[] }>(
    useCallback(async () => {
      if (isFood) {
        const result = await fetchRestaurant(params.id);
        return { outlet: result.restaurant, items: result.items };
      }
      const result = await fetchStore(params.id);
      return { outlet: result.store, items: result.products };
    }, [isFood, params.id]),
  );

  const outlet = detail.data?.outlet;
  const items = detail.data?.items ?? [];

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !`${item.name} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase().includes(needle)) return false;
      if (vegOnly && item.isVeg === false) return false;
      if (nonVegOnly && item.isVeg === true) return false;
      return true;
    });
  }, [items, term, vegOnly, nonVegOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    filtered.forEach((item) => {
      const key = item.categoryId ? (isFood ? 'Menu' : item.categoryId) : isFood ? 'Menu' : 'Products';
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    });
    return [...map.entries()];
  }, [filtered, isFood]);

  const outletInfo = useMemo(
    () => ({
      id: outlet?.id ?? params.id,
      name: outlet?.name ?? params.name ?? 'Store',
      deliveryFee: 'deliveryFee' in (outlet ?? {}) ? Number((outlet as { deliveryFee?: number }).deliveryFee ?? 0) : 0,
      minOrder: 'minOrder' in (outlet ?? {}) ? Number((outlet as { minOrder?: number }).minOrder ?? 0) : 0,
      etaMinutes:
        outlet && 'deliveryTime' in outlet ? outlet.deliveryTime : outlet && 'deliveryMins' in outlet ? outlet.deliveryMins : 30,
    }),
    [outlet, params.id, params.name],
  );

  const cartCount = cart.countFor(params.module);
  const closed = Boolean((outlet as { isClosed?: boolean } | undefined)?.isClosed);

  const addToCart = (item: CatalogItem): void => {
    if (closed) {
      sheet.show({
        title: 'Store is closed',
        message: `${outletInfo.name} is not accepting orders right now. You can still save items to your favourites.`,
        icon: 'clock',
        tone: 'warning',
        dismissLabel: 'Got it',
      });
      return;
    }
    void actions.quickAdd(params.module, item, outletInfo);
  };

  return (
    <Screen
      scroll
      padded={false}
      back
      onRefresh={detail.refresh}
      refreshing={detail.refreshing}
      stickyFooter={
        cartCount > 0 ? (
          <CartBar count={cartCount} total={cart.totalFor(params.module)} module={params.module} onPress={() => navigation.navigate('Cart')} />
        ) : undefined
      }
      header={
        <View>
          <View style={{ height: 190 }}>
            <SmartImage
              source={(outlet as { cover?: import('@/types').ImageRef | null } | undefined)?.cover ?? null}
              name={outletInfo.name}
              style={StyleSheet.absoluteFill}
              radiusOverride={radius.flush}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,4,18,0.35)' }]} />
            <View style={{ position: 'absolute', left: spacing.edge, right: spacing.edge, bottom: spacing.md, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <View style={{ width: 62, height: 62, borderRadius: radius.md, borderWidth: 2, borderColor: c.white, overflow: 'hidden', backgroundColor: c.surface }}>
                <SmartImage source={outlet?.cover ?? null} name={outletInfo.name} style={{ width: '100%', height: '100%' }} radiusOverride={radius.flush} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3" weight="bold" color={c.white} numberOfLines={1}>
                  {outletInfo.name}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.86)" numberOfLines={1}>
                  {outlet && 'cuisines' in outlet ? outlet.cuisines.join(' · ') : outlet && 'tags' in outlet ? (outlet.tags ?? []).join(' · ') : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isFavorite(params.module, outletInfo.id) ? 'Remove favourite' : 'Save store'}
                onPress={() => void toggleFavorite(params.module, outletInfo.id)}
                style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="heart" size={18} color={isFavorite(params.module, outletInfo.id) ? c.danger : c.textSecondary} filled={isFavorite(params.module, outletInfo.id)} />
              </Pressable>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.edge, paddingVertical: spacing.sm, gap: spacing.sm, backgroundColor: c.surface }}>
            {detail.loading ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, height: 34, borderRadius: radius.pill, backgroundColor: c.surfaceAlt }} />
                <View style={{ width: 90, height: 34, borderRadius: radius.pill, backgroundColor: c.surfaceAlt }} />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <RatingPill value={outlet?.rating ?? 0} count={outlet?.reviews ?? 0} />
                  <Tag label={`${outletInfo.etaMinutes} min`} icon="clock" tone="muted" />
                  <Tag label={outletInfo.deliveryFee > 0 ? `${money(outletInfo.deliveryFee)} delivery` : 'Free delivery'} icon="truck" tone={outletInfo.deliveryFee > 0 ? 'muted' : 'success'} />
                  {outlet && 'distanceKm' in outlet ? <Tag label={distance(outlet.distanceKm)} icon="mapPin" tone="muted" /> : null}
                  {outlet && 'city' in outlet && outlet.city ? <Tag label={outlet.city} icon="mapPin" tone="muted" /> : null}
                  {closed ? <Tag label="Closed now" tone="danger" icon="clock" /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Chip label="Veg only" icon="leaf" selected={vegOnly} size="sm" onPress={() => { setVegOnly((prev) => !prev); setNonVegOnly(false); }} />
                  <Chip label="Non-veg" icon="fastFood" selected={nonVegOnly} size="sm" onPress={() => { setNonVegOnly((prev) => !prev); setVegOnly(false); }} />
                  {outlet && 'promo' in outlet && outlet.promo ? <Tag label={outlet.promo} icon="percent" /> : null}
                  {outletInfo.minOrder > 0 ? <Tag label={`Min ${money(outletInfo.minOrder)}`} tone="muted" /> : null}
                </View>
              </>
            )}
          </View>

          {items.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm, backgroundColor: c.surface }}>
              <SearchField value={term} onChangeText={setTerm} placeholder={`Search in ${outletInfo.name}`} onClear={() => setTerm('')} />
            </View>
          ) : null}
        </View>
      }
    >
      {detail.loading ? (
        <View style={{ paddingTop: spacing.md, gap: spacing.md }}>
          <View style={{ paddingHorizontal: spacing.edge }}>
            <SkeletonRail cardWidth={168} height={210} count={2} />
          </View>
          <SkeletonList rows={5} thumb={72} />
        </View>
      ) : detail.error ? (
        <EmptyState icon="wifiOff" title="Menu unavailable" subtitle={detail.error.message} actionLabel="Try again" onAction={detail.refresh} />
      ) : (
        <View style={{ gap: 0 }}>
          <FlushSurface>
            {outlet && 'openingHours' in outlet ? (
              <View style={{ padding: spacing.sm, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Icon name="clock" size={14} color={c.textSecondary} />
                <Text variant="caption" tone="muted">
                  {String((outlet as { openingHours?: string }).openingHours)}
                </Text>
              </View>
            ) : null}
          </FlushSurface>

          {grouped.length === 0 ? (
            <EmptyState
              icon="search"
              title={term ? 'No dishes match that' : 'Menu is empty right now'}
              subtitle={term ? 'Try a different spelling or clear the filters.' : 'This store has not published items yet.'}
              actionLabel={term ? 'Clear search' : undefined}
              onAction={term ? () => setTerm('') : undefined}
            />
          ) : (
            grouped.map(([groupName, rows], groupIndex) => (
              <View key={`${groupName}-${groupIndex}`}>
                <View style={{ paddingHorizontal: spacing.edge, paddingVertical: spacing.xs, backgroundColor: c.surfaceAlt }}>
                  <Text variant="overline" tone="faint">
                    {groupName.toUpperCase()} · {rows.length}
                  </Text>
                </View>
                {rows.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <MenuRow
                      item={item}
                      isFood={isFood}
                      qty={cart.qtyOf(params.module, item.id)}
                      onPress={() => {
                        if (needsChoices(item)) {
                          setOptionFor(item);
                          return;
                        }
                        addToCart(item);
                      }}
                      onOpen={() => navigation.navigate('Item', { module: params.module, id: item.id })}
                      onInc={() => {
                        const line = cart.linesFor(params.module).find((row) => row.refId === item.id);
                        if (line) actions.inc(params.module, line.id, line.qty);
                        else addToCart(item);
                      }}
                      onDec={() => {
                        const line = cart.linesFor(params.module).find((row) => row.refId === item.id);
                        if (line) actions.dec(params.module, line.id, line.qty);
                      }}
                    />
                    {index < rows.length - 1 ? <Divider inset={false} /> : null}
                  </React.Fragment>
                ))}
              </View>
            ))
          )}
          <View style={{ height: spacing.xl }} />
        </View>
      )}

      <ItemOptionSheet
        visible={Boolean(optionFor)}
        item={optionFor}
        module={params.module}
        outletName={outletInfo.name}
        onClose={() => setOptionFor(null)}
        onSubmit={async (selection) => {
          const picked = selection.item;
          setOptionFor(null);
          await actions.addSelection(params.module, { ...selection, item: picked }, outletInfo);
        }}
      />
    </Screen>
  );
}

/** Menu row: image left, info middle, price + add right, zero vertical gap. */
function MenuRow({
  item,
  isFood,
  qty,
  onPress,
  onOpen,
  onInc,
  onDec,
}: {
  item: CatalogItem;
  isFood: boolean;
  qty: number;
  onPress: () => void;
  onOpen: () => void;
  onInc: () => void;
  onDec: () => void;
}): React.ReactElement {
  const c = useColors();
  const unavailable = isFood ? item.isAvailable === false : item.inStock === false;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: pressed ? c.surfaceAlt : c.surface })}
    >
      <View style={{ width: 84, flexShrink: 0 }}>
        <SmartImage source={item.image} name={item.name} style={{ width: 84, height: 84 }} radiusOverride={radius.md} />
        {needsChoices(item) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, justifyContent: 'center' }}>
            <Icon name="sliders" size={11} color={c.textTertiary} />
            <Text variant="micro" tone="faint">
              options
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {isFood ? <VegMark veg={Boolean(item.isVeg)} /> : null}
          <Text variant="title" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>
            {item.name}
          </Text>
        </View>
        {item.description ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {item.rating > 0 ? <RatingPill value={item.rating} count={item.reviews} compact /> : null}
          {isFood && item.prepTime ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="timer" size={11} color={c.textTertiary} />
              <Text variant="micro" tone="faint">
                {item.prepTime} min
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Price price={item.price} mrp={item.mrp} size="sm" />
          {item.isBestseller ? <Tag label="Bestseller" tone="warning" /> : null}
          <View style={{ flex: 1 }} />
          {unavailable ? (
            <Text variant="micro" weight="semibold" color={c.danger}>
              OUT OF STOCK
            </Text>
          ) : (
            <QtyStepper qty={qty} onPress={onPress} onInc={onInc} onDec={onDec} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function QtyStepper({ qty, onPress, onInc, onDec }: { qty: number; onPress: () => void; onInc: () => void; onDec: () => void }): React.ReactElement {
  const c = useColors();
  if (qty === 0) {
    return (
      <Button label="ADD" size="sm" squared onPress={onPress} style={{ minWidth: 74 }} />
    );
  }
  return (
    <View style={{ width: 76, height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, borderRadius: radius.sm, borderWidth: 1.2, borderColor: c.primary, backgroundColor: c.primaryFaint }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" onPress={onDec} hitSlop={6}>
        <Icon name="minus" size={13} color={c.primary} />
      </Pressable>
      <Text variant="caption" weight="semibold" color={c.primary}>
        {qty}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" onPress={onInc} hitSlop={6}>
        <Icon name="plus" size={13} color={c.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', margin: spacing.edge, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
});

