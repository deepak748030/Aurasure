import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, Card, Divider, SectionTitle } from '@/components/ui/VendorUI';
import { Icon, type IconName } from '@/lib/icons';
import { usePush } from '@/context/PushContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

const EVENTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'orders', title: 'New order placed', body: 'Rings this device the moment a customer checks out.' },
  { icon: 'timer', title: 'Prep timer running out', body: 'A nudge when an accepted order is close to its promised time.' },
  { icon: 'bike', title: 'Rider arriving for pickup', body: 'Tells you when a delivery partner is at your counter.' },
  { icon: 'circleAlert', title: 'Order cancelled', body: 'Fires if a customer or our team cancels an order you accepted.' },
  { icon: 'wallet', title: 'Payout settled', body: 'Sent when a settlement lands in your wallet.' },
];

/** Explains — and lets the vendor fix — how this device is alerted about orders. */
export function AlertsScreen({ navigation }: Props): React.ReactElement {
  const { token } = usePush();
  const [checkedAt, setCheckedAt] = useState<Date>(new Date());
  useEffect(() => { setCheckedAt(new Date()); }, [token]);
  const ready = Boolean(token);

  return (
    <Screen title="Order alerts" subtitle="How this phone tells you an order arrived" headerLeft={<BackButton onPress={() => navigation.goBack()} />} onRefresh={() => setCheckedAt(new Date())}>
      <Card tone={ready ? 'plain' : 'warm'} style={styles.status}>
        <View style={[styles.statusIcon, { backgroundColor: ready ? colors.successBg : colors.warningBg }]}>
          <Icon name={ready ? 'bell' : 'circleAlert'} size={22} color={ready ? colors.success : colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.statusTop}>
            <Text variant="title" weight="bold">{ready ? 'Push alerts are on' : 'Push alerts are off'}</Text>
            <Badge label={ready ? 'LIVE' : 'ACTION NEEDED'} color={ready ? colors.success : colors.warning} background={ready ? colors.successBg : colors.warningBg} />
          </View>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 6 }}>
            {ready
              ? 'This device is registered with Aurasure. New orders will ring even when the app is in the background.'
              : 'Notification permission is not granted, so this phone will stay silent. Enable it in system settings to hear new orders.'}
          </Text>
          {!ready ? <Button title="Open notification settings" variant="secondary" style={{ marginTop: 12 }} onPress={() => void Linking.openSettings()} /> : null}
        </View>
      </Card>

      <SectionTitle title="What we alert you about" />
      <Card style={styles.listCard}>
        {EVENTS.map((event, index) => (
          <React.Fragment key={event.title}>
            {index ? <Divider /> : null}
            <View style={styles.row}>
              <View style={styles.rowIcon}><Icon name={event.icon} size={18} color={colors.brand[600]} /></View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySm" weight="bold">{event.title}</Text>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{event.body}</Text>
              </View>
            </View>
          </React.Fragment>
        ))}
      </Card>

      <SectionTitle title="Live board refresh" />
      <Card>
        <View style={styles.refreshRow}>
          <View style={styles.refreshIcon}><Icon name="refresh" size={19} color={colors.brand[600]} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" weight="bold">Every 15 seconds</Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>The order board polls on its own while the app is open. Pull down on any screen to refresh instantly.</Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="If you are missing orders" />
      <Card style={styles.tipsCard}>
        {[
          'Keep the phone off battery saver — it can silence background alerts.',
          'Allow Aurasure to run in the background and to show notifications on the lock screen.',
          'Stay connected to Wi-Fi or mobile data; the board cannot poll while offline.',
          'Keep the outlet marked Open, otherwise new orders will not reach you.',
        ].map((tip) => (
          <View key={tip} style={styles.tip}>
            <Icon name="circleCheck" size={15} color={colors.success} />
            <Text variant="bodySm" color={colors.textSecondary} style={{ flex: 1 }}>{tip}</Text>
          </View>
        ))}
      </Card>

      <Pressable onPress={() => setCheckedAt(new Date())} style={styles.stamp}>
        <Text variant="caption" color={colors.textTertiary}>
          {Platform.OS === 'ios' ? 'iOS' : 'Android'} device · last checked {checkedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  statusIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  listCard: { paddingVertical: 2, paddingHorizontal: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 13 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  refreshRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  refreshIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  tipsCard: { gap: 12 },
  tip: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  stamp: { alignItems: 'center', marginTop: 20 },
});
