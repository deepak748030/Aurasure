import React, { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';
import type { IconName } from '@/types';

export function HomeScreen(): React.ReactElement {
  const { vendor, setVendor } = useVendor();
  const [stats, setStats] = useState({ todayOrders: 0, todaySales: 0, liveOrders: 0, menuCount: 0, payoutBalance: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await vendorApi.dashboard();
    setVendor(data.vendor);
    setStats(data.stats);
  }, [setVendor]);

  React.useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const toggle = async (isOpen: boolean) => {
    setBusy(true);
    try {
      const data = await vendorApi.setOpen(isOpen);
      setVendor(data.vendor);
    } finally {
      setBusy(false);
    }
  };

  const tile = (label: string, value: string, icon: IconName) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Icon name={icon} size={18} color={colors.brand[600]} />
      <Text variant="h2" style={{ marginTop: 8 }}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );

  return (
    <Screen
      title={vendor?.outletName || 'Outlet'}
      subtitle={vendor?.module === 'food' ? 'Food kitchen' : 'Shop'}
      onRefresh={() => void load()}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: vendor?.isOpen ? colors.successBg : colors.dangerBg,
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <View>
          <Text variant="title">{vendor?.isOpen ? 'Accepting orders' : 'Outlet paused'}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Busy hour? Pause instead of rejecting every ticket.
          </Text>
        </View>
        <Switch value={Boolean(vendor?.isOpen)} onValueChange={(v) => void toggle(v)} disabled={busy} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        {tile('Today orders', String(stats.todayOrders), 'orders')}
        {tile('Today sales', `₹${Math.round(stats.todaySales)}`, 'rupee')}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {tile('Live tickets', String(stats.liveOrders), 'timer')}
        {tile('Menu items', String(stats.menuCount), 'utensils')}
      </View>

      <Text variant="h3" style={{ marginTop: 22, marginBottom: 8 }}>
        Vendor problems we already solved
      </Text>
      {[
        { icon: 'clock' as const, t: 'Prep running late', b: 'Pause the outlet. Customers stop ordering; live tickets still finish.' },
        { icon: 'wallet' as const, t: 'Payout delayed', b: 'Wrong IFSC is caught at KYC. Balance shows on More → Payouts.' },
        { icon: 'circleAlert' as const, t: 'Item out of stock', b: 'Toggle stock on Menu without deleting the SKU.' },
        { icon: 'shield' as const, t: 'Rejected KYC', b: 'Each document has a reason. Fix that slot only, not the whole form.' },
      ].map((row) => (
        <Pressable
          key={row.t}
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name={row.icon} size={20} color={colors.brand[600]} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{row.t}</Text>
            <Text variant="bodySm" color={colors.textSecondary}>
              {row.b}
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
