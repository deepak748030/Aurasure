import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { riderApi, type EarningsData, type PayoutsData } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';

type Range = 'today' | 'week' | 'all';

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'all',   label: 'All Time' },
];

export function EarningsScreen(): React.ReactElement {
  const { rider, refresh: refreshRider } = useRider();
  const [range, setRange] = useState<Range>('today');
  const [earningData, setEarningData] = useState<EarningsData | null>(null);
  const [payoutData, setPayoutData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // COD deposit
  const [depositAmt, setDepositAmt] = useState('');
  const [depositMethod, setDepositMethod] = useState<'upi' | 'hub' | 'bank'>('upi');
  const [depositRefId, setDepositRefId] = useState('');
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMsg, setDepositMsg] = useState('');
  const [depositErr, setDepositErr] = useState('');

  const load = useCallback(async (r: Range = range, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [e, p] = await Promise.all([riderApi.earnings(r), riderApi.payouts()]);
      setEarningData(e);
      setPayoutData(p);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { void load(range); }, [range]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load(range, true);
    void refreshRider();
  };

  const deposit = async () => {
    const amt = parseFloat(depositAmt);
    if (!depositAmt || isNaN(amt) || amt <= 0) {
      setDepositErr('Enter a valid amount'); return;
    }
    setDepositBusy(true);
    setDepositErr('');
    setDepositMsg('');
    try {
      await riderApi.codDeposit(amt, depositMethod, depositRefId.trim() || undefined);
      haptic.success();
      setDepositMsg('Deposit submitted successfully.');
      setDepositAmt('');
      setDepositRefId('');
      await load(range, true);
      await refreshRider();
    } catch (e) {
      haptic.error();
      setDepositErr(e instanceof Error ? e.message : 'Deposit failed');
    } finally {
      setDepositBusy(false);
    }
  };

  const incentiveRows = earningData?.incentiveRows ?? [];
  const tasks = earningData?.tasks ?? [];

  return (
    <Screen
      title="Earnings"
      subtitle="Trips, payouts & COD deposits"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* ── Range tabs ── */}
      <View style={styles.rangeBar}>
        {RANGES.map((r) => {
          const active = range === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => { haptic.selection(); setRange(r.key); }}
              style={[styles.rangeTab, active && { backgroundColor: colors.brand[600] }]}
            >
              <Text variant="subtitle" weight={active ? 'bold' : 'medium'} color={active ? '#fff' : colors.textSecondary}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <>
          {/* ── Earnings summary ── */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Icon name="bike" size={18} color={colors.brand[600]} />
              <Text variant="h2" weight="bold" style={{ marginTop: 6 }}>{earningData?.trips ?? 0}</Text>
              <Text variant="caption" color={colors.textSecondary}>Trips</Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="rupee" size={18} color={colors.success} />
              <Text variant="h2" weight="bold" style={{ marginTop: 6 }}>{formatINR(earningData?.payout ?? 0)}</Text>
              <Text variant="caption" color={colors.textSecondary}>Delivery pay</Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="zap" size={18} color="#F59E0B" />
              <Text variant="h2" weight="bold" style={{ marginTop: 6 }}>{formatINR(earningData?.incentives ?? 0)}</Text>
              <Text variant="caption" color={colors.textSecondary}>Incentives</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: colors.brand[200], backgroundColor: colors.brand[50] }]}>
              <Icon name="wallet" size={18} color={colors.brand[600]} />
              <Text variant="h2" weight="bold" style={{ marginTop: 6, color: colors.brand[700] }}>{formatINR(earningData?.total ?? 0)}</Text>
              <Text variant="caption" color={colors.brand[600]}>Total</Text>
            </View>
          </View>

          {/* ── Incentives section ── */}
          {incentiveRows.length > 0 ? (
            <View style={styles.section}>
              <Text variant="h3" weight="bold" style={{ marginBottom: 10 }}>🎯 Incentives earned</Text>
              {incentiveRows.map((row) => (
                <View key={row.id} style={styles.incentiveRow}>
                  <Icon name="circleCheck" size={16} color={colors.success} />
                  <Text variant="body" style={{ flex: 1, marginLeft: 10 }}>{row.title}</Text>
                  <Text variant="title" weight="bold" color={colors.success}>+{formatINR(row.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Balance & COD ── */}
          <View style={styles.balanceCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text variant="caption" color={colors.textSecondary} weight="semibold">PAYOUT BALANCE</Text>
                <Text variant="h2" weight="bold" color={colors.brand[700]}>{formatINR(payoutData?.balance ?? rider?.payoutBalance ?? 0)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color={colors.textSecondary} weight="semibold">COD IN HAND</Text>
                <Text variant="h2" weight="bold" color={colors.warning}>{formatINR(payoutData?.codInHand ?? rider?.codInHand ?? 0)}</Text>
              </View>
            </View>
            <View style={styles.balanceDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color={colors.textSecondary}>
                Lifetime trips: {payoutData?.totalTrips ?? rider?.totalTrips ?? 0}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                Lifetime: {formatINR(payoutData?.totalEarnings ?? rider?.totalEarnings ?? 0)}
              </Text>
            </View>
          </View>

          {/* ── COD Deposit ── */}
          {(rider?.codInHand ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text variant="h3" weight="bold" style={{ marginBottom: 10 }}>💵 Deposit COD</Text>
              <Input
                label="Amount ₹"
                value={depositAmt}
                onChangeText={setDepositAmt}
                keyboardType="decimal-pad"
                leftIcon="rupee"
                placeholder="0"
              />
              <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 8 }}>Method</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {(['upi', 'hub', 'bank'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { haptic.selection(); setDepositMethod(m); }}
                    style={[styles.methodChip, depositMethod === m && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] }]}
                  >
                    <Text variant="caption" weight="bold" color={depositMethod === m ? '#fff' : colors.textSecondary}>
                      {m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Input
                label="Reference (optional)"
                value={depositRefId}
                onChangeText={setDepositRefId}
                placeholder="UTR / transaction ID"
              />
              {depositMsg ? <Text variant="caption" color={colors.success} style={{ marginBottom: 8 }}>{depositMsg}</Text> : null}
              {depositErr ? <Text variant="caption" color={colors.danger} style={{ marginBottom: 8 }}>{depositErr}</Text> : null}
              <Button title="Submit deposit" loading={depositBusy} onPress={() => void deposit()} />
            </View>
          ) : null}

          {/* ── Deposit history ── */}
          {(payoutData?.deposits ?? []).length > 0 ? (
            <View style={styles.section}>
              <Text variant="h3" weight="bold" style={{ marginBottom: 10 }}>Deposit history</Text>
              {(payoutData?.deposits ?? []).slice(0, 10).map((d) => (
                <View key={d.id} style={styles.historyRow}>
                  <View>
                    <Text variant="title" weight="semibold">{d.method.toUpperCase()}</Text>
                    <Text variant="caption" color={colors.textTertiary}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="title" weight="bold">₹{Math.round(d.amount)}</Text>
                    <Text
                      variant="caption"
                      color={d.status === 'confirmed' ? colors.success : d.status === 'failed' ? colors.danger : colors.warning}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {d.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Recent trips ── */}
          <View style={{ marginTop: 4 }}>
            <Text variant="h3" weight="bold" style={{ marginBottom: 10 }}>
              Recent trips {range === 'today' ? '(today)' : range === 'week' ? '(this week)' : ''}
            </Text>
            {tasks.length === 0 ? (
              <EmptyState icon="bike" title="No trips yet" subtitle="Delivered trips show here once complete." />
            ) : (
              <View style={{ gap: 8 }}>
                {tasks.slice(0, 20).map((t) => (
                  <View key={t.id} style={styles.tripRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="title" weight="semibold">{t.orderCode}</Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {t.vendorName} → {t.drop.name}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>
                        {t.deliveredAt ? new Date(t.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="title" weight="bold" color={colors.success}>+{formatINR(t.riderPayout)}</Text>
                      {t.codAmount > 0 ? (
                        <Text variant="caption" color={colors.warning}>COD {formatINR(t.codAmount)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  rangeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  incentiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  methodChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
