import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { riderApi, uploadRiderFile } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { pickImage } from '@/lib/pickImage';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySm" color={colors.textSecondary}>{label}</Text>
      <Text variant="bodySm" weight="semibold" style={{ flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function MenuRow({ icon, label, sublabel, onPress, iconBg, iconColor, last }: {
  icon: IconName; label: string; sublabel?: string; onPress?: () => void;
  iconBg?: string; iconColor?: string; last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { haptic.light(); onPress?.(); }}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuDivider,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg ?? colors.brand[50] }]}>
        <Icon name={icon} size={18} color={iconColor ?? colors.brand[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" weight="semibold">{label}</Text>
        {sublabel ? <Text variant="caption" color={colors.textSecondary}>{sublabel}</Text> : null}
      </View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function ProfileScreen(): React.ReactElement {
  const { rider, refresh, logout } = useRider();
  const navigation = useNavigation<Nav>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Issue form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueBody, setIssueBody] = useState('');
  const [issueMsg, setIssueMsg] = useState('');

  // SOS
  const [showSosForm, setShowSosForm] = useState(false);
  const [sosNote, setSosNote] = useState('');

  const photo = rider?.documents?.find((d) => d.key === 'photo');

  const uploadPhoto = async () => {
    const picked = await pickImage();
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      const up = await uploadRiderFile(picked.blob, picked.name);
      await riderApi.setDoc('photo', up.url, 'Profile Photo');
      haptic.success();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submitIssue = async () => {
    if (!issueTitle.trim()) { setError('Add a short title.'); return; }
    setBusy(true);
    setError('');
    try {
      await riderApi.issue(issueTitle.trim(), issueBody.trim());
      haptic.success();
      setIssueTitle('');
      setIssueBody('');
      setIssueMsg('Ticket sent. We will contact you on your phone.');
      setShowIssueForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  const sendSos = async () => {
    setBusy(true);
    setError('');
    try {
      const { getCurrentPositionAsync, requestForegroundPermissionsAsync } = await import('expo-location');
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const perm = await requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const pos = await getCurrentPositionAsync({ accuracy: 3 });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      } catch { /* web */ }
      await riderApi.sos({ lat, lng, type: 'sos', note: sosNote });
      haptic.success();
      setSosNote('');
      setShowSosForm(false);
      Alert.alert('SOS Sent', 'Your location and note were sent to the operations team.');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SOS failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleDuty = async () => {
    const next = rider?.dutyState === 'online' ? 'offline' : 'online';
    if (next === 'offline') {
      Alert.alert('Go offline?', 'You will stop receiving orders.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go offline', style: 'destructive', onPress: async () => {
          try { await riderApi.setDuty('offline'); await refresh(); haptic.success(); }
          catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        }},
      ]);
    } else {
      try { await riderApi.setDuty('online'); await refresh(); haptic.success(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const isOnline = rider?.dutyState === 'online' || rider?.dutyState === 'on_task';
  const statusColor = rider?.status === 'approved' ? colors.success : rider?.status === 'suspended' ? colors.danger : colors.warning;

  return (
    <Screen
      title="Profile"
      subtitle={rider?.name ?? rider?.phone}
      refreshing={busy}
      onRefresh={() => void refresh()}
    >
      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={() => void uploadPhoto()} style={{ position: 'relative' }}>
          {photo?.uri ? (
            <Image source={{ uri: photo.uri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="user" size={40} color={colors.brand[600]} />
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text variant="h2" weight="bold" style={{ marginTop: 10 }}>{rider?.name}</Text>
        <Text variant="caption" color={colors.textSecondary}>{rider?.phone}</Text>

        {/* Status + duty badges */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text variant="caption" weight="bold" style={{ color: statusColor, textTransform: 'capitalize' }}>
              {rider?.status?.replace(/_/g, ' ') ?? 'onboarding'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isOnline ? colors.successBg : colors.ink[100] }]}>
            <Icon name="bike" size={12} color={isOnline ? colors.success : colors.textTertiary} />
            <Text variant="caption" weight="bold" color={isOnline ? colors.success : colors.textSecondary}>
              {' '}{isOnline ? 'Online' : rider?.dutyState === 'break' ? 'Break' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Text> : null}

      {/* ── Stats cards ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Trips', value: String(rider?.totalTrips ?? 0), icon: 'bike' as IconName, accent: colors.brand[600] },
          { label: 'Rating', value: `${rider?.rating ?? 5} ★`, icon: 'star' as IconName, accent: '#F59E0B' },
          { label: 'Member days', value: String(Math.floor((Date.now() - new Date(rider?.submittedAt ?? Date.now()).getTime()) / 86400000)), icon: 'calendar' as IconName, accent: colors.success },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Icon name={s.icon} size={16} color={s.accent} />
            <Text variant="h3" weight="bold" style={{ marginTop: 4 }}>{s.value}</Text>
            <Text variant="caption" color={colors.textSecondary}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Personal info ── */}
      <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>PERSONAL INFO</Text>
      <View style={styles.infoCard}>
        <InfoRow label="Phone" value={rider?.phone ?? '—'} />
        <InfoRow label="Vehicle" value={`${(rider?.vehicleType ?? '').toUpperCase()} ${rider?.vehicleNumber ?? ''}`.trim() || '—'} />
        <InfoRow label="City" value={rider?.city ?? '—'} />
        <InfoRow label="COD limit" value={`${formatINR(rider?.codInHand ?? 0)} / ${formatINR(rider?.maxCodLimit ?? 3000)}`} />
        <InfoRow label="Payout balance" value={formatINR(rider?.payoutBalance ?? 0)} />
        <InfoRow label="Lifetime earnings" value={formatINR(rider?.totalEarnings ?? 0)} />
      </View>

      {/* ── Documents ── */}
      <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>DOCUMENTS</Text>
      <View style={{ gap: 8, marginBottom: 14 }}>
        {(rider?.documents ?? []).map((d) => (
          <View key={d.key} style={styles.docRow}>
            {d.uri ? (
              <Image source={{ uri: d.uri }} style={styles.docThumb} />
            ) : (
              <View style={[styles.docThumb, styles.docThumbPlaceholder]}>
                <Icon name="image" size={18} color={colors.textTertiary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="semibold">{d.label}</Text>
              <Text variant="caption" color={d.verified ? colors.success : d.uri ? colors.warning : colors.danger}>
                {d.verified ? '✓ Verified' : d.uri ? '⏳ In review' : '✗ Missing'}
              </Text>
              {d.note ? <Text variant="caption" color={colors.danger}>{d.note}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {/* ── Open issues ── */}
      {(rider?.issues ?? []).filter((i) => i.status === 'open').length > 0 ? (
        <>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>OPEN ISSUES</Text>
          {rider!.issues!.filter((i) => i.status === 'open').map((i) => (
            <View key={i.id} style={styles.issueCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="title" weight="semibold" style={{ flex: 1, marginRight: 8 }}>{i.title}</Text>
                <View style={[styles.badge, { backgroundColor: colors.warningBg }]}>
                  <Text variant="caption" weight="bold" color={colors.warning}>Open</Text>
                </View>
              </View>
              {i.body ? <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>{i.body}</Text> : null}
            </View>
          ))}
        </>
      ) : null}

      {/* ── Issue form ── */}
      <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>SUPPORT</Text>
      <View style={styles.menuCard}>
        <MenuRow icon="circleAlert" label="Raise an issue" sublabel="Payout, rider, wrong order…" onPress={() => setShowIssueForm((v) => !v)} />
        <MenuRow icon="shield" label="Send SOS" sublabel="Emergency or incident report" iconBg={colors.dangerBg} iconColor={colors.danger} onPress={() => setShowSosForm((v) => !v)} last />
      </View>

      {showIssueForm ? (
        <View style={{ marginBottom: 14 }}>
          <Input label="What's the issue?" value={issueTitle} onChangeText={setIssueTitle} placeholder="Payout not credited…" leftIcon="circleAlert" />
          <Input label="Details" value={issueBody} onChangeText={setIssueBody} multiline placeholder="Describe the problem…" />
          {issueMsg ? <Text variant="caption" color={colors.success} style={{ marginBottom: 8 }}>{issueMsg}</Text> : null}
          <Button title="Send to support" loading={busy} onPress={() => void submitIssue()} />
        </View>
      ) : null}

      {showSosForm ? (
        <View style={{ marginBottom: 14 }}>
          <Input label="What happened?" value={sosNote} onChangeText={setSosNote} multiline placeholder="Accident, harassment, vehicle issue…" />
          <Button title="Send SOS" variant="danger" loading={busy} onPress={() => void sendSos()} />
        </View>
      ) : null}

      {/* ── Account ── */}
      <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.menuCard}>
        <MenuRow
          icon="bike"
          label={isOnline ? 'Go offline' : 'Go online'}
          sublabel={isOnline ? 'Stop receiving deliveries' : 'Start receiving deliveries'}
          iconBg={isOnline ? colors.dangerBg : colors.successBg}
          iconColor={isOnline ? colors.danger : colors.success}
          onPress={() => void toggleDuty()}
        />
        <MenuRow icon="refresh" label="Refresh profile" sublabel="Sync from server" onPress={() => void refresh()} />
        <MenuRow icon="logout" label="Sign out" sublabel="You will need to log in again" iconBg={colors.dangerBg} iconColor={colors.danger} onPress={handleLogout} last />
      </View>

      <View style={{ height: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.ink[100] },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand[50] },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: colors.brand[600],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 99 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  sectionLabel: { marginBottom: 8, marginTop: 4 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  docThumb: { width: 48, height: 48, borderRadius: 10 },
  docThumbPlaceholder: { backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },
  issueCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  menuCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuDivider: { borderBottomWidth: 1, borderColor: colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
