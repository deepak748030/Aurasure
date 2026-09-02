import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from '../../components/ui/Text';
import { Skeleton } from '../../components/ui/Skeleton';
import { Icon } from '@/lib/icons';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import { useApp } from '@/context/AppContext';
import { useAppQuery } from '@/hooks/useAppQuery';
import { fetchLoyalty, fetchWallet } from '@/api/account';
import type { IconName } from '@/types';
import type { MenuDetailKey, MenuStackParamList } from '../../navigation/types';

// Page background of the More screen; also what the status bar sits on once the
// gradient hero has scrolled away. Matches the tab bar surface exactly so the
// screen and the tab bar read as one piece with no seam.
const PAGE_BG = '#F5EAF3';

interface MenuRow {
  label: string;
  icon: IconName;
  tint: string;
  color: string;
  route: MenuDetailKey;
}

interface MenuSection {
  title: string;
  rows: MenuRow[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'General',
    rows: [
      { label: 'Edit Profile', icon: 'user', tint: '#E4F1FC', color: '#2E87D6', route: 'editProfile' },
      { label: 'My Address', icon: 'mapPin', tint: '#FDE9DE', color: '#E07B3B', route: 'myAddress' },
      { label: 'Settings', icon: 'settings', tint: '#EEEEF0', color: '#6D6D7A', route: 'settings' },
    ],
  },
  {
    title: 'Manage',
    rows: [
      { label: 'Admin Console', icon: 'gauge', tint: '#EDE9FE', color: '#5B4BC4', route: 'admin' },
    ],
  },
  {
    title: 'Promotional Activity',
    rows: [
      { label: 'Coupon', icon: 'ticket', tint: '#FFF3D6', color: '#DD9A0B', route: 'coupon' },
      { label: 'Loyalty Points', icon: 'star', tint: '#FFF5DE', color: '#E5A710', route: 'loyalty' },
      { label: 'My Wallet', icon: 'wallet', tint: '#FFF3D6', color: '#D98E12', route: 'wallet' },
    ],
  },
  {
    title: 'Earnings',
    rows: [
      { label: 'Refer & Earn', icon: 'share', tint: '#E5F7E5', color: '#2C9B4D', route: 'refer' },
      { label: 'Join as a Delivery Man', icon: 'truck', tint: '#E2F1FF', color: '#2E87D6', route: 'delivery' },
      { label: 'Open Vendor', icon: 'store', tint: '#FCE7E4', color: '#D9573F', route: 'vendor' },
    ],
  },
  {
    title: 'Help & Support',
    rows: [
      { label: 'Live Chat', icon: 'message', tint: '#E5F7E5', color: '#2C9B4D', route: 'liveChat' },
      { label: 'Help & Support', icon: 'phone', tint: '#E4F1FC', color: '#2E87D6', route: 'help' },
      { label: 'Terms & Conditions', icon: 'info', tint: '#F0E8FF', color: '#8C5ADB', route: 'terms' },
      { label: 'Privacy Policy', icon: 'shield', tint: '#FBE3E8', color: '#D9573F', route: 'privacy' },
      { label: 'Refund Policy', icon: 'refresh', tint: '#E5F7E5', color: '#2C9B4D', route: 'refund' },
    ],
  },
];

