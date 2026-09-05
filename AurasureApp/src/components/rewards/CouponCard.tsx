import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { countdown, money } from '@/lib/format';
import { couponDiscount, couponLabel, isCouponUsable } from '@/api/rewards';
import { haptic } from '@/lib/haptics';
import type { UserCoupon } from '@/types';

/**
 * Coupon ticket with the dashed perforation used in the reference app's
 * `promo_bottom_sheet`. `state` decides the colour + whether it is tappable.
 */
export function CouponCard({
  coupon,
  state = 'available',
  itemTotal = 0,
  applied,
  onPress,
  onRemove,
  onClaim,
  compact,
}: {
  coupon: UserCoupon;
  state?: 'available' | 'used' | 'expired' | 'unfit';
  itemTotal?: number;
  applied?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  onClaim?: () => void;
  compact?: boolean;
}): React.ReactElement {
  const c = useColors();
  const usable = isCouponUsable(coupon, itemTotal);
  const tone = applied || state === 'available' ? c.primary : state === 'expired' || state === 'used' ? c.textTertiary : c.warning;
  const bg = applied ? c.primarySoft : state === 'expired' || state === 'used' ? c.surfaceAlt : c.surface;
  const left = state === 'expired' ? 'Expired' : state === 'used' ? `Used ${coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString('en-IN') : ''}` : coupon.expiresAt ? `Expires ${countdown(new Date(coupon.expiresAt)) ?? new Date(coupon.expiresAt).toLocaleDateString('en-IN')}` : 'No expiry';

  const body = (
    <View style={[styles.card, { backgroundColor: bg, borderColor: applied ? c.primary : c.border }]}>
      <View style={[styles.stub, { backgroundColor: applied ? c.primary : tone }]}>
        <Text variant="h3" weight="semibold" color={applied || state === 'expired' || state === 'used' ? c.white : c.onPrimary} numberOfLines={1} adjustsFontSizeToFit>
          {coupon.offType === 'percent' ? `${coupon.offValue}%` : money(coupon.offValue)}
        </Text>
        <Text variant="micro" color={applied || state === 'expired' || state === 'used' ? 'rgba(255,255,255,0.85)' : c.onPrimary}>
          {coupon.offType === 'percent' ? 'OFF' : 'OFF'}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="title" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {coupon.title}
          </Text>
          {applied ? (
            <View style={[styles.appliedPill, { backgroundColor: c.successBg }]}>
              <Text variant="micro" weight="semibold" color={c.success}>
                APPLIED
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={compact ? 1 : 2}>
          {coupon.subtitle}
        </Text>
        {/* Code + minimum on the left, expiry pinned right on its own flex
            track. The old row wrapped with `marginLeft:'auto'`, which dropped
            the date onto a ragged second line whenever the code was long. */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <View style={[styles.codeBox, { borderColor: tone }]}>
              <Text variant="micro" weight="semibold" color={tone} numberOfLines={1}>
                {coupon.code}
              </Text>
            </View>
            {coupon.minOrder > 0 ? (
              <Text variant="micro" tone={usable.ok && state === 'available' ? 'faint' : 'warning'} numberOfLines={1}>
                Min {money(coupon.minOrder)}
              </Text>
            ) : null}
          </View>
          <Text variant="micro" tone="faint" numberOfLines={1} style={styles.metaRight}>
            {left}
          </Text>
        </View>
        {itemTotal > 0 && state === 'available' ? (
          <Text variant="micro" color={usable.ok ? c.success : c.warning} numberOfLines={2}>
            {usable.ok ? `Saves ${money(couponDiscount(coupon, itemTotal))} on this cart` : usable.reason ?? 'Not usable yet'}
          </Text>
        ) : null}
      </View>
      {onRemove || onClaim ? (
        <View style={styles.action}>
          {onRemove ? (
            <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8} style={{ padding: 4 }}>
              <Icon name="x" size={16} color={c.textTertiary} />
            </Pressable>
          ) : null}
          {onClaim ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic.light();
                onClaim();
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.primary }}
            >
              <Text variant="micro" weight="semibold" color={c.onPrimary}>
                CLAIM
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
}

/** Horizontal coupon rail used on profile/wallet screens. */
export function CouponList({ coupons, itemTotal, onPick, selectedCode }: { coupons: UserCoupon[]; itemTotal?: number; onPick?: (coupon: UserCoupon) => void; selectedCode?: string | null }): React.ReactElement {
  return (
    <View style={{ gap: 0 }}>
      {coupons.map((coupon) => (
        <CouponCard key={coupon.id} coupon={coupon} itemTotal={itemTotal} applied={selectedCode === coupon.code} onPress={onPick ? () => onPick(coupon) : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: spacing.edge,
    marginTop: spacing.sm,
  },
  stub: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: spacing.md,
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
    borderStyle: 'dashed',
  },
  /* The body used to have no horizontal padding, so long titles and the code
     chip ran straight into the card border. */
  body: { flex: 1, minWidth: 0, gap: 4, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appliedPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, flexShrink: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  metaRight: { flexShrink: 0, textAlign: 'right' },
  codeBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 1 },
  action: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing.sm, paddingVertical: spacing.sm },
});
