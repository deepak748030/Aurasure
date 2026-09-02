import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';

export function PendingScreen(): React.ReactElement {
  const { vendor, refresh, logout } = useVendor();
  const status = vendor?.status ?? 'submitted';
  const copy: Record<string, string> = {
    submitted: 'Our team is checking every photo against PAN, GST/FSSAI and the bank proof. You cannot take orders yet.',
    under_review: 'A reviewer has opened your file. Keep the app handy — they may request a sharper shot.',
    rejected: 'Something did not match. Read the note, fix that slot in onboarding, and submit again.',
    needs_info: 'One document is unclear. Replace it and submit again — you do not restart the whole form.',
    suspended: 'This outlet is paused by admin. Raise a ticket from More after you are live, or wait for a call.',
  };

  return (
    <Screen title="Verification" subtitle={vendor?.outletName || vendor?.phone} onRefresh={() => void refresh()}>
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
        {vendor?.reviewNote ? (
          <Text variant="bodySm" color={colors.warning} style={{ marginTop: 12, textAlign: 'center' }}>
            Admin: {vendor.reviewNote}
          </Text>
        ) : null}
      </Animated.View>
      <View style={{ marginTop: 16 }}>
        {(vendor?.documents ?? []).map((d) => (
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