export function MenuScreen(): React.ReactElement {
  const { phone, name, logout } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<MenuStackParamList>>();
  const isLoggedIn = !!phone;
  const displayName = isLoggedIn ? name ?? 'User' : 'Guest User';
  const insets = useSafeAreaInsets();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // The hero runs all the way under the status bar, so the notification bar
  // picks up the app's deep plum (and white icons) instead of a system grey.
  // Once the hero has scrolled out, the strip behind the status bar is the
  // light page background, so the icons flip back to ink.
  const [heroHeight, setHeroHeight] = useState(0);
  const [heroGone, setHeroGone] = useState(false);
  const surface = heroGone ? PAGE_BG : colors.appBarHero;
  useScreenBars(surface, { navigationBar: colors.appBar });

  // Live wallet balance + loyalty points shown right under the profile when a
  // user is signed in (falls back to demo values when the API is unavailable).
  const balances = useAppQuery(
    async () => {
      const [w, l] = await Promise.all([fetchWallet(), fetchLoyalty()]);
      if (!w || !l) throw new Error('Rewards unavailable');
      return { wallet: w.balance, points: l.points, tier: l.tier };
    },
    () => ({ wallet: 480, points: 1240, tier: 'Silver' }),
  );

  const openDetail = (key: MenuDetailKey): void => {
    haptic.light();
    navigation.navigate('MenuDetail', { key });
  };

  const goAuth = (): void => {
    haptic.light();
    navigation.navigate('Login');
  };

  const doLogout = (): void => {
    haptic.medium();
    setConfirmLogout(true);
  };

  const confirmLogoutAction = (): void => {
    setConfirmLogout(false);
    haptic.medium();
    logout();
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: PAGE_BG }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Disable the overscroll bounce so the hero never pulls down to reveal a
        // gap above it when scrolling back to the top.
        overScrollMode="never"
        bounces={false}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const threshold = Math.max(0, heroHeight - insets.top - 12);
          const gone = e.nativeEvent.contentOffset.y > threshold;
          setHeroGone((prev) => (prev === gone ? prev : gone));
        }}
      >
        <LinearGradient
          colors={['#6A0A45', '#A4006B', '#C21882']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 18 }]}
          onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Icon name="user" size={30} color="#5B3A7E" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="h2" weight="extrabold" color={colors.white}>
                {displayName}
              </Text>
              {isLoggedIn ? (
                <Text variant="caption" color="rgba(255,255,255,0.85)">
                  {phone}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.loginIconBox}>
              <Icon name={isLoggedIn ? 'user' : 'login'} size={24} color={colors.white} />
            </View>
            <Text variant="subtitle" color={colors.white} style={{ flex: 1, marginHorizontal: 12 }}>
              {isLoggedIn ? 'You are signed in. Everything is personalised.' : 'For more personalised & smooth experience.'}
            </Text>
            <Pressable onPress={isLoggedIn ? doLogout : goAuth} style={styles.loginBtn}>
              <Text variant="caption" weight="bold" color="#8B0057">
                {isLoggedIn ? 'Log out' : 'Log in/ Sign up'}
              </Text>
              <Icon name={isLoggedIn ? 'logout' : 'arrowRight'} size={14} color="#8B0057" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          {/* Live balance quick-glance: wallet + loyalty points, tappable. */}
          {isLoggedIn ? (
            <View style={styles.balanceStrip}>
              <Pressable
                onPress={() => openDetail('wallet')}
                style={({ pressed }) => [styles.balanceCell, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.balanceCellIcon}>
                  <Icon name="wallet" size={16} color="#FFE9B8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="overline" color="rgba(255,255,255,0.75)" weight="bold">
                    WALLET
                  </Text>
                  {balances.loading ? (
                    <Skeleton width={72} height={15} radius={4} style={{ marginTop: 7, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  ) : (
                    <Text variant="subtitle" weight="bold" color={colors.white}>
                      {formatINR(balances.data.wallet)}
                    </Text>
                  )}
                </View>
                <Icon name="chevronRight" size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <View style={styles.balanceDivider} />
              <Pressable
                onPress={() => openDetail('loyalty')}
                style={({ pressed }) => [styles.balanceCell, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.balanceCellIcon, { backgroundColor: 'rgba(242,182,60,0.28)' }]}>
                  <Icon name="star" size={16} color="#FFD968" filled />
                </View>
                <View style={{ flex: 1 }}>
                  {balances.loading ? (
                    <Skeleton width={52} height={12} radius={4} style={{ marginTop: 3, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  ) : (
                    <Text variant="overline" color="rgba(255,255,255,0.75)" weight="bold">
                      {balances.data.tier.toUpperCase()}
                    </Text>
                  )}
                  {balances.loading ? (
                    <Skeleton width={72} height={15} radius={4} style={{ marginTop: 5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  ) : (
                    <Text variant="subtitle" weight="bold" color={colors.white}>
                      {balances.data.points.toLocaleString('en-IN')} pts
                    </Text>
                  )}
                </View>
                <Icon name="chevronRight" size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.content}>
          {SECTIONS.map((section) => (
            <View key={section.title}>
              <View style={styles.card}>
                {/* Section label lives inside the card, grouped-list style. */}
                <Text variant="overline" color="#A9A2AD" style={styles.cardTitle}>
                  {section.title.toUpperCase()}
                </Text>
                {section.rows.map((row, i) => (
                  <Pressable
                    key={row.label}
                    onPress={() => {
                      haptic.light();
                      navigation.navigate('MenuDetail', { key: row.route });
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      { opacity: pressed ? 0.92 : 1, backgroundColor: pressed ? '#FBF5FA' : 'transparent' },
                      i > 0 ? styles.rowTop : null,
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: row.tint }]}>
                      <Icon name={row.icon} size={20} color={row.color} filled />
                    </View>
                    <Text variant="subtitle" weight="semibold" color={colors.text} style={{ flex: 1, marginLeft: 12 }}>
                      {row.label}
                    </Text>
                    <Icon name="chevronRight" size={20} color="#B5A8B5" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable
            onPress={isLoggedIn ? doLogout : goAuth}
            style={({ pressed }) => [isLoggedIn ? styles.signOut : styles.signIn, { opacity: pressed ? 0.92 : 1 }]}
          >
            <View style={[styles.signInIcon, isLoggedIn ? styles.signOutIcon : null]}>
              <Icon name={isLoggedIn ? 'logout' : 'login'} size={18} color={isLoggedIn ? colors.danger : '#9C005E'} />
            </View>
            <Text variant="title" weight="bold" color={isLoggedIn ? colors.danger : '#9C005E'}>
              {isLoggedIn ? 'Sign Out' : 'Sign In'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Logout always asks for confirmation first - accidental taps on the
          hero card or the Sign Out row never wipe the session silently. */}
      <BottomSheet visible={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out?">
        <View style={styles.confirmBody}>
          <View style={styles.confirmIcon}>
            <Icon name="logout" size={24} color={colors.danger} />
          </View>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>
            Are you sure you want to log out? Your saved likes and session will be cleared, and you'll need to sign in again.
          </Text>
          <Button
            title="Yes, Log Out"
            variant="danger"
            leftIcon="logout"
            size="lg"
            fullWidth
            style={{ marginTop: 20 }}
            onPress={confirmLogoutAction}
          />
          <Button
            title="Cancel"
            variant="secondary"
            size="lg"
            fullWidth
            style={{ marginTop: 10 }}
            onPress={() => setConfirmLogout(false)}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // No side padding on the root: the gradient hero bleeds edge-to-edge, and
  // the content below owns its own 10px gutter.
  root: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingBottom: 18 },
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F6E9F4',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    padding: 12,
    marginTop: 22,
  },
  loginIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    marginTop: 12,
    padding: 6,
  },
  balanceCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  balanceCellIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(217,142,18,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  balanceDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 6,
  },
  // The 10px gutter belongs to the content column only - the hero above it is
  // full bleed, so the cards span the content width and stay a touch narrower
  // than the rest of the app.
  content: { paddingHorizontal: 10, marginTop: 10 },
  cardTitle: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 62,
    borderRadius: 22,
  },
  rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0EAF0' },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FAF0F9',
    borderWidth: 1,
    borderColor: '#E4BBD8',
    borderRadius: radius.pill,
    paddingVertical: 16,
    marginTop: 24,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F3B9B9',
    borderRadius: radius.pill,
    paddingVertical: 16,
    marginTop: 24,
  },
  signInIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4D5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  signOutIcon: {
    backgroundColor: '#FAD3D3',
  },
  confirmBody: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
