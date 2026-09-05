import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, categoryIcon, type IconName } from '@/lib/icons';
import { SmartImage } from '@/components/ui/SmartImage';
import { Price, RatingPill, Tag, VegMark } from '@/components/ui/Primitives';
import { useSheet } from '@/components/sheet/SheetProvider';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { discountPercent, distance as fmtDistance, minutes as fmtMinutes } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Banner, CatalogItem, FoodCategory, FoodVibe, Restaurant, ShopStore } from '@/types';

/**
 * Cards mirror `lib/common/widgets/card_design/*` from the reference Flutter
 * app: same 200-wide item card, 50px store logo row, corner banner for the
 * discount, cart pill floating on the image.
 */

export function FavoriteButton({ active, onPress }: { active: boolean; onPress: () => void }): React.ReactElement {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from favourites' : 'Save to favourites'}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      hitSlop={6}
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.white,
        borderWidth: 1,
        borderColor: active ? c.danger : c.border,
      }}
    >
      <Icon name="heart" size={15} color={active ? c.danger : c.textTertiary} filled={active} />
    </Pressable>
  );
}

/** Small outlined 76×28 stepper floating on the card image (the `CartCountView`). */
export function CartPill({
  qty,
  onAdd,
  onInc,
  onDec,
}: {
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}): React.ReactElement {
  const c = useColors();
  if (qty <= 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add to cart"
        onPress={() => {
          haptic.light();
          onAdd();
        }}
        style={{
          height: 28,
          paddingHorizontal: 12,
          borderRadius: radius.pill,
          backgroundColor: c.primary,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 4,
        }}
      >
        <Icon name="plus" size={13} color={c.onPrimary} />
        <Text variant="micro" weight="semibold" color={c.onPrimary}>
          ADD
        </Text>
      </Pressable>
    );
  }
  return (
    <View
      style={{
        width: 76,
        height: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 3,
        borderRadius: radius.pill,
        borderWidth: 1.2,
        borderColor: c.primary,
        backgroundColor: c.primaryFaint,
      }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease" onPress={onDec} hitSlop={4} style={styles.pillBtn}>
        <Icon name="minus" size={12} color={c.primary} />
      </Pressable>
      <Text variant="caption" weight="semibold" color={c.primary}>
        {qty}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase" onPress={onInc} hitSlop={4} style={styles.pillBtn}>
        <Icon name="plus" size={12} color={c.primary} />
      </Pressable>
    </View>
  );
}

interface ItemCardProps {
  item: CatalogItem;
  module: 'food' | 'shop';
  qty: number;
  favorite: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onFavorite: () => void;
  outletName?: string;
  width?: number;
}

