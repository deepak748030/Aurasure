import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { CouponCard } from '@/components/rewards/CouponCard';
import { EmptyState } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/hooks/useQuery';
import { claimPromo, fetchCoupons, partitionCoupons, type CouponFilter } from '@/api/rewards';
import { ApiError } from '@/api/client';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';
import type { UserCoupon } from '@/types';

/** Coupon centre + "type a code" claim, backed by `/users/me/coupons*`. */
export function CouponsScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const { user, isLoggedIn, refreshUser, module } = useSession();
  const [tab, setTab] = useState<CouponFilter>('available');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useQuery<UserCoupon[]>(useCallback(() => (isLoggedIn ? fetchCoupons() : Promise.resolve(user?.coupons ?? [])), [isLoggedIn, user?.coupons]), {});
  const coupons = useMemo(() => query.data ?? [], [query.data]);
  const parts = useMemo(() => partitionCoupons(coupons), [coupons]);
  const rows = tab === 'all' ? coupons : parts[tab];
  const itemTotal = cart.totalFor(module);

  const claim = async (): Promise<void> => {
    const value = code.trim().toUpperCase();
    if (value.length < 3) {
      sheet.warning('Enter a code', 'Type the code exactly as the campaign shows it, e.g. AURA50.');
      return;
    }
    setBusy(true);
    try {
      const result = await claimPromo(value);
      await refreshUser();
      query.setData(result.coupons);
      setCode('');
      haptic.success();
      sheet.show({
        title: `${result.coupon.code} is in your wallet`,
        message: `${result.coupon.title} · ${result.coupon.offType === 'percent' ? `${result.coupon.offValue}% off` : `${money(result.coupon.offValue)} off`}${result.coupon.minOrder > 0 ? ` on orders above ${money(result.coupon.minOrder)}` : ''}.`,
        icon: 'coupon',
        tone: 'success',
        dismissLabel: 'Nice',
        actions: [{ label: 'Use in cart', onPress: () => navigation.navigate('Cart'), variant: 'primary' }],
      });
    } catch (error) {
      sheet.error('Code not valid', error instanceof ApiError ? error.message : 'That code is expired or already claimed.');
    } finally {
      setBusy(false);
    }
  };

  const apply = (coupon: UserCoupon): void => {
    if (tab !== 'available') return;
    cart.setCoupon(module, coupon.code);
    haptic.success();
    sheet.show({
      title: 'Coupon applied',
      message: `${coupon.code} will be checked against the store minimum when you order.`,
      icon: 'check',
      tone: 'success',
      dismissLabel: 'Stay here',
      actions: [{ label: 'Open cart', onPress: () => navigation.navigate('Cart'), variant: 'primary' }],
    });
  };

  return (
    <Screen
      title="Coupons"
      subtitle={`${parts.available.length} ready to use`}
      back
      padded={false}
      onRefresh={query.refresh}
      refreshing={query.refreshing}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <Input
            label="Have a code?"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase().slice(0, 16))}
            placeholder="AURA50"
            icon="coupon"
            containerStyle={{ flex: 1 }}
          />
          <Button title="Claim" onPress={() => void claim()} loading={busy} style={{ marginBottom: 2 }} />
        </View>
        {!isLoggedIn ? (
          <View style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceHi }}>
            <EmptyState
              compact
              icon="user"
              title="Claimed codes live on your account"
              subtitle="Sign in to keep coupons across devices."
              actionLabel="Sign in"
              onAction={() => navigation.navigate('Auth', { mode: 'login' })}
            />
          </View>
        ) : null}
      </View>

      <SegmentedTabs
        tabs={[
          { key: 'available', label: 'Available', count: parts.available.length },
          { key: 'used', label: 'Used', count: parts.used.length },
          { key: 'expired', label: 'Expired', count: parts.expired.length },
        ]}
        active={tab}
        onChange={(next) => setTab(next as CouponFilter)}
      />

      {query.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={3} thumb={0} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="coupon"
          title={tab === 'available' ? 'No coupons yet' : tab === 'used' ? 'Nothing used yet' : 'Nothing expired'}
          subtitle={tab === 'available' ? `Claim a code above, or pick a ${module === 'food' ? 'dish' : 'product'} — campaigns appear here all week.` : 'Coupons move here automatically.'}
        />
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          {rows.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              state={tab === 'used' ? 'used' : tab === 'expired' ? 'expired' : 'available'}
              itemTotal={itemTotal}
              applied={cart.couponCode[module] === coupon.code}
              onPress={() => apply(coupon)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
