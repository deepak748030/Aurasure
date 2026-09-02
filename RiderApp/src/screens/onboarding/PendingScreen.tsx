import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';

export function PendingScreen(): React.ReactElement {
  const { rider, refresh, logout } = useRider();
  const status = rider?.status ?? 'submitted';
  const copy: Record<string, string> = {
    submitted: 'Our team is checking your Aadhaar, DL, PAN, RC and photo. You cannot go online yet.',
    under_review: 'A reviewer has opened your file. Keep the app handy — they may request a sharper shot.',
    rejected: 'Something did not match. Read the note, fix that document, and submit again.',
    needs_info: 'One document is unclear. Replace it and submit again — you do not restart the whole form.',
    suspended: 'Your partner account is paused by admin. Raise a ticket from Profile or wait for a call.',
  };

  return (
    <Screen title="Verification" subtitle={rider?.name || rider?.phone} onRefresh={() => void refresh()}>
      <Animated.View
        entering={FadeIn}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 22,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        }}
      >
        <Icon name="shield" size={42} color={colors.brand[600]} />
        <Text variant="h2" style={{ marginTop: 12, textAlign: 'center', textTransform: 'capitalize' }}>
          {status.replace('_', ' ')}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8, textAlign: 'center' }}>
          {copy[status] ?? copy.submitted}
        </Text>
        {rider?.reviewNote ? (
          <Text variant="bodySm" color={colors.warning} style={{ marginTop: 12, textAlign: 'center' }}>
            Admin: {rider.reviewNote}
          </Text>
        ) : null}
      </Animated.View>

      <View style={{ marginTop: 16 }}>
        {(rider?.documents ?? []).map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
            <Text variant="bodySm" style={{ flex: 1, paddingRight: 8 }}>
              {d.label}
            </Text>
            <Text variant="caption" color={d.verified ? colors.success : d.uri ? colors.warning : colors.danger}>
              {d.verified ? 'Verified' : d.uri ? 'In review' : 'Missing'}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 20, gap: 10 }}>
        <Button title="Refresh status" variant="secondary" onPress={() => void refresh()} />
        <Button title="Sign out" variant="ghost" onPress={logout} />
      </View>
    </Screen>
  );
}
