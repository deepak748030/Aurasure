import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { riderApi, type DeliveryTask } from '@/api/rider';
import { colors } from '@/theme/colors';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  accepted:   { label: 'Accepted',     color: '#2563EB', bg: '#EFF6FF' },
  at_pickup:  { label: 'At Pickup',    color: '#D97706', bg: '#FFFBEB' },
  picked_up:  { label: 'Picked Up',    color: '#7C3AED', bg: '#F5F3FF' },
  at_drop:    { label: 'At Drop',      color: '#0891B2', bg: '#ECFEFF' },
  delivered:  { label: 'Delivered',    color: '#16A34A', bg: '#F0FDF4' },
  failed:     { label: 'Failed',       color: '#EF4444', bg: '#FEF2F2' },
  cancelled:  { label: 'Cancelled',    color: '#94A3B8', bg: '#F1F5F9' },
  available:  { label: 'Pending',      color: '#6366F1', bg: '#EEF2FF' },
};

const RUNNING = ['accepted', 'at_pickup', 'picked_up', 'at_drop'];
const DONE    = ['delivered', 'failed', 'cancelled'];

const FILTER_CHIPS = [
  { key: 'running', label: 'Running' },
  { key: 'all',     label: 'All' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed',    label: 'Failed' },
];

function TaskCard({ task, onMap }: { task: DeliveryTask; onMap: () => void }) {
  const sc = STATUS_CONFIG[task.state] ?? { label: task.state, color: colors.textSecondary, bg: colors.surfaceAlt };
  const dateStr = new Date(task.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text variant="title" weight="bold">{task.orderCode}</Text>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text variant="caption" weight="bold" style={{ color: sc.color }}>{sc.label}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={{ marginTop: 6 }}>
        <View style={styles.routeLine}>
          <Icon name="store" size={13} color={colors.warning} />
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>
            {task.vendorName} — {task.pickup.address}
          </Text>
        </View>
        <View style={styles.routeLine}>
          <Icon name="mapPin" size={13} color={colors.danger} />
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1, marginLeft: 6 }}>
            {task.drop.name} — {task.drop.address}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodySm" weight="bold" color={colors.success}>+{formatINR(task.riderPayout)}</Text>
          {task.codAmount > 0 ? (
            <View style={[styles.miniChip, { backgroundColor: colors.warningBg }]}>
              <Text variant="caption" color={colors.warning} weight="bold">COD {formatINR(task.codAmount)}</Text>
            </View>
          ) : (
            <View style={[styles.miniChip, { backgroundColor: colors.successBg }]}>
              <Text variant="caption" color={colors.success}>Prepaid</Text>
            </View>
          )}
          {task.distanceKm ? (
            <Text variant="caption" color={colors.textTertiary}>{task.distanceKm.toFixed(1)} km</Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="caption" color={colors.textTertiary}>{dateStr}</Text>
          {RUNNING.includes(task.state) ? (
            <TouchableOpacity onPress={onMap} style={styles.mapBtn}>
              <Icon name="mapPin" size={15} color={colors.brand[600]} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Fail reason */}
      {task.failReason ? (
        <View style={styles.failRow}>
          <Icon name="circleAlert" size={13} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={{ flex: 1, marginLeft: 4 }}>{task.failReason}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TasksScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState('running');
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await riderApi.tasks();
      setTasks(res.tasks);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = tasks.filter((t) => {
    if (filter === 'running') return RUNNING.includes(t.state);
    if (filter === 'delivered') return t.state === 'delivered';
    if (filter === 'failed') return t.state === 'failed';
    return true;
  });

  const runningCount = tasks.filter((t) => RUNNING.includes(t.state)).length;

  return (
    <Screen title="My Tasks" scroll={false} padded={false}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {FILTER_CHIPS.map((c) => {
          const active = filter === c.key;
          const count = c.key === 'running' ? runningCount
            : c.key === 'all' ? tasks.length
            : tasks.filter((t) => t.state === c.key).length;
          return (
            <Pressable
              key={c.key}
              onPress={() => { haptic.selection(); setFilter(c.key); }}
              style={[styles.chip, active && { backgroundColor: colors.brand[600] }]}
            >
              <Text variant="subtitle" weight={active ? 'bold' : 'medium'} color={active ? '#fff' : colors.textSecondary}>
                {c.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.chipBadge, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : colors.brand[50] }]}>
                  <Text variant="caption" weight="bold" color={active ? '#fff' : colors.brand[700]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={[{ paddingHorizontal: 16, paddingBottom: 32 }, filtered.length === 0 && { flex: 1 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(true); }}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onMap={() => navigation.navigate('OrderMap', { taskId: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="orders"
              title={filter === 'running' ? 'No running tasks' : 'No tasks found'}
              subtitle={filter === 'running' ? 'Accept a delivery from the Home tab.' : 'Completed tasks will appear here.'}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipBadge: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  miniChip: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mapBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  failRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    padding: 8,
  },
});
