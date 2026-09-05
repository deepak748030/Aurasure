import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { MetaRow } from '@/components/list/ListRow';
import { Tag } from '@/components/ui/Primitives';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { applyAsDeliveryPartner } from '@/api/account';
import { ApiError } from '@/api/client';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

const PERKS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'wallet', title: 'Paid weekly', body: 'Settlements every Monday for the trips you finished.' },
  { icon: 'navigation', title: 'Your own hours', body: 'Go online when you want; the app never books you in.' },
  { icon: 'shieldCheck', title: 'Verified outlets', body: 'Pick-ups happen from Aurasure-approved stores only.' },
];

/** Become a delivery partner — `POST /users/me/partner-application`. */
export function PartnerScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, isLoggedIn, refreshUser } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  const applied = user?.partnerApplication ?? null;

  const submit = async (): Promise<void> => {
    if (!isLoggedIn) {
      sheet.show({
        title: 'Sign in first',
        message: 'Partner applications are attached to your Aurasure account so we can verify the number.',
        icon: 'user',
        tone: 'info',
        dismissLabel: 'Later',
        actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }],
      });
      return;
    }
    if (name.trim().length < 3) {
      sheet.warning('Add your full name', 'The city team needs the name on your ID.');
      return;
    }
    if (city.trim().length < 3) {
      sheet.warning('Which city?', 'Pick the city you will ride in.');
      return;
    }
    setBusy(true);
    try {
      const result = await applyAsDeliveryPartner({ name: name.trim(), city: city.trim() });
      await refreshUser();
      haptic.success();
      sheet.show({
        title: 'Application received',
        message: `Status: ${result.status}. We verify documents in ${result.city} and send the rider app invite to +91 ${user?.phone ?? 'your number'}.`,
        icon: 'bike',
        tone: 'success',
        dismissLabel: 'Done',
      });
    } catch (error) {
      sheet.error('Could not send', error instanceof ApiError ? error.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Become a delivery partner"
      subtitle={applied ? `Application ${applied.status.toLowerCase()}` : 'Earn with Aurasure in your city'}
      back
      stickyFooter={
        applied ? undefined : (
          <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm }}>
            <Button title={busy ? 'Sending…' : 'Send application'} size="lg" icon="check" loading={busy} onPress={() => void submit()} style={{ alignSelf: 'stretch' }} />
          </View>
        )
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <Icon name="bike" size={28} color={c.onPrimary} />
          <Text variant="h2" weight="bold" color={c.white}>
            Ride with Aurasure
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.88)">
            Deliver food and daily needs from stores you already order from. You keep your cycle, we handle the orders.
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Tag label="Free to join" tone="muted" />
            <Tag label="Settlement weekly" tone="muted" />
          </View>
        </View>

        {PERKS.map((perk) => (
          <Pressable key={perk.title} accessibilityRole="button" onPress={() => sheet.info(perk.title, perk.body, perk.icon)} style={({ pressed }) => [styles.perk, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.95 : 1 }]}>
            <View style={[styles.perkIcon, { backgroundColor: c.secondarySoft }]}>
              <Icon name={perk.icon} size={16} color={c.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" weight="bold">
                {perk.title}
              </Text>
              <Text variant="micro" tone="muted">
                {perk.body}
              </Text>
            </View>
            <Icon name="chevronRight" size={15} color={c.textTertiary} />
          </Pressable>
        ))}

        {applied ? (
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 4 }}>
            <Text variant="overline" tone="faint">
              YOUR APPLICATION
            </Text>
            <MetaRow label="Name" value={applied.name} />
            <MetaRow label="City" value={applied.city} />
            <MetaRow label="Applied" value={new Date(applied.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <MetaRow label="Status" value={applied.status} tone={applied.status === 'approved' ? 'success' : applied.status === 'rejected' ? 'danger' : undefined} />
            <Text variant="micro" tone="muted" style={{ paddingTop: 6 }}>
              Only delivery applications are accepted from the customer app — store onboarding lives in the vendor app. This screen cannot change an application once sent.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" tone="faint">
              DETAILS
            </Text>
            <Input label="Full name" value={name} onChangeText={setName} icon="userRound" placeholder="As printed on your ID" autoCapitalize="words" />
            <Input label="City" value={city} onChangeText={setCity} icon="store" placeholder="Raipur" autoCapitalize="words" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceHi }}>
              <Icon name="phone" size={15} color={c.primary} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                We verify with +91 {user?.phone ?? 'your account number'} — no separate sign-up.
              </Text>
              <Tag label={isLoggedIn ? 'Verified number' : 'Sign in'} tone={isLoggedIn ? 'success' : 'warning'} />
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: radius.xl, gap: 6, marginTop: spacing.sm },
  perk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  perkIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
