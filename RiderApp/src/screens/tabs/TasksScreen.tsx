import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { riderApi, type DeliveryTask } from '@/api/rider';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TABS = ['all', 'active', 'delivered', 'failed'] as const;

export function TasksScreen(): React.ReactElement {
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const focused = useIsFocused();
  const navigation = useNavigation<Nav>();

  const pull = useCallback(async () => {
    setBusy(true);
    try {
      const res = await riderApi.tasks();
      setTasks(res.tasks);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    void pull();
  }, [focused, pull]);

  const rows = useMemo(() => {
    if (tab === 'all') return tasks;
    if (tab === 'active') return tasks.filter((t) => ['accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(t.state));
    return tasks.filter((t) => t.state === tab);
  }, [tasks, tab]);

  const tone = (t: DeliveryTask): string => {
    if (t.state === 'delivered') return colors.success;
    if (t.state === 'failed' || t.state === 'cancelled') return colors.danger;
    if (['accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(t.state)) return colors.brand[600];
    return colors.textSecondary;
  };

  return (
    <Screen title="Tasks" subtitle={`${tasks.length} trips`} refreshing={busy} onRefresh={() => void pull()}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => {
          const count = t === 'all' ? tasks.length : t === 'active' ? tasks.filter((x) => ['accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(x.state)).length : tasks.filter((x) => x.state === t).length;
          const on = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => {
                haptic.selection();
                setTab(t);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: on ? colors.brand[600] : colors.surface,
                borderWidth: 1,
                borderColor: on ? colors.brand[600] : colors.border,
              }}
            >
              <Text variant="caption" weight="semibold" color={on ? colors.white : colors.text}>
                {t.toUpperCase()} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon="orders" title="No tasks here" subtitle="Accepted and completed deliveries will appear in this list." />
      ) : (
        <View style={{ gap: 10 }}>
          {rows.map((task) => {
            const active = ['accepted', 'at_pickup', 'picked_up', 'at_drop'].includes(task.state);
            return (
              <Pressable
                key={task.id}
                disabled={!active}
                onPress={() => navigation.navigate('ActiveTask')}
                style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
                    {task.orderCode}
                  </Text>
                  <Text variant="caption" color={tone(task)} weight="bold">
                    {task.state.replaceAll('_', ' ')}
                  </Text>
                </View>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                  {task.vendorName} → {task.drop.name} · {task.drop.address}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text variant="caption" color={colors.textTertiary}>
                    {task.codAmount > 0 ? `COD ${formatINR(task.codAmount)}` : 'Wallet'}
                  </Text>
                  <Text variant="caption" color={colors.success}>
                    +{formatINR(task.riderPayout)}
                  </Text>
                </View>
                {active ? (
                  <View style={{ marginTop: 10 }}>
                    <Button title="Open task" size="sm" variant="secondary" onPress={() => navigation.navigate('ActiveTask')} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
