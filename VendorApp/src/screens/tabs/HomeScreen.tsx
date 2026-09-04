import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { vendorApi, type DashboardStats, type VendorOrder } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Stat Tile ──────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: IconName;
  accent: string;
}) {
  return (
    <View style={[styles.tile, { borderColor: colors.border }]}>
      <View style={[styles.tileIcon, { backgroundColor: accent + '18' }]}>
        <Icon name={icon} size={18} color={accent} />
      </View>
      <Text variant="h2" weight="bold" style={{ marginTop: 8 }}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

// ─── Live Order Row ──────────────────────────────────────────────────────────
function LiveOrderRow({
  order,
  onPress,
}: {
  order: VendorOrder;
  onPress: () => void;
}) {
  const statusColor = {
    placed: '#2563EB',
    confirmed: '#0891B2',
    preparing: '#D97706',
    out_for_delivery: '#7C3AED',
  }[order.status] ?? colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="title" weight="semibold">#{order.code}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
            <Text variant="caption" weight="bold" style={{ color: statusColor, textTransform: 'capitalize' }}>
              {order.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        <Text variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
          {order.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variant="title" weight="bold">₹{Math.round(order.total)}</Text>
        <Icon name="chevronRight" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────
export function HomeScreen(): React.ReactElement {
  const { vendor, setVendor } = useVendor();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todaySales: 0,
    liveOrders: 0,
    menuCount: 0,
    payoutBalance: 0,
  });
  const [liveOrders, setLiveOrders] = useState<VendorOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const switchAnim = useRef(new Animated.Value(vendor?.isOpen ? 1 : 0)).current;

  const load = useCallback(async () => {
    try {
      const data = await vendorApi.dashboard();
      setVendor(data.vendor);
      setStats(data.stats);
      setLiveOrders(data.live ?? []);
    } catch {
      /* silent — offline or not approved yet */
    }
  }, [setVendor]);

  React.useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const toggle = async (isOpen: boolean) => {
    setBusy(true);
    haptic.light();
    Animated.timing(switchAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    try {
      const data = await vendorApi.setOpen(isOpen);
      setVendor(data.vendor);
      haptic.success();
    } catch {
      haptic.error();
      Animated.timing(switchAnim, {
        toValue: isOpen ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } finally {
      setBusy(false);
    }
  };

  const isOpen = Boolean(vendor?.isOpen);
  const isApproved = vendor?.status === 'approved';

  return (
    <Screen
      title={vendor?.outletName || 'My Outlet'}
      subtitle={vendor?.module === 'food' ? '🍽  Food Kitchen' : '🛍  Shop'}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      headerRight={
        <TouchableOpacity
          onPress={() => void load()}
          style={{ padding: 4 }}
        >
          <Icon name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      }
    >
      {/* Open / Closed switch */}
      {isApproved ? (
        <View
          style={[
            styles.toggleCard,
            { backgroundColor: isOpen ? '#16A34A' : '#DC2626' },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="title" weight="bold" color={colors.white}>
              {isOpen ? 'Accepting Orders' : 'Outlet Paused'}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.80)" style={{ marginTop: 2 }}>
              {isOpen
                ? 'Customers can order right now.'
                : 'New orders will not come in. Live tickets still finish.'}
            </Text>
          </View>
          <Switch
            value={isOpen}
            onValueChange={(v) => void toggle(v)}
            disabled={busy}
            trackColor={{ false: 'rgba(255,255,255,0.30)', true: 'rgba(255,255,255,0.30)' }}
            thumbColor={colors.white}
            ios_backgroundColor="rgba(255,255,255,0.30)"
          />
        </View>
      ) : (
        <View style={[styles.toggleCard, { backgroundColor: colors.warningBg }]}>
          <Icon name="shield" size={20} color={colors.warning} />
          <Text variant="bodySm" color={colors.warning} style={{ marginLeft: 10, flex: 1 }}>
            Your outlet goes live after admin verifies all documents.
          </Text>
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsRow}>
        <StatTile label="Today Orders" value={String(stats.todayOrders)} icon="receipt" accent={colors.brand[600]} />
        <StatTile label="Today Sales" value={`₹${Math.round(stats.todaySales)}`} icon="rupee" accent={colors.success} />
      </View>
      <View style={styles.statsRow}>
        <StatTile label="Live Tickets" value={String(stats.liveOrders)} icon="timer" accent={colors.warning} />
        <StatTile label="Menu Items" value={String(stats.menuCount)} icon="utensils" accent={colors.brand[400]} />
      </View>

      {/* Earnings card */}
      <View style={styles.earningsCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.tileIcon, { backgroundColor: colors.brand[50] }]}>
            <Icon name="wallet" size={18} color={colors.brand[600]} />
          </View>
          <View>
            <Text variant="caption" color={colors.textSecondary} weight="semibold">SETTLEMENT WALLET</Text>
            <Text variant="h2" weight="bold" style={{ color: colors.brand[700] }}>
              ₹{Math.round(stats.payoutBalance)}
            </Text>
          </View>
        </View>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
          Credited when an order is marked delivered. Platform keeps 5% of item total.
        </Text>
      </View>

      {/* Live orders */}
      {liveOrders.length > 0 ? (
        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="h3" weight="bold">Live Tickets</Text>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text variant="caption" weight="bold" color={colors.success}>{liveOrders.length}</Text>
            </View>
          </View>
          <View style={styles.liveSection}>
            {liveOrders.map((order, i) => (
              <React.Fragment key={order.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <LiveOrderRow
                  order={order}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                />
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : isApproved ? (
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Icon name="coffee" size={36} color={colors.brand[200]} />
          <Text variant="bodySm" color={colors.textTertiary} style={{ marginTop: 10 }}>
            No live tickets right now
          </Text>
        </View>
      ) : null}

      {/* Tips */}
      <Text variant="h3" weight="bold" style={{ marginTop: 20, marginBottom: 10 }}>Quick Tips</Text>
      {[
        { icon: 'clock' as IconName, t: 'Prep running late', b: 'Pause the outlet. Customers stop ordering; live tickets still finish.' },
        { icon: 'wallet' as IconName, t: 'Payout delayed', b: 'Wrong IFSC is caught at KYC. Balance shows on More → Payouts.' },
        { icon: 'circleAlert' as IconName, t: 'Item out of stock', b: 'Toggle stock on Menu tab without deleting the item.' },
        { icon: 'shield' as IconName, t: 'KYC rejected', b: 'Each document has a note. Fix only that slot — not the whole form.' },
      ].map((row, i) => (
        <View
          key={row.t}
          style={[
            styles.tipRow,
            i < 3 ? { borderBottomWidth: 1, borderColor: colors.border } : null,
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: colors.brand[50] }]}>
            <Icon name={row.icon} size={18} color={colors.brand[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" weight="semibold">{row.t}</Text>
            <Text variant="bodySm" color={colors.textSecondary}>{row.b}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  liveSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
