import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SmartImage } from '../../components/ui/SmartImage';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useMockQuery } from '../../hooks/useMockQuery';
import { userProfile } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { switchTab } from '@/navigation/RootNavigation';
import type { IconName } from '@/types';

interface MenuItem {
  label: string;
  icon: IconName;
  onPress: () => void;
  tone?: 'default' | 'danger';
}

export function ProfileScreen(): React.ReactElement {
  const { data, refreshing, refresh } = useMockQuery(() => userProfile);
  const profile = data;
  const [sheet, setSheet] = useState<'address' | 'help' | 'about' | 'logout' | null>(null);

  const menu: MenuItem[] = [
    { label: 'My Orders', icon: 'receipt', onPress: () => switchTab('Orders') },
    { label: 'Saved Addresses', icon: 'mapPin', onPress: () => setSheet('address') },
    { label: 'Payments & Wallet', icon: 'wallet', onPress: () => setSheet('about') },
    { label: 'Help & Support', icon: 'message', onPress: () => setSheet('help') },
    { label: 'About Aurasure', icon: 'info', onPress: () => setSheet('about') },
    { label: 'Log out', icon: 'logout', tone: 'danger', onPress: () => setSheet('logout') },
  ];

  return (
    <Screen title="Profile" refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <SmartImage source={profile.avatar} placeholderIcon="user" style={styles.avatar} tint={colors.brand[100]} />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text variant="h3" weight="bold" color={colors.text}>
            {profile.name}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {profile.email}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            {profile.phone}
          </Text>
        </View>
      </View>

      <Pressable onPress={() => setSheet('about')} style={styles.wallet}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.walletIcon}>
            <Icon name="wallet" size={20} color={colors.white} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text variant="caption" color="rgba(255,255,255,0.85)">
              Aurasure Wallet
            </Text>
            <Text variant="h3" weight="bold" color={colors.white}>
              {formatINR(profile.wallet)}
            </Text>
          </View>
        </View>
        <Icon name="chevronRight" size={20} color={colors.white} />
      </Pressable>

      <Card variant="alt" style={{ marginTop: 18, paddingVertical: 6 }}>
        {menu.map((m, i) => (
          <Pressable
            key={m.label}
            onPress={() => {
              haptic.light();
              m.onPress();
            }}
            style={[
              styles.menuRow,
              i !== menu.length - 1 && { borderBottomWidth: 1, borderColor: colors.border },
            ]}
          >
            <View style={[styles.menuIcon, m.tone === 'danger' && styles.menuIconDanger]}>
              <Icon name={m.icon} size={18} color={m.tone === 'danger' ? colors.danger : colors.brand[600]} />
            </View>
            <Text variant="subtitle" weight="semibold" color={m.tone === 'danger' ? colors.danger : colors.text} style={{ flex: 1, marginLeft: 12 }}>
              {m.label}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>

      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 24 }}>
        Aurasure v1.0.0 · Crafted with care
      </Text>
      <View style={{ height: 8 }} />

      <BottomSheet visible={sheet === 'address'} onClose={() => setSheet(null)} title="Saved addresses">
        <View>
          {profile.addresses.map((a) => (
            <View key={a.id} style={styles.addrItem}>
              <Icon name="mapPin" size={18} color={colors.brand[600]} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="subtitle" weight="bold" color={colors.text}>
                  {a.label} {a.isDefault ? '· Default' : ''}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {a.line}, {a.city} {a.pin}
                </Text>
              </View>
            </View>
          ))}
          <Button title="Add new address" variant="ghost" fullWidth style={{ marginTop: 8 }} leftIcon="plus" />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'help'} onClose={() => setSheet(null)} title="Help & Support">
        <View>
          <View style={styles.helpRow}>
            <Icon name="message" size={18} color={colors.brand[600]} />
            <Text variant="subtitle" color={colors.text}>Chat with us</Text>
          </View>
          <View style={styles.helpRow}>
            <Icon name="phone" size={18} color={colors.brand[600]} />
            <Text variant="subtitle" color={colors.text}>+91 1800 000 000</Text>
          </View>
          <View style={styles.helpRow}>
            <Icon name="mail" size={18} color={colors.brand[600]} />
            <Text variant="subtitle" color={colors.text}>support@aurasure.app</Text>
          </View>
          <Button title="Close" fullWidth style={{ marginTop: 12 }} onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'about'} onClose={() => setSheet(null)} title="About Aurasure">
        <Text variant="body" color={colors.textSecondary}>
          Aurasure brings food and shopping together in one calm, beautiful experience. This is a demo build powered entirely by mock data.
        </Text>
        <Button title="Close" fullWidth style={{ marginTop: 14 }} onPress={() => setSheet(null)} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'logout'} onClose={() => setSheet(null)} title="Log out?">
        <View>
          <Text variant="body" color={colors.textSecondary}>
            You'll be signed out of this device. Your cart will be cleared.
          </Text>
          <Button title="Log out" variant="danger" fullWidth style={{ marginTop: 14 }} leftIcon="logout" onPress={() => setSheet(null)} />
          <Button title="Cancel" variant="ghost" fullWidth style={{ marginTop: 8 }} onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand[50],
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand[600],
    borderRadius: radius.md,
    padding: spacing.md,
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: colors.dangerBg },
  addrItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  helpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
});
