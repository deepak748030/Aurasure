import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchWallet, topUpWallet, type WalletState } from '@/api/rewards';
import { ApiError } from '@/api/client';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money, relative } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

const PRESETS = [100, 250, 500, 1000];

/**
 * Wallet: balance card, add-money sheet (the server just credits the ledger —
 * there is no gateway on this build, which the UI states honestly), and the
 * full credit/debit history from `GET /users/me/wallet`.
 */
export function WalletScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser } = useSession();
  const [busy, setBusy] = useState(false);

  const query = useQuery<WalletState>(useCallback(() => fetchWallet(), [user?.wallet]), { enabled: isLoggedIn });
  const state = query.data;
  const balance = state?.balance ?? user?.wallet ?? 0;
  const transactions = state?.transactions ?? [];

  const addMoney = async (): Promise<void> => {
    if (!isLoggedIn) {
      sheet.show({ title: 'Sign in first', message: 'The wallet belongs to your Aurasure account.', icon: 'user', tone: 'info', dismissLabel: 'Later', actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }] });
      return;
    }
    const value = await sheet.pick({
      title: 'Add money to wallet',
      subtitle: 'This demo build credits the wallet directly — no payment gateway is charged',
      options: PRESETS.map((amount) => ({ label: `Add ${money(amount)}`, value: String(amount), description: 'Credited instantly', icon: 'wallet' as IconName })),
    });
    if (!value) return;
    setBusy(true);
    try {
      const result = await topUpWallet(Number(value));
      await refreshUser();
      query.setData(result);
      haptic.success();
      sheet.success(`${money(Number(value))} added`, `Wallet balance is ${money(result.balance)}.`);
    } catch (error) {
      sheet.error('Could not add money', error instanceof ApiError ? error.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const spend = (title: string, amount: number): React.ReactElement => (
    <MetaRow key={title} label={title} value={`-${money(amount)}`} />
  );

  return (
    <Screen
      title="Wallet"
      subtitle={transactions.length > 0 ? `${transactions.length} entries` : 'No transactions yet'}
      back
      onRefresh={query.refresh}
      refreshing={query.refreshing}
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm }}>
          <Button title={busy ? 'Adding…' : 'Add money'} size="lg" icon="plus" loading={busy} onPress={() => void addMoney()} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={[styles.card, { backgroundColor: c.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="wallet" size={18} color="rgba(255,255,255,0.9)" />
            <Text variant="overline" color="rgba(255,255,255,0.85)">
              AVAILABLE BALANCE
            </Text>
          </View>
          <Text variant="display" weight="bold" color={c.white}>
            {money(balance)}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            {isLoggedIn ? 'Use it at checkout — refunds land back here' : 'Sign in to see your wallet'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Tag label="No fees" tone="muted" />
            <Tag label="Instant refunds on cancel" tone="muted" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {PRESETS.map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              onPress={() => {
                void (async () => {
                  navigation.setOptions({ title: 'Wallet' });
                  await addMoneyFor(amount);
                })().catch(() => undefined);
              }}
              style={({ pressed }) => [styles.preset, { borderColor: c.border, backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
            >
              <Text variant="subtitle" weight="semibold">
                {money(amount)}
              </Text>
              <Text variant="micro" tone="muted">
                quick add
              </Text>
            </Pressable>
          ))}
        </View>

        {query.loading ? (
          <SkeletonList rows={5} thumb={34} />
        ) : (
          <ListSection title={`HISTORY · ${transactions.length}`}>
            {transactions.length === 0 ? (
              <View style={{ padding: spacing.md }}>
                <Text variant="bodySm" tone="muted">
                  Nothing yet. Wallet orders, refunds and top-ups all show up here.
                </Text>
              </View>
            ) : (
              transactions.map((tx, index) => (
                <ListRow
                  key={tx.id}
                  title={tx.title}
                  subtitle={tx.note}
                  meta={relative(tx.createdAt)}
                  icon={tx.type === 'credit' ? 'arrowDown' : 'arrowUpRight'}
                  iconTone={tx.type === 'credit' ? 'success' : 'muted'}
                  badge={tx.type === 'credit' ? 'IN' : 'OUT'}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text variant="subtitle" weight="semibold" color={tx.type === 'credit' ? c.success : c.text}>
                        {tx.type === 'credit' ? '+' : '-'}
                        {money(tx.amount)}
                      </Text>
                      <Text variant="micro" tone="faint">
                        {money(tx.balanceAfter)} left
                      </Text>
                    </View>
                  }
                  last={index === transactions.length - 1}
                />
              ))
            )}
          </ListSection>
        )}

        {transactions.length > 0 ? (
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              THIS MONTH
            </Text>
            {transactions
              .filter((tx) => tx.type === 'debit')
              .slice(0, 4)
              .map((tx) => spend(`${tx.title} · ${relative(tx.createdAt)}`, tx.amount))}
          </View>
        ) : null}
      </View>
    </Screen>
  );

  async function addMoneyFor(amount: number): Promise<void> {
    if (!isLoggedIn) {
      sheet.info('Sign in first', 'The wallet belongs to your Aurasure account.');
      return;
    }
    setBusy(true);
    try {
      const result = await topUpWallet(amount);
      await refreshUser();
      query.setData(result);
      haptic.success();
      sheet.success(`${money(amount)} added`, `Wallet balance is ${money(result.balance)}.`);
    } catch (error) {
      sheet.error('Could not add money', error instanceof ApiError ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.xl, gap: 4, marginTop: spacing.sm },
  preset: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, gap: 2 },
});
