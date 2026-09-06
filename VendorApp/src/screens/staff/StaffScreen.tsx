import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, Card, Divider, EmptyState, IconButton, SectionTitle } from '@/components/ui/VendorUI';
import { Icon } from '@/lib/icons';
import { vendorApi, type Staff } from '@/api/vendor';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useVendorModal } from '@/components/ui/VendorModal';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Staff'>;

/** Staff access is managed here in the app — add, review and remove members. */
export function StaffScreen({ navigation }: Props): React.ReactElement {
  const { showModal } = useVendorModal();
  const { vendor } = useVendor();
  const [staff, setStaff] = useState<Staff[]>(vendor?.staff ?? []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await vendorApi.staff();
      setStaff(result.staff);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your team');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async (): Promise<void> => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanName.length < 2) { setError('Enter the team member’s name.'); return; }
    if (cleanPhone.length !== 10) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (staff.some((member) => member.phone.replace(/\D/g, '').endsWith(cleanPhone))) {
      setError('That number is already on your team.');
      return;
    }
    setBusy(true);
    try {
      const result = await vendorApi.addStaff({ name: cleanName, phone: cleanPhone });
      setStaff((current) => [...current, result.staff]);
      setName(''); setPhone(''); setError('');
      haptic.success();
      showModal({ title: 'Team member added', message: `${cleanName} can now sign in with ${cleanPhone} and work the order board. They cannot see payouts or edit KYC.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add this member');
      haptic.error();
    } finally {
      setBusy(false);
    }
  };

  const remove = (member: Staff): void => {
    showModal({
      title: `Remove ${member.name}?`,
      message: 'They will lose access to the order board immediately.',
      actions: [
        { label: 'Keep access', secondary: true },
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            try {
              await vendorApi.removeStaff(member.id);
              setStaff((current) => current.filter((entry) => entry.id !== member.id));
              haptic.success();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not remove this member');
            }
          },
        },
      ],
    });
  };

  return (
    <Screen title="Staff access" subtitle="Let your team run orders without sharing your login" headerLeft={<BackButton onPress={() => navigation.goBack()} />} onRefresh={() => void load()}>
      <Card tone="warm" style={styles.intro}>
        <View style={styles.introIcon}><Icon name="users" size={20} color={colors.brand[700]} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="title" weight="bold">Orders-only access</Text>
          <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4 }}>
            Staff can accept orders, set prep times and mark food ready. They cannot see payouts, edit KYC or remove people.
          </Text>
        </View>
      </Card>

      <SectionTitle title="Add a team member" />
      <Card>
        <Input label="Full name" value={name} onChangeText={(text) => { setName(text); setError(''); }} placeholder="e.g. Ramesh Kumar" leftIcon="user" autoCapitalize="words" />
        <Input label="Mobile number" value={phone} onChangeText={(text) => { setPhone(text.replace(/\D/g, '').slice(0, 10)); setError(''); }} placeholder="10-digit number" leftIcon="phone" keyboardType="number-pad" maxLength={10} />
        {error ? <Text variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Text> : null}
        <Button title="Add to my team" leftIcon="plus" loading={busy} onPress={() => void add()} />
      </Card>

      <SectionTitle title="Your team" action={staff.length ? `${staff.length} member${staff.length === 1 ? '' : 's'}` : undefined} />
      {loading ? (
        <Text variant="body" color={colors.textSecondary}>Loading your team…</Text>
      ) : staff.length === 0 ? (
        <Card>
          <EmptyState icon="users" title="No team members yet" body="Add someone above so they can work the order board while you are away." />
        </Card>
      ) : (
        <Card style={styles.listCard}>
          {staff.map((member, index) => (
            <React.Fragment key={member.id}>
              {index ? <Divider /> : null}
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text variant="title" weight="bold" color={colors.brand[700]}>{member.name.trim().charAt(0).toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" weight="bold">{member.name}</Text>
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{member.phone}</Text>
                </View>
                <Badge label={member.active ? 'ACTIVE' : 'PAUSED'} color={member.active ? colors.success : colors.textSecondary} background={member.active ? colors.successBg : colors.surfaceAlt} />
                <IconButton icon="trash" color={colors.danger} background={colors.dangerBg} size={36} onPress={() => remove(member)} />
              </View>
            </React.Fragment>
          ))}
        </Card>
      )}

      <Text variant="caption" color={colors.textTertiary} style={styles.footnote}>
        Removing a member takes effect immediately. Owner access always stays with {vendor?.ownerName || 'the registered owner'}.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  introIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  listCard: { paddingVertical: 2, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  footnote: { textAlign: 'center', marginTop: 20 },
});
