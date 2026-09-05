import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { Avatar, Tag } from '@/components/ui/Primitives';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { OrderCard } from '@/components/orders/OrderCard';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchWallet, fetchLoyalty, fetchReferral, type LoyaltyState, type ReferralState, type WalletState } from '@/api/rewards';
import { listOrders } from '@/api/orders';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { joinedOn, money, tierFor } from '@/lib/format';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { Nav } from '@/navigation/types';
import type { Order } from '@/types';

/**
 * Account hub (`features/profile/view/profile_view.dart`): 240-tall coloured
 * header, avatar, joined-on line, edit chip, then the wallet/loyalty card and
 * the money list entries.
 */
export function ProfileScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser, logout, favorites } = useSession();

  const rewards = useQuery<{ wallet: WalletState; loyalty: LoyaltyState; referral: ReferralState }>(
    useCallback(async () => {
      const [wallet, loyalty, referral] = await Promise.all([fetchWallet(), fetchLoyalty(), fetchReferral()]);
      return { wallet, loyalty, referral };
    }, [user]),
  );

  const orders = useQuery<{ orders: Order[] }>(useCallback(async () => {
    const result = await listOrders({ limit: 3 });
    return { orders: result.orders };
  }, [user]), {});

  const settings = useAppSettings();
  const tier = tierFor(user?.loyaltyPoints ?? 0, settings.data?.loyalty.tiers);

  if (!isLoggedIn || !user) {
    return (
      <Screen title="Account">
        <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
          <Icon name="userRound" size={54} color={c.primary} />
          <Text variant="h3" weight="bold" center>
            You are browsing as a guest
          </Text>
          <Text variant="bodySm" tone="muted" center>
            Sign in to keep your wallet, loyalty points, coupons and order history in one place.
          </Text>
          <Button title="Sign in" size="lg" onPress={() => navigation.navigate('Auth', { mode: 'login' })} style={{ alignSelf: 'stretch' }} />
          <Button title="Create an account" variant="secondary" onPress={() => navigation.navigate('Auth', { mode: 'register' })} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const stat = (icon: IconName, label: string, value: string, onPress: () => void): React.ReactElement => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.stat, { backgroundColor: c.surface, opacity: pressed ? 0.92 : 1 }]}>
      <Icon name={icon} size={16} color={c.primary} />
      <Text variant="micro" tone="muted">
        {label}
      </Text>
      <Text variant="subtitle" weight="semibold" numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );

  return (
    <Screen
      scroll
      padded={false}
      title="Account"
      back={navigation.canGoBack()}
      onRefresh={() => {
        rewards.refresh();
        orders.refresh();
        void refreshUser();
      }}
      refreshing={rewards.refreshing}
      header={
        <FlushSurface style={{ backgroundColor: c.primary }}>
          <View style={styles.hero}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={user.name} uri={user.avatar?.uri ?? null} size={70} ring />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3" weight="bold" color={c.white} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.86)">
                  +91 {user.phone}
                </Text>
                <Text variant="micro" color="rgba(255,255,255,0.72)">
                  {`Joined ${joinedOn(user.createdAt)}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('EditProfile')}
                style={({ pressed }) => [styles.editChip, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Icon name="edit" size={13} color={c.white} />
                <Text variant="micro" weight="semibold" color={c.white}>
                  Edit
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md }}>
              <View style={styles.tierPill}>
                <Icon name="loyalty" size={13} color={c.primary} />
                <Text variant="micro" weight="semibold" color={c.primary}>
                  {tier.name} member
                </Text>
              </View>
              <Text variant="micro" color="rgba(255,255,255,0.85)">
                {user.loyaltyPoints} points · {money(user.wallet)} in wallet
              </Text>
            </View>
          </View>
        </FlushSurface>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        {/* Wallet + loyalty card */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="faint">
                WALLET
              </Text>
              <Text variant="h2" weight="bold">
                {money(rewards.data?.wallet.balance ?? user.wallet)}
              </Text>
              <Text variant="micro" tone="muted">
                {(rewards.data?.wallet.transactions ?? []).length} transactions · add money any time
              </Text>
            </View>
            <View style={{ width: 1, height: 54, backgroundColor: c.border }} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text variant="overline" tone="faint">
                LOYALTY
              </Text>
              <Text variant="h2" weight="bold" color={tier.color}>
                {rewards.data?.loyalty.points ?? user.loyaltyPoints}
              </Text>
              <Text variant="micro" tone="muted">
                {tier.name} · {Math.round(tier.progress * 100)}% to next
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
            <Button title="Add money" size="sm" icon="plus" onPress={() => navigation.navigate('Wallet')} style={{ flex: 1 }} />
            <Button title="Redeem points" size="sm" variant="secondary" icon="loyalty" onPress={() => navigation.navigate('Loyalty')} style={{ flex: 1 }} />
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statRow}>
          {stat('orders', 'Orders', String(orders.data?.orders.length ?? 0), () => navigation.navigate('Tabs'))}
          {stat('heart', 'Favourites', String(favorites.length), () => navigation.navigate('Favorites'))}
          {stat('coupon', 'Coupons', String(user.coupons?.length ?? 0), () => navigation.navigate('Coupons'))}
          {stat('referral', 'Referrals', String(rewards.data?.referral.friends ?? 0), () => navigation.navigate('ReferEarn'))}
        </View>

        {/* Recent orders */}
        {(orders.data?.orders.length ?? 0) > 0 ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, paddingBottom: 4 }}>
              <Text variant="overline" tone="faint" style={{ flex: 1 }}>
                RECENT ORDERS
              </Text>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Tabs')} hitSlop={8}>
                <Text variant="caption" weight="semibold" color={c.primary}>
                  See all
                </Text>
              </Pressable>
            </View>
            {(orders.data?.orders ?? []).map((order) => (
              <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('OrderDetail', { id: order.id })} />
            ))}
          </View>
        ) : orders.loading ? (
          <SkeletonList rows={2} thumb={32} />
        ) : null}

        {/* Account entries */}
        <ListSection title="ACCOUNT">
          <ListRow title="Delivery addresses" subtitle="Saved places you order to" icon="mapPin" onPress={() => navigation.navigate('Addresses')} meta={`${(orders.data?.orders ?? []).length} recent`} />
          <ListRow title="Wallet & transactions" subtitle="Add money, see every debit and credit" icon="wallet" onPress={() => navigation.navigate('Wallet')} />
          <ListRow title="Loyalty & tiers" subtitle={`${settings.data?.loyalty.earnPer100 ?? 5} points per ₹100 · redeem ${settings.data?.loyalty.redeemPoints ?? 100} points = ${money(settings.data?.loyalty.redeemValue ?? 10)}`} icon="loyalty" onPress={() => navigation.navigate('Loyalty')} />
          <ListRow title="Coupons" subtitle="Claimed offers and their conditions" icon="coupon" onPress={() => navigation.navigate('Coupons')} />
          <ListRow title="Refer & earn" subtitle={rewards.data ? `${rewards.data.referral.code} · ${money(rewards.data.referral.earnings)} earned` : 'Share your code'} icon="referral" onPress={() => navigation.navigate('ReferEarn')} />
          <ListRow
            title="Edit profile"
            subtitle="Name, email and photo"
            icon="user"
            onPress={() => navigation.navigate('EditProfile')}
            last
          />
        </ListSection>

        <ListSection title="APP">
          <ListRow title="Settings" subtitle="Theme, notifications, offline data" icon="settings" onPress={() => navigation.navigate('Settings')} />
          <ListRow title="Help & support" subtitle="FAQ and ways to reach us" icon="chat" onPress={() => navigation.navigate('Help')} />
          <ListRow title="Become a delivery partner" subtitle={user.partnerApplication ? `Application ${user.partnerApplication.status.toLowerCase()}` : 'Earn with Aurasure in your city'} icon="bike" onPress={() => navigation.navigate('Partner')} />
          <ListRow
            title="Log out"
            subtitle="Your cart and favourites stay on this device"
            icon="logout"
            iconTone="danger"
            last
            onPress={() => {
              void (async () => {
                const ok = await sheet.confirm({ title: 'Log out?', message: 'You can still browse as a guest. Placing orders needs a sign-in.', confirmLabel: 'Log out', destructive: true, icon: 'logout' });
                if (!ok) return;
                await logout();
                sheet.info('Signed out', 'Browse as a guest, or sign back in any time.');
              })();
            }}
          />
        </ListSection>

        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceHi, gap: 4 }}>
          <MetaRow label="Customer since" value={joinedOn(user.createdAt)} />
          <View style={styles.rule} />
          <MetaRow label="Account ID" value={user.id.slice(-8).toUpperCase()} />
          <View style={styles.rule} />
          <MetaRow label="Role" value={user.role} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Tag label="Aurasure API v1" icon="shield" tone="muted" />
            {rewards.error ? <Tag label="Offline data" icon="wifiOff" tone="warning" /> : <Tag label="Synced" icon="circleCheck" tone="success" />}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.edge, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: '#FFFFFF' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  statRow: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', minWidth: 0 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)' },
});
