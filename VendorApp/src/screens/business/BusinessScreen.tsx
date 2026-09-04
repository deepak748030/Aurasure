import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, Card, Divider, EmptyState, SectionTitle } from '@/components/ui/VendorUI';
import { Icon } from '@/lib/icons';
import { vendorApi, type BusinessStats, type PayoutEntry } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Business'>;
const EMPTY: BusinessStats = { range: 'today', orders: 0, gross: 0, net: 0, cancelled: 0, averagePrepMins: 0, slaBreaches: 0 };
const money = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`;

export function BusinessScreen({ navigation }: Props): React.ReactElement {
  const [range, setRange] = useState('today');
  const [stats, setStats] = useState(EMPTY);
  const [entries, setEntries] = useState<PayoutEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [rating, setRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [summary, payout, ratingData] = await Promise.all([vendorApi.stats(range), vendorApi.payouts(), vendorApi.ratings()]);
      setStats(summary); setEntries(payout.entries); setBalance(payout.current); setRating(ratingData.average); setRatingCount(ratingData.ratings.length); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load business data'); }
    finally { setLoading(false); }
  }, [range]);
  useEffect(() => { void load(); }, [load]);
  return (
    <Screen title="Business" subtitle="Understand the money behind every order" headerLeft={<BackButton onPress={() => navigation.goBack()} />} onRefresh={() => void load()}>
      <View style={styles.range}>{[['today', 'Today'], ['7d', '7 days'], ['30d', '30 days']].map(([key, label]) => <Pressable key={key} onPress={() => { setRange(key || 'today'); setLoading(true); }} style={[styles.rangeItem, range === key && styles.rangeActive]}><Text variant="caption" weight="bold" color={range === key ? colors.white : colors.textSecondary}>{label}</Text></Pressable>)}</View>
      {error ? <Card tone="warm" style={styles.error}><Icon name="wifi" size={16} color={colors.warning} /><Text variant="caption" color={colors.warning} style={{ flex: 1 }}>{error}</Text></Card> : null}
      <SectionTitle title="At a glance" />
      <View style={styles.grid}><Metric label="Orders" value={String(stats.orders)} icon="orders" color={colors.brand[600]} /><Metric label="Gross sales" value={money(stats.gross)} icon="trending" color={colors.success} /><Metric label="Your net" value={money(stats.net)} icon="wallet" color={colors.info} /><Metric label="Cancelled" value={String(stats.cancelled)} icon="circleAlert" color={colors.danger} /></View>
      <Card style={styles.health}><View style={styles.healthTop}><View><Text variant="caption" weight="bold" color={colors.textSecondary}>OPERATIONS HEALTH</Text><Text variant="h3" weight="bold" style={{ marginTop: 4 }}>{stats.slaBreaches === 0 ? 'Looking steady' : 'Needs attention'}</Text></View><Icon name={stats.slaBreaches === 0 ? 'gauge' : 'circleAlert'} size={27} color={stats.slaBreaches === 0 ? colors.success : colors.warning} /></View><View style={styles.healthStats}><View><Text variant="caption" color={colors.textSecondary}>Avg prep</Text><Text variant="title" weight="bold">{stats.averagePrepMins} min</Text></View><View><Text variant="caption" color={colors.textSecondary}>SLA breaches</Text><Text variant="title" weight="bold">{stats.slaBreaches}</Text></View><View><Text variant="caption" color={colors.textSecondary}>Period</Text><Text variant="title" weight="bold">{range === 'today' ? 'Today' : range}</Text></View></View></Card>
      <SectionTitle title="Settlement wallet" action="How it works" onAction={() => Alert.alert('Settlement', 'Net is calculated from delivered orders after the platform commission.')} />
      <Card tone="warm"><Text variant="caption" color={colors.textSecondary}>AVAILABLE TO SETTLE</Text><Text variant="display" weight="extrabold" color={colors.brand[700]} style={{ marginTop: 3 }}>{money(balance)}</Text><Text variant="caption" color={colors.textSecondary} style={{ marginTop: 5 }}>Net after 5% item commission. Adjustments are shown per statement.</Text></Card>
      <SectionTitle title="Recent settlements" />
      {loading ? <Text variant="body" color={colors.textSecondary}>Fetching settlement ledger…</Text> : entries.length ? <Card style={{ paddingVertical: 2 }}>{entries.slice(0, 12).map((entry, index) => <React.Fragment key={entry.id}>{index ? <Divider /> : null}<Pressable onPress={() => void vendorApi.statement(entry.id).then((result) => Alert.alert(`Statement · ${String(result.statement.orderCode)}`, `Gross ${money(Number(result.statement.gross))}\nCommission ${money(Number(result.statement.commission))}\nNet ${money(Number(result.statement.net))}`)).catch(() => Alert.alert('Statement unavailable', 'Try again later.'))} style={styles.payout}><View style={styles.payoutIcon}><Icon name="receipt" size={17} color={colors.brand[600]} /></View><View style={{ flex: 1 }}><Text variant="title" weight="bold">Order #{entry.orderCode}</Text><Text variant="caption" color={colors.textSecondary}>{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · commission {money(entry.commission)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text variant="title" weight="bold" color={colors.success}>{money(entry.net)}</Text><Badge label={entry.status} color={colors.success} background={colors.successBg} /></View></Pressable></React.Fragment>)}</Card> : <Card><EmptyState icon="wallet" title="No settlements yet" body="Delivered order settlements will appear here." /></Card>}
      <SectionTitle title="Customer ratings" action="Learn more" onAction={() => Alert.alert('Ratings', 'Ratings and replies will appear here when customers review this outlet.')} />
      <Card><View style={styles.rating}><Text variant="display" weight="extrabold" color={ratingCount ? colors.brand[700] : colors.textTertiary}>{ratingCount ? rating.toFixed(1) : '—'}</Text><View style={{ marginLeft: 12, flex: 1 }}><Text variant="title" weight="bold">{ratingCount ? `${ratingCount} customer review${ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}</Text><Text variant="caption" color={colors.textSecondary}>{ratingCount ? 'Keep the quality consistent to grow your score.' : 'Deliver a few great orders to build your score.'}</Text></View><Icon name="star" size={25} color={ratingCount ? colors.star : colors.borderStrong} filled={Boolean(ratingCount)} /></View></Card>
      <Button title="Back to outlet" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
function Metric({ label, value, icon, color }: { label: string; value: string; icon: 'orders' | 'trending' | 'wallet' | 'circleAlert'; color: string }): React.ReactElement { return <View style={styles.metric}><Icon name={icon} size={18} color={color} /><Text variant="h3" weight="bold" style={{ marginTop: 8 }}>{value}</Text><Text variant="caption" color={colors.textSecondary}>{label}</Text></View>; }
const styles = StyleSheet.create({ range: { flexDirection: 'row', padding: 4, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, gap: 4 }, rangeItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 9 }, rangeActive: { backgroundColor: colors.brand[600] }, error: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '48.8%', minHeight: 104, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 13 }, health: { marginTop: 13, backgroundColor: colors.surfaceWarm, borderColor: '#F1DCC5' }, healthTop: { flexDirection: 'row', justifyContent: 'space-between' }, healthStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#F1DCC5', marginTop: 14, paddingTop: 12 }, payout: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 }, payoutIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }, rating: { flexDirection: 'row', alignItems: 'center', minHeight: 54 } });
