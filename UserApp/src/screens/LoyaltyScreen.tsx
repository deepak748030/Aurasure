import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { Progress, Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchLoyalty, loyaltyRules, redeemLoyalty, type LoyaltyState } from '@/api/rewards';
import { ApiError } from '@/api/client';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money, relative, tierFor } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

/** Loyalty rules (earn/redeem/tiers) come from the server payload. */
export function LoyaltyScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser } = useSession();
  const [busy, setBusy] = useState(false);

  const query = useQuery<LoyaltyState>(useCallback(() => fetchLoyalty(), [user?.loyaltyPoints]), { enabled: isLoggedIn });
  const points = query.data?.points ?? user?.loyaltyPoints ?? 0;
  const rules = loyaltyRules(query.data);
  const step = rules.redeemPoints;
  const rupeesFor = (pts: number): number => Math.floor(pts / step) * rules.redeemValue;
  const tier = tierFor(points, rules.tiers);
  const activity = query.data?.activity ?? [];
  const toNext = tier.nextAt === null ? 0 : Math.max(0, tier.nextAt - points);
  const redeemable = Math.floor(points / step) * step;

  const redeem = async (): Promise<void> => {
    if (redeemable < step) {
      sheet.warning('Not enough points', `You need at least ${step} points to redeem ${money(rules.redeemValue)}.`);
      return;
    }
    const quickSteps = [step, step * 2, step * 5].filter((amount) => amount <= redeemable && amount < redeemable);
    const value = await sheet.pick({
      title: 'Redeem points',
      subtitle: `${redeemable} points available · ${money(rupeesFor(redeemable))} value`,
      options: [
        { label: `Redeem all (${money(rupeesFor(redeemable))})`, value: String(redeemable), description: 'Converted to wallet cash', icon: 'loyalty' },
        ...quickSteps.map((amount) => ({ label: `Redeem ${amount} points`, value: String(amount), description: `${money(rupeesFor(amount))} to wallet`, icon: 'gift' as const })),
      ],
    });
    if (!value) return;
    const ok = await sheet.confirm({
      title: 'Redeem now?',
      message: `${value} points become ${money(rupeesFor(Number(value)))} in your wallet.`,
      confirmLabel: 'Redeem',
      icon: 'loyalty',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await redeemLoyalty(Number(value));
      await refreshUser();
      query.refresh();
      haptic.success();
      sheet.success(`${money(result.redeemed)} added to wallet`, `You have ${result.points} points left.`);
    } catch (error) {
      sheet.error('Could not redeem', error instanceof ApiError ? error.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Loyalty"
      subtitle={`${points} points · ${tier.name}`}
      back
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm, gap: 6 }}>
          <Button title={busy ? 'Redeeming…' : redeemable >= step ? `Redeem ${money(rupeesFor(redeemable))}` : 'Not enough points yet'} icon="gift" size="lg" loading={busy} onPress={() => void redeem()} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.plate, { backgroundColor: c.primarySoft }]}>
              <Icon name="loyalty" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h2" weight="bold">
                {points}
              </Text>
              <Text variant="caption" tone="muted">
                points · worth {money(rupeesFor(points))}
              </Text>
            </View>
            <Tag label={tier.name} tone="warning" icon="star" />
          </View>

          <View style={{ marginTop: spacing.md, gap: 6 }}>
            <Progress value={tier.progress} tone={tier.color} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="micro" tone="muted" style={{ flex: 1 }}>
                {toNext > 0 ? `${toNext} points to ${tier.nextTier}` : 'Top tier — you are all the way up'}
              </Text>
              <Text variant="micro" weight="semibold" color={c.primary}>
                {Math.round(tier.progress * 100)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tierRow}>
          {rules.tiers.map((band) => {
            const on = band.name === tier.name;
            return (
              <Pressable key={band.name} accessibilityRole="button" onPress={() => sheet.info(`${band.name} tier`, `${band.min} lifetime points or more. Points never expire while your account is active.`)} style={({ pressed }) => [styles.tierChip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primaryFaint : c.surface, opacity: pressed ? 0.92 : 1 }]}>
                <Text variant="micro" weight="semibold" color={on ? c.primary : c.textSecondary}>
                  {band.name}
                </Text>
                <Text variant="micro" tone="faint">
                  {band.min === 0 ? 'start' : `${band.min} pts`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceHi, gap: 4 }}>
          <Text variant="overline" tone="faint">
            HOW IT WORKS
          </Text>
          <MetaRow label="Earn rate" value={`${rules.earnPer100} points per ₹100`} />
          <MetaRow label="Redeem rate" value={`${step} points = ${money(rules.redeemValue)}`} />
          <MetaRow label="Redeem step" value={`Multiples of ${step}`} />
          <MetaRow label="On cancellation" value="Points reversed" tone="danger" />
        </View>

        {query.loading ? (
          <SkeletonList rows={4} thumb={34} />
        ) : (
          <ListSection title={`ACTIVITY · ${activity.length}`}>
            {activity.length === 0 ? (
              <View style={{ padding: spacing.md }}>
                <Text variant="bodySm" tone="muted">
                  No points movement yet. Your first delivered order starts the meter.
                </Text>
              </View>
            ) : (
              activity.map((row, index) => (
                <ListRow
                  key={row.id}
                  title={row.title}
                  subtitle={row.note}
                  meta={relative(row.createdAt)}
                  icon={row.type === 'earned' ? 'arrowDown' : row.type === 'redeemed' ? 'gift' : 'refresh'}
                  iconTone={row.type === 'earned' ? 'success' : row.type === 'redeemed' ? 'primary' : 'warning'}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text variant="subtitle" weight="semibold" color={row.type === 'earned' ? c.success : row.type === 'redeemed' ? c.text : c.warning}>
                        {row.type === 'earned' ? '+' : '-'}
                        {Math.abs(row.points)} pts
                      </Text>
                      <Text variant="micro" tone="faint">
                        {row.balanceAfter} balance
                      </Text>
                    </View>
                  }
                  last={index === activity.length - 1}
                />
              ))
            )}
          </ListSection>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.sm },
  plate: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tierRow: { flexDirection: 'row', gap: 6 },
  tierChip: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
});
