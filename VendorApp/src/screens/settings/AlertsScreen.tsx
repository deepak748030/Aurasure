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
  const { token, permission, requestPermission } = usePush();
  const [checkedAt, setCheckedAt] = useState<Date>(new Date());
  const [asking, setAsking] = useState(false);
  useEffect(() => { setCheckedAt(new Date()); }, [token, permission]);

  // `unsupported` means Expo Go / simulator / web — the vendor cannot act on
  // it, so we never show them an alarming "action needed" card for it.
  const ready = permission === 'granted' || Boolean(token);
  const actionable = permission === 'denied' || permission === 'blocked';

  const ask = async (): Promise<void> => {
    setAsking(true);
    try {
      const state = await requestPermission();
      if (state === 'blocked') await Linking.openSettings();
    } finally {
      setAsking(false);
      setCheckedAt(new Date());
    }
  };

  return (
    <Screen title="Order alerts" subtitle="How this phone tells you an order arrived" headerLeft={<BackButton onPress={() => navigation.goBack()} />} onRefresh={() => setCheckedAt(new Date())}>
      <Card tone={actionable ? 'warm' : 'plain'} style={styles.status}>
        <View style={[styles.statusIcon, { backgroundColor: ready ? colors.successBg : actionable ? colors.warningBg : colors.surfaceAlt }]}>
          <Icon name={ready ? 'bell' : actionable ? 'circleAlert' : 'info'} size={22} color={ready ? colors.success : actionable ? colors.warning : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.statusTop}>
            <Text variant="title" weight="bold">
              {ready ? 'Push alerts are on' : actionable ? 'Turn on push alerts' : 'Push alerts unavailable here'}
            </Text>
            {ready ? <Badge label="LIVE" color={colors.success} background={colors.successBg} /> : null}
          </View>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 6 }}>
            {ready
              ? 'This device is registered with Aurasure. New orders will ring even when the app is in the background.'
              : permission === 'blocked'
                ? 'Notifications are switched off for Aurasure in your phone settings. Turn them back on so new orders ring.'
                : actionable
                  ? 'Allow notifications so a new order rings this phone even when the app is closed.'
                  : 'This build cannot receive push (Expo Go, an emulator or the web preview). The order board still refreshes every 15 seconds.'}
          </Text>
          {actionable ? (
            <Button
              title={permission === 'blocked' ? 'Open notification settings' : 'Allow notifications'}
              variant="secondary"
              loading={asking}
              style={{ marginTop: 12 }}
              onPress={() => void ask()}
            />
          ) : null}
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
