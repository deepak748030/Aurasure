import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useVendor } from '@/context/VendorContext';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';

export function MoreScreen(): React.ReactElement {
  const { vendor, logout } = useVendor();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  const send = async () => {
    try {
      await vendorApi.issue(title, body);
      setTitle('');
      setBody('');
      setMsg('Ticket sent to admin.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <Screen title="More" subtitle={vendor?.phone}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
        }}
      >
        <Text variant="caption" color={colors.textSecondary}>
          SETTLEMENT WALLET
        </Text>
        <Text variant="h1">₹{Math.round(vendor?.payoutBalance ?? 0)}</Text>
        <Text variant="bodySm" color={colors.textSecondary}>
          Credited when an order is marked delivered. Platform keeps 5% of item total (not delivery fee).
        </Text>
      </View>

      <Text variant="h3" style={{ marginBottom: 8 }}>
        Raise an issue
      </Text>
      <Input label="What's broken?" value={title} onChangeText={setTitle} placeholder="Payout, rider, wrong menu…" />
      <Input label="Details" value={body} onChangeText={setBody} multiline />
      {msg ? (
        <Text variant="caption" color={colors.success} style={{ marginBottom: 8 }}>
          {msg}
        </Text>
      ) : null}
      <Button title="Send to admin" onPress={() => void send()} />
      <Button title="Sign out" variant="ghost" onPress={logout} />
    </Screen>
  );
}
