import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { riderApi, type DeliveryTask } from '@/api/rider';
import { uploadRiderFile } from '@/api/rider';
import { useRider } from '@/context/RiderContext';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { pickImage } from '@/lib/pickImage';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function StepDot({ on, done, label }: { on: boolean; done: boolean; label: string }) {
  return (
    <View style={{ alignItems: 'center', width: 56 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: done ? colors.success : on ? colors.brand[600] : colors.ink[100],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={done ? 'check' : 'bike'} size={16} color={done || on ? colors.white : colors.textTertiary} />
      </View>
      <Text variant="caption" color={done ? colors.success : on ? colors.brand[700] : colors.textTertiary} style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

export function ActiveTaskScreen(): React.ReactElement {
  const { refresh } = useRider();
  const navigation = useNavigation<Nav>();
  const focused = useIsFocused();
  const [task, setTask] = useState<DeliveryTask | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickupOtp, setPickupOtp] = useState('');
  const [dropOtp, setDropOtp] = useState('');
  const [pod, setPod] = useState('');
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const pull = useCallback(async () => {
    try {
      const res = await riderApi.activeTask();
      setTask(res.task);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load task');
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    void pull();
  }, [focused, pull]);

  const run = async (fn: () => Promise<{ task: DeliveryTask }>) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      haptic.success();
      setTask(res.task);
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const pickPod = async () => {
    const img = await pickImage();
    if (!img) return;
    setBusy(true);
    try {
      const up = await uploadRiderFile(img.blob, img.name);
      setPod(up.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const completeDelivery = async () => {
    if (!task) return;
    if (!/^\d{4}$/.test(dropOtp.trim())) {
      setError('Enter the 4-digit drop OTP given by the customer.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await riderApi.deliver(task.id, dropOtp.trim(), pod, note);
      haptic.success();
      await refresh();
      navigation.goBack();
    } catch (err) {
      haptic.error();
      setError(err instanceof Error ? err.message : 'Delivery failed');
    } finally {
      setBusy(false);
    }
  };

  const fail = async () => {
    if (!task) return;
    if (!reason.trim()) {
      setError('Add a reason.');
      return;
    }
    try {
      await riderApi.fail(task.id, reason.trim(), note);
      await refresh();
      setFailOpen(false);
      setReason('');
      setNote('');
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fail');
    }
  };

  if (!task) {
    return (
      <Screen title="Active task" headerLeft={<Button title="Back" variant="ghost" size="sm" onPress={() => navigation.goBack()} />}>
        <EmptyState icon="bike" title="No active delivery" subtitle="Accept a delivery from Home to start tracking it here." />
      </Screen>
    );
  }

  const stepIndex = ['accepted', 'at_pickup', 'picked_up', 'at_drop'].indexOf(task.state);
  const isPickupOtp = ['accepted', 'at_pickup'].includes(task.state);
  const isDropOtp = task.state === 'at_drop';

  return (
    <Screen
      title={task.orderCode}
      subtitle={`${task.vendorName} → ${task.drop.name}`}
      headerLeft={<Button title="Back" variant="ghost" size="sm" onPress={() => navigation.goBack()} />}
      refreshing={busy}
      onRefresh={() => void pull()}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <StepDot on={stepIndex === 0} done={stepIndex > 0} label="Pickup" />
        <StepDot on={stepIndex === 2} done={stepIndex > 2} label="Drop" />
        <StepDot on={stepIndex === 3} done={task.state === 'delivered'} label="Done" />
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
        <Text variant="title">Pickup · {task.vendorName}</Text>
        <Text variant="caption" color={colors.textSecondary}>{task.vendorPhone}</Text>
        <Text variant="bodySm" style={{ marginTop: 6 }}>{task.pickup.address}</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
        <Text variant="title">Drop · {task.drop.name}</Text>
        <Text variant="caption" color={colors.textSecondary}>{task.drop.phone}</Text>
        <Text variant="bodySm" style={{ marginTop: 6 }}>{task.drop.address}</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
        <Text variant="title" style={{ marginBottom: 8 }}>Order items</Text>
        {task.items.map((it, i) => (
          <View key={`${it.name}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodySm">{it.qty} × {it.name}</Text>
            <Text variant="bodySm">{formatINR(it.price * it.qty)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text variant="bodySm" color={colors.textSecondary}>Total</Text>
          <Text variant="bodySm" weight="bold">{formatINR(task.total)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text variant="bodySm" color={colors.textSecondary}>
            {task.codAmount > 0 ? 'COD on delivery' : 'Wallet / prepaid'}
          </Text>
          <Text variant="bodySm" color={task.codAmount > 0 ? colors.warning : colors.textSecondary} weight="bold">
            {task.codAmount > 0 ? `Collect ${formatINR(task.codAmount)}` : 'No cash'}
          </Text>
        </View>
      </View>

      {error ? <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>{error}</Text> : null}

      {task.state === 'accepted' ? (
        <Button title="Arrive at pickup" variant="primary" loading={busy} onPress={() => void run(() => riderApi.arrivedPickup(task.id))} />
      ) : null}

      {isPickupOtp ? (
        <View style={{ gap: 10 }}>
          <Input label="Pickup OTP" value={pickupOtp} onChangeText={(v) => setPickupOtp(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="4 digits from the outlet" />
          <Button title="Confirm pickup" variant="success" loading={busy} onPress={() => void run(() => riderApi.pickup(task.id, pickupOtp.trim()))} disabled={pickupOtp.trim().length !== 4} />
        </View>
      ) : null}

      {task.state === 'picked_up' ? (
        <Button title="Arrive at drop" variant="primary" loading={busy} onPress={() => void run(() => riderApi.arrivedDrop(task.id))} />
      ) : null}

      {isDropOtp ? (
        <View style={{ gap: 10 }}>
          <Input label="Drop OTP" value={dropOtp} onChangeText={(v) => setDropOtp(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="4 digits from the customer" />
          <Pressable onPress={() => void pickPod()} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12 }}>
            {pod ? <Image source={{ uri: pod }} style={{ width: 48, height: 48, borderRadius: 10 }} /> : <Icon name="camera" size={20} color={colors.brand[600]} />}
            <View style={{ flex: 1 }}>
              <Text variant="title">Proof of delivery</Text>
              <Text variant="caption" color={colors.textTertiary}>{pod ? 'Tap to replace' : 'Optional photo'}</Text>
            </View>
          </Pressable>
          <Input label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Left with security…" />
          <Button title="Complete delivery" variant="success" loading={busy} onPress={() => void completeDelivery()} disabled={dropOtp.trim().length !== 4} />
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Button title="Report a problem" variant="ghost" onPress={() => setFailOpen(true)} />
      </View>

      <Modal open={failOpen} onClose={() => setFailOpen(false)} title="Report delivery problem">
        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Customer unresponsive / wrong address / item missing" />
        <Input label="Note (optional)" value={note} onChangeText={setNote} multiline />
        <Button title="Mark failed" variant="danger" loading={busy} onPress={() => void fail()} />
      </Modal>
    </Screen>
  );
}
