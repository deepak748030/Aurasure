import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar, Tag } from '@/components/ui/Primitives';
import { ListRow, ListSection } from '@/components/list/ListRow';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money, tierFor } from '@/lib/format';
import { useAppSettings } from '@/hooks/useAppSettings';
import { haptic } from '@/lib/haptics';
import { ApiError } from '@/api/client';
import type { Nav } from '@/navigation/types';

const PHOTO_TINTS = ['primary', 'secondary', 'success', 'warning'] as const;

/**
 * Profile editor. `PUT /users/me` only accepts name, email and avatar, so the
 * phone number is shown read-only with the reason - no fake editable fields.
 */
export function EditProfileScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { user, updateProfile } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [tint, setTint] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const settings = useAppSettings();
  const tier = useMemo(() => tierFor(user?.loyaltyPoints ?? 0, settings.data?.loyalty.tiers), [user?.loyaltyPoints, settings.data]);

  const save = async (): Promise<void> => {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = 'Name needs at least 3 characters';
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'That email looks incomplete';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      haptic.success();
      sheet.success('Profile updated', 'Your name shows on receipts and rider calls right away.');
      navigation.goBack();
    } catch (error) {
      sheet.error('Could not save', error instanceof ApiError ? error.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Edit profile"
      subtitle="Name, email and photo"
      back
      keyboardAvoiding
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm, gap: 6 }}>
          <Button title={busy ? 'Saving…' : 'Save changes'} size="lg" icon="check" loading={busy} onPress={() => void save()} style={{ alignSelf: 'stretch' }} />
          <Button title="Reset" variant="ghost" onPress={() => { setName(user?.name ?? ''); setEmail(user?.email ?? ''); setErrors({}); }} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Avatar name={name || user?.name || 'Guest'} uri={user?.avatar?.uri ?? null} size={76} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="h3" weight="bold" numberOfLines={1}>
              {name || 'Your name'}
            </Text>
            <Text variant="caption" tone="muted">
              {tier.name} · {user?.loyaltyPoints ?? 0} points
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Tag label={money(user?.wallet ?? 0)} icon="wallet" tone="muted" />
              <Tag label={user?.phone ? `+91 ${user.phone}` : 'No phone'} icon="phone" tone="muted" />
            </View>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Input label="Full name" value={name} onChangeText={setName} icon="userRound" error={errors.name} placeholder="Asha Verma" autoCapitalize="words" />
          <Input label="Email" value={email} onChangeText={setEmail} icon="mail" error={errors.email} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <ListSection title="AVATAR TINT">
          <View style={{ flexDirection: 'row', gap: 8, padding: spacing.md }}>
            {PHOTO_TINTS.map((tone, index) => {
              const color = tone === 'primary' ? c.primary : tone === 'secondary' ? c.secondary : tone === 'success' ? c.success : c.warning;
              const on = tint === index;
              return (
                <Button
                  key={tone}
                  title=""
                  variant="ghost"
                  icon="check"
                  onPress={() => {
                    haptic.selection();
                    setTint(index);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    backgroundColor: on ? color : c.surfaceAlt,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? c.borderStrong : c.border,
                    justifyContent: 'center',
                    padding: 0,
                  }}
                  accessibilityLabel={`Avatar tint ${index + 1}`}
                />
              );
            })}
          </View>
        </ListSection>

        <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surfaceHi, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="caption" weight="semibold">
              Mobile number
            </Text>
            <Tag label="LOCKED" tone="muted" />
          </View>
          <Text variant="caption" tone="muted">
            +91 {user?.phone ?? '—'} · your number is your login, so the API does not allow editing it here. Support can move an account to a new number.
          </Text>
        </View>

        <ListSection title="ACCOUNT">
          <ListRow title="Change password" subtitle="Not supported by this server build yet" icon="lock" iconTone="muted" onPress={() => sheet.info('Not available yet', 'Password changes are not exposed by the Aurasure API in this build.')} />
          <ListRow title="Delete my account" subtitle="Removes orders, wallet and favourites" icon="trash" iconTone="danger" onPress={() => sheet.show({ title: 'Account deletion', message: 'This needs the admin console for now — the customer API has no delete endpoint, so nothing was removed.', icon: 'shieldLock', tone: 'warning', dismissLabel: 'Got it' })} last />
        </ListSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.sm },
});
