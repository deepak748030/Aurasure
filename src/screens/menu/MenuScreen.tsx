import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SmartImage } from '../../components/ui/SmartImage';
import { useMockQuery } from '../../hooks/useMockQuery';
import { userProfile } from '../../data/mock';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/context/AppContext';
import { switchTab } from '@/navigation/RootNavigation';
import type { IconName, ModuleKey } from '@/types';

type Sheet = 'address' | 'help' | 'about' | 'logout' | null;

const MODULES: { key: ModuleKey; label: string; sub: string; icon: IconName }[] = [
  { key: 'food', label: 'Food delivery', sub: 'Restaurants & live tracking', icon: 'utensils' },
  { key: 'shop', label: 'E-commerce', sub: 'Electronics, fashion, home', icon: 'bag' },
];

const QUICK: { key: 'Likes' | 'Cart' | 'Orders'; label: string; icon: IconName }[] = [
  { key: 'Likes', label: 'Saved items', icon: 'heart' },
  { key: 'Cart', label: 'Cart', icon: 'cart' },
  { key: 'Orders', label: 'My orders', icon: 'receipt' },
];

const HELP: { label: string; icon: IconName }[] = [
  { label: 'Chat with us', icon: 'message' },
  { label: 'Call support', icon: 'phone' },
  { label: 'Email support', icon: 'mail' },
];

export function MenuScreen(): React.ReactElement {
  const { module, switchModule, city, phone, name, logout } = useApp();
  const [sheet, setSheet] = useState<Sheet>(null);
  const { data, refreshing, refresh } = useMockQuery(() => userProfile);

  const displayName = name ?? data.name;
  const displayPhone = phone ?? data.phone;

  const rows: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Saved addresses', icon: 'mapPin', onPress: () => setSheet('address') },
    { label: 'Payments & wallet', icon: 'wallet', onPress: () => setSheet('about') },
    { label: 'Help & support', icon: 'message', onPress: () => setSheet('help') },
    { label: 'About Aurasure', icon: 'info', onPress: () => setSheet('about') },
  ];

  return (
    <Screen title="Menu" subtitle={city ? `Delivering to ${city}` : 'Set your city'} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.identity}>
        <SmartImage source={data.avatar} placeholderIcon="user" style={styles.avatar} tint={colors.brand[100]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="h3" weight="bold" color={colors.text}>
            {displayName}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {displayPhone}
          </Text>
        </View>
        <Badge label={module === 'food' ? 'Food' : 'Store'} tone={module === 'food' ? 'food' : 'brand'} />
      </View>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: spacing.lg, marginBottom: 8 }}>
        CHOOSE YOUR MODULE
      </Text>
      <Card padding={spacing.xs} radiusSize={radius.md}>
        {MODULES.map((m, i) => {
          const on = m.key === module;
          return (
            <Pressable
              key={m.key}
              onPress={() => {
                haptic.selection();
                switchModule(m.key);
                switchTab('Home');
              }}
              style={({ pressed }) => [styles.line, { opacity: pressed ? 0.9 : 1 }, i === 0 ? null : styles.lineTop]}
            >
              <View style={[styles.lineIcon, { backgroundColor: on ? (m.key === 'food' ? colors.food[50] : colors.brand[50]) : colors.surfaceAlt }]}>
                <Icon name={m.icon} size={18} color={on ? (m.key === 'food' ? colors.food[600] : colors.brand[600]) : colors.textTertiary} filled={on} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" weight="semibold" color={colors.text}>
                  {m.label}
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {m.sub}
                </Text>
              </View>
              <Icon name={on ? 'circleCheck' : 'chevronRight'} size={18} color={on ? colors.success : colors.textTertiary} filled={on} />
            </Pressable>
          );
        })}
      </Card>

      <Text variant="overline" color={colors.textTertiary} style={{ marginTop: spacing.lg, marginBottom: 8 }}>
        QUICK LINKS
      </Text>
      <Card padding={spacing.xs} radiusSize={radius.md}>
        {QUICK.map((q, i) => (
          <Pressable
            key={q.key}
            onPress={() => {
              haptic.light();
              switchTab(q.key);
            }}
            style={({ pressed }) => [styles.line, { opacity: pressed ? 0.9 : 1 }, i === 0 ? null : styles.lineTop]}
          >
            <View style={[styles.lineIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={q.icon} size={18} color={colors.brand[600]} />
            </View>
            <Text variant="subtitle" weight="medium" color={colors.text} style={{ flex: 1 }}>
              {q.label}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>

      <Pressable onPress={() => setSheet('about')} style={({ pressed }) => [styles.wallet, { opacity: pressed ? 0.95 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="rgba(255,255,255,0.82)">
            Aurasure wallet
          </Text>
          <Text variant="h2" weight="bold" color={colors.white} style={{ marginTop: 2 }}>
            {formatINR(data.wallet)}
          </Text>
        </View>
        <View style={styles.walletIcon}>
          <Icon name="wallet" size={20} color={colors.white} filled />
        </View>
      </Pressable>

      <Card padding={spacing.xs} radiusSize={radius.md} style={{ marginTop: spacing.lg }}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => {
              haptic.light();
              r.onPress();
            }}
            style={({ pressed }) => [styles.line, { opacity: pressed ? 0.9 : 1 }, i === 0 ? null : styles.lineTop]}
          >
            <View style={[styles.lineIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={r.icon} size={18} color={colors.brand[600]} />
            </View>
            <Text variant="subtitle" weight="medium" color={colors.text} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>

      <Button title="Log out" variant="danger" fullWidth leftIcon="logout" style={{ marginTop: spacing.lg }} onPress={() => setSheet('logout')} />
      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: spacing.md }}>
        Aurasure · v1.0.0 · mock data build
      </Text>

      <BottomSheet visible={sheet === 'address'} onClose={() => setSheet(null)} title="Saved addresses">
        {data.addresses.map((a) => (
          <View key={a.id} style={styles.sheetRow}>
            <Icon name="mapPin" size={18} color={colors.brand[600]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="subtitle" weight="semibold" color={colors.text}>
                {a.label} {a.isDefault ? '· Default' : ''}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {a.line}, {a.city} - {a.pin}
              </Text>
            </View>
          </View>
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === 'help'} onClose={() => setSheet(null)} title="Help & support">
        {HELP.map((h) => (
          <Pressable key={h.label} onPress={() => setSheet(null)} style={({ pressed }) => [styles.sheetRow, { opacity: pressed ? 0.9 : 1 }]}>
            <View style={[styles.lineIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={h.icon} size={18} color={colors.brand[600]} />
            </View>
            <Text variant="subtitle" color={colors.text} style={{ flex: 1, marginLeft: 10 }}>
              {h.label}
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === 'about'} onClose={() => setSheet(null)} title="About Aurasure">
        <Text variant="body" color={colors.textSecondary}>
          One app for food delivery and shopping. This build runs entirely on mock data: no backend, no real SMS, and the cart/orders reset when you
          reload the app.
        </Text>
      </BottomSheet>

      <BottomSheet visible={sheet === 'logout'} onClose={() => setSheet(null)} title="Log out?">
        <Text variant="body" color={colors.textSecondary}>
          You will be signed out and asked for location, module and mobile number again.
        </Text>
        <Button
          title="Log out"
          variant="danger"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={() => {
            setSheet(null);
            haptic.warning();
            logout();
          }}
        />
        <Button title="Cancel" variant="ghost" fullWidth style={{ marginTop: spacing.sm }} onPress={() => setSheet(null)} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: radius.md },
  line: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, minHeight: 62 },
  lineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  lineIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
});
