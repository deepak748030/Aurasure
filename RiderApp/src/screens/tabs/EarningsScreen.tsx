import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { riderApi, type EarningsData, type PayoutsData } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const RANGES = ['today', 'week', 'all'] as const;

export function EarningsScreen(): React.ReactElement {
  const { rider, refresh } = useRider();
  const focused = useIsFocused();
  const [range, setRange] = useState<(typeof RANGES)[number]>('today');
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payouts, setPayouts] = useState<PayoutsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'hub' | 'bank'>('upi');
  const [refId, setRefId] = useState('');
  const [error, setError] = useState('');

  const pull = useCallback(async () => {
    setBusy(true);
    try {
      const [earn, pay] = await Promise.all([riderApi.earnings(range), riderApi.payouts()]);
      setEarnings(earn);
      setPayouts(pay);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load earnings');
    } finally {
      setBusy(false);
    }
  }, [range]);

  useEffect(() => {
    if (!focused) return;
    void pull();
  }, [focused, pull]);

  const deposit = async () => {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await riderApi.codDeposit(value, method, refId);
      haptic.success();
      setAmount('');
      setRefId('');
      await refresh();
      await pull();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setBusy(false);
    }
  };

  const history = payouts?.history ?? [];
  const deposits = payouts?.deposits ?? [];

  return (
    <Screen title="Earnings" subtitle={`Balance ₹${Math.round(payouts?.balance ?? rider?.payoutBalance ?? 0)}`} refreshing={busy} onRefresh={() => void pull()}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {RANGES.map((r) => {
          const on = range === r;
          return (
            <Pressable
              key={r}
              onPress={() => {
                haptic.selection();
                setRange(r);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: on ? colors.brand[600] : colors.surface,
                borderWidth: 1,
                borderColor: on ? colors.brand[600] : colors.border,
                alignItems: 'center',
              }}
            >
              <Text variant="caption" weight="semibold" color={on ? colors.white : colors.text}>
                {r.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title">Trip earnings</Text>
          <Text variant="h2" color={colors.success}>
            {formatINR(earnings?.total ?? 0)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Trips', value: `${earnings?.trips ?? 0}` },
            { label: 'Payout', value: formatINR(earnings?.payout ?? 0) },
            { label: 'COD', value: formatINR(earnings?.codCollected ?? 0) },
            { label: 'Bonus', value: formatINR(earnings?.incentives ?? 0) },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1 }}>
              <Text variant="h3">{s.value}</Text>
              <Text variant="caption" color={colors.textTertiary}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {(earnings?.incentiveRows ?? []).length ? (
        <View style={{ backgroundColor: colors.warningBg, borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <Text variant="title">Incentives earned</Text>
          {earnings?.incentiveRows.map((row) => (
            <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text variant="bodySm">{row.title}</Text>
              <Text variant="bodySm" color={colors.warning} weight="bold">+{formatINR(row.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text>
      ) : null}

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <Text variant="title" style={{ marginBottom: 10 }}>Deposit COD in hand</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 8 }}>
          Available ₹{Math.round(rider?.codInHand ?? 0)} · max limit ₹{Math.round(rider?.maxCodLimit ?? 3000)}
        </Text>
        <Input label="Amount" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" leftIcon="rupee" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['upi', 'hub', 'bank'] as const).map((m) => {
            const on = method === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  haptic.selection();
                  setMethod(m);
                }}
                style={{ flex: 1, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? colors.brand[600] : colors.surfaceAlt, borderWidth: 1, borderColor: on ? colors.brand[600] : colors.border, alignItems: 'center' }}
              >
                <Text variant="caption" weight="semibold" color={on ? colors.white : colors.text}>{m.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
        <Input label="Reference (optional)" value={refId} onChangeText={setRefId} />
        <Button title="Deposit" variant="secondary" size="md" loading={busy} onPress={() => void deposit()} />
      </View>

      <Text variant="h3" style={{ marginBottom: 10 }}>Recent payouts</Text>
      {history.length === 0 ? (
        <EmptyState icon="wallet" title="No completed trips yet" subtitle="Delivered trips and their payout will appear here." />
      ) : (
        <View style={{ gap: 8 }}>
          {history.slice(0, 20).map((h) => (
            <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <View>
                <Text variant="title">{h.orderCode}</Text>
                <Text variant="caption" color={colors.textTertiary}>{new Date(h.deliveredAt).toLocaleString('en-IN')}</Text>
              </View>
              <Text variant="title" color={colors.success}>+{formatINR(h.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {deposits.length ? (
        <>
          <Text variant="h3" style={{ marginTop: 16, marginBottom: 10 }}>Deposit history</Text>
          <View style={{ gap: 8 }}>
            {deposits.slice(0, 10).map((d) => (
              <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                <Text variant="bodySm">{d.method.toUpperCase()} · {d.status}</Text>
                <Text variant="bodySm" weight="bold">₹{Math.round(d.amount)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
