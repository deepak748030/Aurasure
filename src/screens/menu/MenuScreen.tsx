import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import { useApp } from '@/context/AppContext';
import type { IconName } from '@/types';

// Page background of the More screen; also what the status bar sits on once the
// gradient hero has scrolled away.
const PAGE_BG = '#F3F1F5';

interface MenuRow {
  label: string;
  icon: IconName;
  tint: string;
  color: string;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  rows: MenuRow[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'General',
    rows: [
      { label: 'Edit Profile', icon: 'user', tint: '#E4F1FC', color: '#2E87D6' },
      { label: 'My Address', icon: 'mapPin', tint: '#FDE9DE', color: '#E07B3B' },
      { label: 'Settings', icon: 'settings', tint: '#EEEEF0', color: '#6D6D7A' },
    ],
  },
  {
    title: 'Promotional Activity',
    rows: [
      { label: 'Coupon', icon: 'ticket', tint: '#FFF3D6', color: '#DD9A0B' },
      { label: 'Loyalty Points', icon: 'star', tint: '#FFF5DE', color: '#E5A710' },
      { label: 'My Wallet', icon: 'wallet', tint: '#FFF3D6', color: '#D98E12' },
    ],
  },
  {
    title: 'Earnings',
    rows: [
      { label: 'Refer & Earn', icon: 'share', tint: '#E5F7E5', color: '#2C9B4D' },
      { label: 'Join as a Delivery Man', icon: 'truck', tint: '#E2F1FF', color: '#2E87D6' },
      { label: 'Open Vendor', icon: 'store', tint: '#FCE7E4', color: '#D9573F' },
    ],
  },
  {
    title: 'Help & Support',
    rows: [
      { label: 'Live Chat', icon: 'message', tint: '#E5F7E5', color: '#2C9B4D' },
      { label: 'Help & Support', icon: 'phone', tint: '#E4F1FC', color: '#2E87D6' },
      { label: 'Terms & Conditions', icon: 'info', tint: '#F0E8FF', color: '#8C5ADB' },
      { label: 'Privacy Policy', icon: 'shield', tint: '#FBE3E8', color: '#D9573F' },
      { label: 'Refund Policy', icon: 'refresh', tint: '#E5F7E5', color: '#2C9B4D' },
    ],
  },
];

export function MenuScreen(): React.ReactElement {
  const { phone, name, login } = useApp();
  const [dark, setDark] = useState(false);
  const displayName = name && phone ? name : 'Guest User';
  const insets = useSafeAreaInsets();
  // The hero runs all the way under the status bar, so the notification bar
  // picks up the app's deep plum (and white icons) instead of a system grey.
  // Once the hero has scrolled out, the strip behind the status bar is the
  // light page background, so the icons flip back to ink.
  const [heroHeight, setHeroHeight] = useState(0);
  const [heroGone, setHeroGone] = useState(false);
  const surface = heroGone ? PAGE_BG : colors.appBarHero;
  useScreenBars(surface, { navigationBar: colors.appBar });

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
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
            <Text variant="h2" weight="extrabold" color={colors.white} style={{ flex: 1, marginLeft: 14 }}>
              {displayName}
            </Text>
            <Pressable onPress={() => setDark((v) => !v)} style={styles.toggle} hitSlop={6}>
              <View style={styles.toggleKnob}>
                <Icon name="phone" size={13} color="#8B0057" />
              </View>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                {dark ? 'Dark' : 'Light'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.loginIconBox}>
              <Icon name="user" size={24} color={colors.white} />
            </View>
            <Text variant="subtitle" color={colors.white} style={{ flex: 1, marginHorizontal: 12 }}>
              For more personalised & smooth experience.
            </Text>
            <Pressable
              onPress={() => {
                haptic.light();
                login('+91 9876543210', 'Guest User');
              }}
              style={styles.loginBtn}
            >
              <Text variant="caption" weight="bold" color="#8B0057">
                Log in/ Sign up
              </Text>
              <Icon name="arrowRight" size={14} color="#8B0057" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {SECTIONS.map((section) => (
            <View key={section.title}>
              <Text variant="overline" color="#A9A2AD" style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </Text>
              <View style={styles.card}>
                {section.rows.map((row, i) => (
                  <Pressable
                    key={row.label}
                    onPress={() => haptic.light()}
                    style={({ pressed }) => [
                      styles.row,
                      { opacity: pressed ? 0.92 : 1, backgroundColor: pressed ? '#FBF5FA' : 'transparent' },
                      i > 0 ? styles.rowTop : null,
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: row.tint }]}>
                      <Icon name={row.icon} size={20} color={row.color} filled />
                    </View>
                    <Text variant="subtitle" weight="semibold" color={colors.text} style={{ flex: 1, marginLeft: 14 }}>
                      {row.label}
                    </Text>
                    <Icon name="chevronRight" size={20} color="#B5A8B5" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => {
              haptic.light();
              login('+91 9876543210', 'Guest User');
            }}
            style={({ pressed }) => [styles.signIn, { opacity: pressed ? 0.92 : 1 }]}
          >
            <View style={styles.signInIcon}>
              <Icon name="login" size={18} color="#9C005E" />
            </View>
            <Text variant="title" weight="bold" color="#9C005E">
              Sign In
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 38,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#A4006B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
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
  content: { paddingHorizontal: 16, marginTop: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    // Bleeds into the card padding so the pressed pill reaches the card edge.
    marginHorizontal: -10,
    paddingHorizontal: 10,
    minHeight: 60,
    borderRadius: radius.pill,
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
  signInIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4D5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});
