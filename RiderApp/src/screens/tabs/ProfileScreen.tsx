import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { Modal } from '@/components/ui/Modal';
import { riderApi } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { pickImage } from '@/lib/pickImage';
import { uploadRiderFile } from '@/api/rider';

export function ProfileScreen(): React.ReactElement {
  const { rider, refresh, logout } = useRider();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosNote, setSosNote] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueBody, setIssueBody] = useState('');

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
      } catch {
        // web preview - no location permission
      }
      await riderApi.sos({ lat, lng, type: 'sos', note: sosNote });
      haptic.success();
      setSosOpen(false);
      setSosNote('');
      await refresh();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'SOS failed');
    } finally {
      setBusy(false);
    }
  };

  const submitIssue = async () => {
    if (!issueTitle.trim()) {
      setError('Give the issue a short title.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await riderApi.issue(issueTitle.trim(), issueBody);
      haptic.success();
      setIssueOpen(false);
      setIssueTitle('');
      setIssueBody('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async () => {
    const picked = await pickImage();
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadRiderFile(picked.blob, picked.name);
      await riderApi.setDoc('photo', uploaded.url, 'Profile Photo');
      haptic.success();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const photo = rider?.documents?.find((d) => d.key === 'photo');

  return (
    <Screen title="Profile" subtitle={rider?.name || rider?.phone} refreshing={busy} onRefresh={() => void refresh()}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        {photo?.uri ? (
          <Image source={{ uri: photo.uri }} style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.ink[100] }} />
        ) : (
          <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={38} color={colors.brand[600]} />
          </View>
        )}
        <Text variant="h2" style={{ marginTop: 10 }}>{rider?.name}</Text>
        <Text variant="caption" color={colors.textSecondary}>{rider?.phone}</Text>
        <View style={{ marginTop: 8 }}>
          <Button title={photo?.uri ? 'Replace photo' : 'Add photo'} variant="secondary" size="sm" loading={busy} onPress={() => void uploadPhoto()} />
        </View>
      </View>

      {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text> : null}

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <Text variant="title" style={{ marginBottom: 12 }}>Rider status</Text>
        {[
          ['Account', rider?.status?.replaceAll('_', ' ') ?? '—'],
          ['Duty', rider?.dutyState ?? '—'],
          ['Vehicle', `${(rider?.vehicleType || '').toUpperCase()} ${rider?.vehicleNumber || ''}`],
          ['Rating', `${rider?.rating ?? 5} (${rider?.ratingCount ?? 0} ratings)`],
          ['Trips', `${rider?.totalTrips ?? 0} · lifetime ${formatINR(rider?.totalEarnings ?? 0)}`],
          ['COD in hand', `${formatINR(rider?.codInHand ?? 0)} / ${formatINR(rider?.maxCodLimit ?? 3000)}`],
          ['Payout balance', formatINR(rider?.payoutBalance ?? 0)],
        ].map(([k, v]) => (
          <View key={String(k)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text variant="bodySm" color={colors.textSecondary}>{k}</Text>
            <Text variant="bodySm" weight="semibold">{v}</Text>
          </View>
        ))}
      </View>

      <Text variant="h3" style={{ marginBottom: 8 }}>My documents</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {(rider?.documents ?? []).map((d) => (
          <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            {d.uri ? <Image source={{ uri: d.uri }} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.ink[100] }} /> : <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={20} color={colors.textTertiary} /></View>}
            <View style={{ flex: 1 }}>
              <Text variant="title">{d.label}</Text>
              <Text variant="caption" color={d.verified ? colors.success : colors.textTertiary}>{d.verified ? 'Verified' : d.uri ? 'In review' : 'Missing'}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Button title={rider?.dutyState === 'online' ? 'Go offline' : 'Go online'} variant="secondary" leftIcon="bike" onPress={() => void riderApi.setDuty(rider?.dutyState === 'online' ? 'offline' : 'online').then(() => refresh()).then(haptic.success).catch((e) => setError(e.message))} />
        <Button title="Raise a support issue" variant="secondary" leftIcon="message" onPress={() => setIssueOpen(true)} />
        <Button title="Send SOS / report an incident" variant="danger" leftIcon="circleAlert" onPress={() => setSosOpen(true)} />
        <Button title="Logout" variant="ghost" leftIcon="logout" onPress={logout} />
      </View>

      <Modal open={sosOpen} onClose={() => setSosOpen(false)} title="Send SOS">
        <Input label="What happened?" value={sosNote} onChangeText={setSosNote} multiline placeholder="Accident, harassment, vehicle issue, security…" />
        {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Send SOS" variant="danger" loading={busy} onPress={() => void sendSos()} />
      </Modal>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Support issue">
        <Input label="Title" value={issueTitle} onChangeText={setIssueTitle} placeholder="Payout not credited" />
        <Input label="Details" value={issueBody} onChangeText={setIssueBody} multiline />
        {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text> : null}
        <Button title="Send to support" loading={busy} onPress={() => void submitIssue()} />
      </Modal>
    </Screen>
  );
}