export function ItemCard({
  item,
  module,
  qty,
  favorite,
  onOpen,
  onAdd,
  onInc,
  onDec,
  onFavorite,
  outletName,
  width = 168,
}: ItemCardProps): React.ReactElement {
  const c = useColors();
  const off = discountPercent(item.mrp, item.price);
  const soldOut = module === 'shop' ? item.inStock === false : item.isAvailable === false;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onOpen();
      }}
      style={({ pressed }) => [
        {
          width,
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={{ height: 104, position: 'relative' }}>
        <SmartImage source={item.image} name={item.name} style={styles.fullImage} radiusOverride={radius.flush} />
        <View style={styles.imageOverlay}>
          <FavoriteButton active={favorite} onPress={onFavorite} />
        </View>
        {off > 0 ? (
          <View style={[styles.cornerTag, { backgroundColor: c.primary }]}>
            <Text variant="micro" weight="semibold" color={c.onPrimary}>
              {off}% OFF
            </Text>
          </View>
        ) : null}
        {soldOut ? (
          <View style={[StyleSheet.absoluteFill, styles.soldOut]}>
            <Text variant="caption" weight="semibold" color={c.white}>
              Out of stock
            </Text>
          </View>
        ) : null}
        {!soldOut ? (
          <View style={styles.cartFloat}>
            <CartPill qty={qty} onAdd={onAdd} onInc={onInc} onDec={onDec} />
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.sm, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, minWidth: 0 }}>
          {module === 'food' ? <View style={{ marginTop: 3 }}><VegMark veg={Boolean(item.isVeg)} /></View> : null}
          {/* Fixed two-line block so every card in a rail stays the same height. */}
          <Text variant="title" weight="semibold" numberOfLines={2} style={{ flex: 1, minHeight: 38 }}>
            {item.name}
          </Text>
        </View>
        {outletName ? (
          <Text variant="micro" tone="faint" numberOfLines={1}>
            {outletName}
          </Text>
        ) : null}
        <RatingPill value={item.rating} count={item.reviews} compact />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Price price={item.price} mrp={item.mrp} size="sm" />
          </View>
          {module === 'food' && item.prepTime ? (
            <Text variant="micro" tone="faint" numberOfLines={1}>
              {fmtMinutes(item.prepTime)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** `store_card.dart`: 50px logo, name, rating, address, promo chip. */
export function StoreCard({
  store,
  onPress,
  favorite,
  onFavorite,
  variant = 'rail',
}: {
  store: Restaurant | ShopStore;
  onPress: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
  variant?: 'rail' | 'row';
}): React.ReactElement {
  const c = useColors();
  const isFood = 'cuisines' in store;
  const name = store.name;
  const line = isFood ? (store as Restaurant).line ?? (store as Restaurant).cuisines.join(' · ') : `${(store as ShopStore).road ?? ''}${(store as ShopStore).city ? `, ${(store as ShopStore).city}` : ''}`;
  const ratingValue = store.rating;
  const promo = store.promo || (!isFood ? undefined : (store as Restaurant).offer);
  const closed = Boolean(store.isClosed);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: spacing.sm,
          width: variant === 'rail' ? 268 : undefined,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View>
          <SmartImage source={(store as Restaurant).cover ?? null} name={name} style={{ width: 52, height: 52 }} radiusOverride={radius.md} />
          {closed ? (
            <View style={[styles.closedBadge, { backgroundColor: c.danger }]}>
              <Text variant="micro" weight="semibold" color={c.white}>
                CLOSED
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="title" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            {onFavorite ? <FavoriteButton active={Boolean(favorite)} onPress={onFavorite} /> : null}
          </View>
          <RatingPill value={ratingValue} count={store.reviews} compact suffix={isFood ? (store as Restaurant).cuisines.slice(0, 2).join(', ') : `${(store as ShopStore).tags?.slice(0, 2).join(', ') ?? ''}`} />
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {line || 'Near you'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, rowGap: 6, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        {promo ? <Tag label={promo} icon="percent" /> : null}
        {isFood ? (
          <Tag label={`${(store as Restaurant).deliveryTime || 0} min`} icon="clock" tone="muted" />
        ) : (
          <Tag label={`${(store as ShopStore).deliveryMins || 0} min`} icon="truck" tone="muted" />
        )}
        {isFood ? <Tag label={fmtDistance((store as Restaurant).distanceKm)} icon="mapPin" tone="muted" /> : null}
        {isNewlyJoined(store) ? <Tag label="NEW" icon="sparkles" tone="success" /> : null}
      </View>
    </Pressable>
  );
}

function isNewlyJoined(store: Restaurant | ShopStore): boolean {
  return 'isNewlyJoined' in store && Boolean((store as Restaurant).isNewlyJoined);
}

/** `special_offer_item_card.dart` — gradient card with the item on the right. */
export function SpecialOfferCard({ item, onPress }: { item: CatalogItem; onPress: () => void }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const off = discountPercent(item.mrp, item.price);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress();
      }}
      onLongPress={() => sheet.info('Special offer', `${item.name} is discounted by ${off || 0}% for a limited time.`)}
      style={{
        marginHorizontal: spacing.edge,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surfaceHi,
        padding: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="zap" size={14} color={c.primary} />
          <Text variant="overline" color={c.primary}>
            SPECIAL OFFER
          </Text>
        </View>
        <Text variant="title" weight="semibold" numberOfLines={2}>
          {item.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {item.description || 'Limited time price drop'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Price price={item.price} mrp={item.mrp} size="sm" />
          </View>
          {off > 0 ? <Tag label={`${off}% OFF`} tone="danger" /> : null}
        </View>
      </View>
      <SmartImage source={item.image} name={item.name} style={{ width: 92, height: 92 }} radiusOverride={radius.md} />
    </Pressable>
  );
}

/** `category_view.dart` — 66px circle + label, or a 158px tall card for shop. */
export function CategoryTile({
  category,
  onPress,
  compact,
}: {
  category: FoodCategory | { id: string; name: string; icon: string; tagline?: string };
  onPress: () => void;
  compact?: boolean;
}): React.ReactElement {
  const c = useColors();
  const glyph = categoryIcon((category as FoodCategory).icon, 'grid') as IconName;
  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic.light();
          onPress();
        }}
        style={({ pressed }) => ({ alignItems: 'center', gap: 6, width: 78, opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ width: 62, height: 62, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={glyph} size={24} color={c.primary} />
        </View>
        <Text variant="micro" weight="medium" center numberOfLines={2}>
          {category.name}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 150,
        height: 118,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <SmartImage source={(category as FoodCategory).image ?? null} name={category.name} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.sm, backgroundColor: `${c.primary}DD` }}>
        <Text variant="title" weight="semibold" color={c.white} numberOfLines={1}>
          {category.name}
        </Text>
        {'tagline' in category && category.tagline ? (
          <Text variant="micro" color={`${c.white}CC`} numberOfLines={1}>
            {category.tagline}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** `just_for_you` vibe card with the gradient + tagline from the server. */
export function VibeCard({ vibe, onPress }: { vibe: FoodVibe; onPress: () => void }): React.ReactElement {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={{ width: 150, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}
    >
      <View style={{ height: 96, backgroundColor: vibe.from ?? c.primarySoft }}>
        <SmartImage source={vibe.image} name={vibe.name} style={StyleSheet.absoluteFill} radiusOverride={radius.flush} />
      </View>
      <View style={{ padding: spacing.sm, gap: 2 }}>
        <Text variant="title" weight="semibold" numberOfLines={1}>
          {vibe.name}
        </Text>
        <Text variant="micro" tone="muted" numberOfLines={1}>
          {vibe.tagline || 'Trending near you'}
        </Text>
      </View>
    </Pressable>
  );
}

/** Home banner: full-bleed (0 gutter, 0 radius) exactly like the Flutter `BannerView`. */
export function BannerCard({ banner, onPress }: { banner: Banner; onPress: () => void }): React.ReactElement {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={{ width: '100%', height: 152, borderRadius: radius.flush, overflow: 'hidden', backgroundColor: c.primaryDeep }}
    >
      <SmartImage source={banner.image} name={banner.title} style={StyleSheet.absoluteFill} radiusOverride={radius.flush} />
      <View style={{ position: 'absolute', inset: 0 as never, padding: spacing.md, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' }}>
        {banner.badge ? (
          <View style={{ alignSelf: 'flex-start', marginBottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: c.secondary }}>
            <Text variant="micro" weight="semibold" color="#10241D">
              {banner.badge}
            </Text>
          </View>
        ) : null}
        <Text variant="h3" weight="bold" color={c.white} numberOfLines={1}>
          {banner.title}
        </Text>
        {banner.subtitle ? (
          <Text variant="caption" color={`${c.white}E6`} numberOfLines={2}>
            {banner.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullImage: { width: '100%', height: '100%' },
  pillBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { position: 'absolute', top: 6, right: 6 },
  cornerTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomRightRadius: radius.md,
  },
  soldOut: { backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  cartFloat: { position: 'absolute', bottom: 6, right: 6 },
  closedBadge: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
});

export const cardStyles = styles;
