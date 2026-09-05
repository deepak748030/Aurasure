import React, { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@/hooks/useQuery';
import { applyReferral, fetchReferral, type ReferralState } from '@/api/rewards';
import { ApiError } from '@/api/client';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

/** Refer & earn: your code, earnings, and applying someone else's code. */
export function ReferEarnScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useQuery<ReferralState>(useCallback(() => fetchReferral(), [user?.referralCode]), { enabled: isLoggedIn });
  const mine = query.data?.code ?? user?.referralCode ?? '';
  const earnings = query.data?.earnings ?? 0;
  const friends = query.data?.friends ?? 0;
  const referredBy = query.data?.referredBy ?? user?.referredBy ?? null;

  const copy = async (): Promise<void> => {
    if (!mine) return;
    await Clipboard.setStringAsync(mine);
    haptic.success();
    sheet.success('Code copied', `${mine} — send it to a friend and they get ${money(50)} on their first order.`);
  };

  const share = async (): Promise<void> => {
    if (!mine) return;
    try {
      await Share.share({
        message: `Order with my Aurasure code ${mine} and get ${money(50)} off your first order. ${BRAND_URL}`,
      });
    } catch {
      sheet.info('Sharing unavailable', 'Copy the code instead and paste it anywhere.');
    }
  };

  const apply = async (): Promise<void> => {
    const value = code.trim().toUpperCase();
    if (value.length < 4) {
      sheet.warning('Enter a code', 'A referral code looks like ASH1234.');
      return;
    }
    setBusy(true);
    try {
      const result = await applyReferral(value);
      await refreshUser();
      query.refresh();
      setCode('');
      haptic.success();
      sheet.success(`${money(result.reward)} added`, `Wallet ${money(result.wallet)} · ${result.points} loyalty points. Your friend gets the same when they order.`);
    } catch (error) {
      sheet.error('Code not applied', error instanceof ApiError ? error.message : 'Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Refer & earn" subtitle={mine ? `Your code ${mine}` : 'Sign in to get a code'} back onRefresh={query.refresh} refreshing={query.refreshing}>
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={[styles.card, { backgroundColor: c.primary }]}>
          <Text variant="overline" color="rgba(255,255,255,0.85)">
            YOUR REFERRAL CODE
          </Text>
          <Text variant="display" weight="bold" color={c.white}>
            {mine || '—— · ——'}
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            {friends} friend{friends === 1 ? '' : 's'} joined · {money(earnings)} earned
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
            <Button title="Copy code" variant="light" icon="copy" onPress={() => void copy()} disabled={!mine} />
            <Button title="Share" variant="ghost" icon="share" iconRight="arrowUpRight" onPress={() => void share()} disabled={!mine} style={{ borderColor: 'rgba(255,255,255,0.5)', }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Tag label="₹50 for them" icon="gift" tone="success" />
          <Tag label="₹50 for you after their first order" icon="referral" tone="muted" />
          <Tag label="No limit" icon="percent" tone="muted" />
        </View>

        {query.loading ? (
          <SkeletonList rows={2} thumb={30} />
        ) : (
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              YOUR REWARDS
            </Text>
            <MetaRow label="Referrals so far" value={String(friends)} />
            <MetaRow label="Total earned" value={money(earnings)} tone="success" />
            <MetaRow label="Referred by" value={referredBy || 'Nobody yet'} tone={referredBy ? 'success' : undefined} />
          </View>
        )}

        {!referredBy ? (
          <ListSection title="HAVE A FRIEND'S CODE?">
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <Input label="Referral code" value={code} onChangeText={(text) => setCode(text.toUpperCase().slice(0, 12))} placeholder="ASH1234" icon="referral" hint="Applied once, credited after your first order" />
              <Button title="Apply code" onPress={() => void apply()} loading={busy} icon="check" style={{ alignSelf: 'stretch' }} />
            </View>
          </ListSection>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.successBg }}>
            <Icon name="circleCheck" size={16} color={c.success} />
            <Text variant="caption" color={c.success} style={{ flex: 1 }}>
              You joined with code {referredBy} — that reward is already in your wallet.
            </Text>
          </View>
        )}

        {isLoggedIn ? null : (
          <Button title="Sign in to get your code" variant="secondary" icon="user" onPress={() => navigation.navigate('Auth', { mode: 'login' })} style={{ alignSelf: 'stretch' }} />
        )}
      </View>
    </Screen>
  );
}

const BRAND_URL = 'https://aurasure.app';

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.xl, gap: 4, marginTop: spacing.sm },
});
