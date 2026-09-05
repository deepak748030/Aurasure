import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen, FlushSurface } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName, BRAND } from '@/lib/icons';
import { Avatar, Tag } from '@/components/ui/Primitives';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchWallet, type WalletState } from '@/api/rewards';
import { useSession } from '@/context/SessionContext';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { useCart } from '@/context/CartContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { joinedOn, money, tierFor } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';
import type { ModuleKey } from '@/types';

/**
 * "Menu" tab — the drawer of the reference app rebuilt as a screen: identity,
 * module switch, then every account entry in groups.
 */
export function MenuScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const { setModule, module: active, user, isLoggedIn, logout, refreshUser, online, favorites } = useSession();
  const { toggle, resolved } = useTheme();
  const sheet = useSheet();
  const cart = useCart();

  const wallet = useQuery<WalletState>(useCallback(() => (isLoggedIn ? fetchWallet() : Promise.resolve({ balance: 0, transactions: [] })), [isLoggedIn]), { enabled: isLoggedIn });

  const tier = tierFor(user?.loyaltyPoints ?? 0);

  const rows: { group: string; items: { label: string; icon: IconName; onPress: () => void; badge?: string; tone?: 'primary' | 'success' | 'danger' | 'warning' | 'muted' }[] }[] = [
    {
      group: 'MY ORDERS',
      items: [
        { label: 'Current orders', icon: 'truck', onPress: () => navigation.navigate('Tabs'), badge: cart.cartHasItems ? 'cart' : undefined },
        { label: 'Favourites', icon: 'heart', onPress: () => navigation.navigate('Favorites'), badge: favorites.length > 0 ? String(favorites.length) : undefined },
        { label: 'Addresses', icon: 'mapPin', onPress: () => navigation.navigate('Addresses') },
      ],
    },
    {
      group: 'MONEY & REWARDS',
      items: [
        { label: 'Wallet', icon: 'wallet', onPress: () => navigation.navigate('Wallet') },
        { label: 'Loyalty & tiers', icon: 'loyalty', onPress: () => navigation.navigate('Loyalty') },
        { label: 'Coupons', icon: 'coupon', onPress: () => navigation.navigate('Coupons') },
        { label: 'Refer & earn', icon: 'referral', onPress: () => navigation.navigate('ReferEarn') },
      ],
    },
    {
      group: 'ACCOUNT & APP',
      items: [
        { label: 'Profile', icon: 'userRound', onPress: () => navigation.navigate('Profile') },
        { label: 'Notifications', icon: 'bell', onPress: () => navigation.navigate('Notifications') },
        { label: 'Settings', icon: 'settings', onPress: () => navigation.navigate('Settings') },
        { label: 'Help & support', icon: 'chat', onPress: () => navigation.navigate('Help') },
        { label: 'Become a delivery partner', icon: 'bike', onPress: () => navigation.navigate('Partner'), tone: 'success' },
      ],
    },
    {
      group: 'POLICIES',
      items: [
        { label: 'Cancellation policy', icon: 'circleX', onPress: () => navigation.navigate('Policy', { kind: 'cancellation' }) },
        { label: 'Refund policy', icon: 'bank', onPress: () => navigation.navigate('Policy', { kind: 'refund' }) },
        { label: 'Privacy policy', icon: 'shieldLock', onPress: () => navigation.navigate('Policy', { kind: 'privacy' }) },
        { label: 'Terms & conditions', icon: 'terms', onPress: () => navigation.navigate('Policy', { kind: 'terms' }) },
      ],
    },
  ];

  const switchModule = async (): Promise<void> => {
    const next = await sheet.pick({
      title: 'Browse mode',
      subtitle: 'Cart, menus and offers follow this choice',
      options: [
        { label: 'Food', value: 'food', description: 'Restaurants and cloud kitchens', icon: 'utensils' },
        { label: 'Shop', value: 'shop', description: 'Grocery, fashion, pharmacy', icon: 'store' },
      ],
    });
    if (!next || next === active) return;
    setModule(next as ModuleKey);
    haptic.selection();
  };

  return (
    <Screen
      title="Menu"
      subtitle={isLoggedIn ? user?.name : 'Guest'}
      padded={false}
      onRefresh={() => {
        if (isLoggedIn) void refreshUser();
        wallet.refresh();
      }}
      refreshing={wallet.refreshing}
      header={
        <FlushSurface style={{ backgroundColor: c.primary }}>
          <View style={{ padding: spacing.edge, paddingTop: spacing.sm, gap: spacing.md }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate(isLoggedIn ? 'Profile' : 'Auth', isLoggedIn ? undefined : { mode: 'login' })}
              style={({ pressed }) => [styles.identity, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Avatar name={user?.name ?? 'Guest'} uri={user?.avatar?.uri ?? null} size={52} ring />
              <View style={{ flex: 1 }}>
                <Text variant="h3" weight="bold" color={c.white} numberOfLines={1}>
                  {user?.name ?? 'Welcome to Aurasure'}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.86)" numberOfLines={1}>
                  {isLoggedIn ? `+91 ${user?.phone} · joined ${joinedOn(user?.createdAt)}` : 'Sign in for orders, wallet and rewards'}
                </Text>
              </View>
              <Icon name={isLoggedIn ? 'edit' : 'chevronRight'} size={16} color={c.white} />
            </Pressable>

            <View style={styles.balanceRow}>
              <View style={styles.balance}>
                <Text variant="micro" color="rgba(255,255,255,0.8)">
                  WALLET
                </Text>
                <Text variant="title" weight="semibold" color={c.white}>
                  {isLoggedIn ? money(wallet.data?.balance ?? user?.wallet ?? 0) : '—'}
                </Text>
              </View>
              <View style={styles.balance}>
                <Text variant="micro" color="rgba(255,255,255,0.8)">
                  POINTS
                </Text>
                <Text variant="title" weight="semibold" color={c.white}>
                  {user?.loyaltyPoints ?? 0}
                </Text>
              </View>
              <View style={[styles.balance, { borderRightWidth: 0 }]}>
                <Text variant="micro" color="rgba(255,255,255,0.8)">
                  TIER
                </Text>
                <Text variant="title" weight="semibold" color={c.white}>
                  {tier.name}
                </Text>
              </View>
            </View>
          </View>
        </FlushSurface>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}>
        {/* Module + appearance toggles */}
        <View style={styles.quickRow}>
          <Pressable accessibilityRole="button" onPress={() => void switchModule()} style={({ pressed }) => [styles.quick, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}>
            <Icon name={active === 'food' ? 'utensils' : 'store'} size={17} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="semibold">
                {active === 'food' ? 'Food mode' : 'Shop mode'}
              </Text>
              <Text variant="micro" tone="muted">
                Tap to switch
              </Text>
            </View>
            <Icon name="swapVertical" size={15} color={c.textTertiary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.selection();
              toggle();
            }}
            style={({ pressed }) => [styles.quick, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Icon name={resolved === 'dark' ? 'moon' : 'sun'} size={17} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="semibold">
                {resolved === 'dark' ? 'Dark theme' : 'Light theme'}
              </Text>
              <Text variant="micro" tone="muted">
                Tap to change
              </Text>
            </View>
          </Pressable>
        </View>

        {rows.map((section) => (
          <ListSection key={section.group} title={section.group}>
            {section.items.map((item, index) => (
              <ListRow
                key={item.label}
                title={item.label}
                icon={item.icon}
                iconTone={item.tone ?? 'primary'}
                badge={item.badge}
                last={index === section.items.length - 1}
                onPress={item.onPress}
              />
            ))}
          </ListSection>
        ))}

        {wallet.loading && !wallet.data ? <SkeletonList rows={2} thumb={30} /> : null}

        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
            DEVICE STATE
          </Text>
          <MetaRow label="Connection" value={online === false ? 'Offline' : online === true ? 'Aurasure API ok' : 'Checking…'} tone={online === false ? 'danger' : 'success'} />
          <MetaRow label="Cart" value={`${cart.countFor('food')} food · ${cart.countFor('shop')} shop`} />
          <MetaRow label="Favourites" value={String(favorites.length)} />
          <View style={styles.rule} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 }}>
            <Icon name={BRAND.icon} size={14} color={c.primary} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              {BRAND.name} · customer app
            </Text>
            <Tag label="v1.0.0" tone="muted" />
          </View>
        </View>

        {isLoggedIn ? (
          <Button
            title="Log out"
            variant="secondary"
            icon="logout"
            onPress={() => {
              void (async () => {
                const ok = await sheet.confirm({ title: 'Log out?', message: 'Your cart and favourites stay on this device.', confirmLabel: 'Log out', destructive: true, icon: 'logout' });
                if (!ok) return;
                await logout();
                sheet.info('Signed out', 'You can keep browsing as a guest.');
              })();
            }}
            style={{ alignSelf: 'stretch' }}
          />
        ) : (
          <View style={{ gap: 8 }}>
            <Button title="Sign in" size="lg" onPress={() => navigation.navigate('Auth', { mode: 'login' })} style={{ alignSelf: 'stretch' }} />
            <Button title="Create an account" variant="secondary" onPress={() => navigation.navigate('Auth', { mode: 'register' })} style={{ alignSelf: 'stretch' }} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  balanceRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md },
  balance: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: spacing.sm, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.18)' },
  quickRow: { flexDirection: 'row', gap: 6 },
  quick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,100,118,0.18)', marginVertical: 4 },
});
