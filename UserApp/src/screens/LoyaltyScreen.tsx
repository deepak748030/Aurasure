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
import { MIN_REDEEM_POINTS, POINTS_PER_RUPEE, fetchLoyalty, redeemLoyalty, type LoyaltyState } from '@/api/rewards';
import { ApiError } from '@/api/client';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money, relative, tierFor } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

/** Loyalty: 5 points per ₹100, 100 points = ₹10, redeem in hundreds. */
export function LoyaltyScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser } = useSession();
  const [busy, setBusy] = useState(false);

  const query = useQuery<LoyaltyState>(useCallback(() => fetchLoyalty(), [user?.loyaltyPoints]), { enabled: isLoggedIn });
  const points = query.data?.points ?? user?.loyaltyPoints ?? 0;
  const tier = tierFor(points);
  const activity = query.data?.activity ?? [];
  const nextTier = TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(tier.name as never) + 1)];
  const toNext = nextTier === tier.name ? 0 : Math.max(0, nextTier === 'Silver' ? 1000 : nextTier === 'Gold' ? 2500 : 5000) - points;
  const redeemable = Math.floor(points / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS;

  const redeem = async (): Promise<void> => {
    if (redeemable < MIN_REDEEM_POINTS) {
      sheet.warning('Not enough points', `You need at least ${MIN_REDEEM_POINTS} points to redeem ${money(MIN_REDEEM_POINTS / POINTS_PER_RUPEE)}.`);
      return;
    }
    const value = await sheet.pick({
      title: 'Redeem points',
      subtitle: `${redeemable} points available · ${money(redeemable / POINTS_PER_RUPEE)} value`,
      options: [
        { label: `Redeem all (${money(redeemable / POINTS_PER_RUPEE)})`, value: String(redeemable), description: 'Converted to wallet cash', icon: 'loyalty' },
        ...[100, 200, 500].filter((amount) => amount <= redeemable).map((amount) => ({ label: `Redeem ${amount} points`, value: String(amount), description: `${money(amount / POINTS_PER_RUPEE)} to wallet`, icon: 'gift' as const })),
      ],
    });
    if (!value) return;
    const ok = await sheet.confirm({
      title: 'Redeem now?',
      message: `${value} points become ${money(Number(value) / POINTS_PER_RUPEE)} in your wallet.`,
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
          <Button title={busy ? 'Redeeming…' : redeemable >= MIN_REDEEM_POINTS ? `Redeem ${money(redeemable / POINTS_PER_RUPEE)}` : 'Not enough points yet'} icon="gift" size="lg" loading={busy} onPress={() => void redeem()} style={{ alignSelf: 'stretch' }} />
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
                points · worth {money(Math.floor(points / POINTS_PER_RUPEE / 10) * 10)}
              </Text>
            </View>
            <Tag label={tier.name} tone="warning" icon="star" />
          </View>

          <View style={{ marginTop: spacing.md, gap: 6 }}>
            <Progress value={tier.progress} tone={tier.color} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="micro" tone="muted" style={{ flex: 1 }}>
                {toNext > 0 ? `${toNext} points to ${nextTier}` : 'Top tier — you are all the way up'}
              </Text>
              <Text variant="micro" weight="bold" color={c.primary}>
                {Math.round(tier.progress * 100)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tierRow}>
          {TIERS.map((name) => {
            const on = name === tier.name;
            const need = name === 'Bronze' ? 0 : name === 'Silver' ? 1000 : name === 'Gold' ? 2500 : 5000;
            return (
              <Pressable key={name} accessibilityRole="button" onPress={() => sheet.info(`${name} tier`, `${money(need)} lifetime spend or more. Points never expire while your account is active.`)} style={({ pressed }) => [styles.tierChip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primaryFaint : c.surface, opacity: pressed ? 0.92 : 1 }]}>
                <Text variant="micro" weight="bold" color={on ? c.primary : c.textSecondary}>
                  {name}
                </Text>
                <Text variant="micro" tone="faint">
                  {need === 0 ? 'start' : money(need)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceHi, gap: 4 }}>
          <Text variant="overline" tone="faint">
            HOW IT WORKS
          </Text>
          <MetaRow label="Earn rate" value="5 points per ₹100" />
          <MetaRow label="Redeem rate" value="100 points = ₹10" />
          <MetaRow label="Redeem step" value="Multiples of 100" />
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
                      <Text variant="subtitle" weight="bold" color={row.type === 'earned' ? c.success : row.type === 'redeemed' ? c.text : c.warning}>
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
