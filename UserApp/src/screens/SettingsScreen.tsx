import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon, BRAND } from '@/lib/icons';
import { ListRow, ListSection, MetaRow } from '@/components/list/ListRow';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Tag } from '@/components/ui/Primitives';
import { useTheme, type ThemeMode } from '@/theme/ThemeContext';
import { useSession } from '@/context/SessionContext';
import { useCart } from '@/context/CartContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { StorageKey, readJson, removeKey, writeJson } from '@/lib/storage';
import { API_BASE_URL, CURRENCY } from '@/config';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

interface SettingsState {
  notifications: boolean;
  hapticsEnabled: boolean;
  autoOpenCart: boolean;
  saveImagesToDisk: boolean;
}

const DEFAULTS: SettingsState = { notifications: true, hapticsEnabled: true, autoOpenCart: false, saveImagesToDisk: true };

/** Appearance, notifications and cache — everything the reference drawer had. */
export function SettingsScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { mode, setMode, resolved } = useTheme();
  const { online, checkHealth } = useSession();
  const { totalCartCount, clearAll } = useCart();
  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);

  useEffect(() => {
    void readJson<SettingsState>(StorageKey.settings, DEFAULTS).then((stored) => setSettings({ ...DEFAULTS, ...stored }));
  }, []);

  const update = (patch: Partial<SettingsState>): void => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void writeJson(StorageKey.settings, next);
    haptic.selection();
  };

  const clearCaches = async (): Promise<void> => {
    const ok = await sheet.confirm({
      title: 'Clear local data?',
      message: 'Removes the saved cart, recent searches and cached profile on this device. Your account data stays on the server.',
      confirmLabel: 'Clear',
      destructive: true,
      icon: 'broom',
    });
    if (!ok) return;
    await Promise.all([removeKey(StorageKey.cart), removeKey(StorageKey.recentSearches), removeKey(StorageKey.user), removeKey(StorageKey.address)]);
    clearAll();
    haptic.warning();
    sheet.success('Local data cleared', 'Reload the app to fetch everything again.');
  };

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Currency', value: CURRENCY, hint: 'Read from the app config' },
    { label: 'API base', value: API_BASE_URL ? API_BASE_URL.replace(/^https?:\/\//, '') : 'not set', hint: 'EXPO_PUBLIC_API_URL' },
    { label: 'Connection', value: online === false ? 'Offline' : online === true ? 'Connected' : 'Checking…' },
  ];

  return (
    <Screen title="Settings" subtitle="Theme, notifications, storage" back padded={false}>
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={{ paddingTop: spacing.sm }}>
          <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
            APPEARANCE
          </Text>
          <SegmentedTabs
            tabs={[
              { key: 'light', label: 'Light', icon: 'sun' },
              { key: 'dark', label: 'Dark', icon: 'moon' },
              { key: 'system', label: 'System', icon: 'phone' },
            ]}
            active={mode}
            onChange={(key) => {
              setMode(key as ThemeMode);
              haptic.selection();
            }}
          />
          <Text variant="micro" tone="muted" style={{ paddingTop: 6 }}>
            Currently using the {resolved} palette{resolved === 'dark' ? ' — deep plum with light text.' : '.'}
          </Text>
        </View>

        <ListSection title="NOTIFICATIONS">
          <ListRow
            title="Order updates"
            subtitle={settings.notifications ? 'Status changes shown in the app inbox' : 'Muted — you will not see new badges'}
            icon="bell"
            iconTone={settings.notifications ? 'success' : 'muted'}
            onPress={() => update({ notifications: !settings.notifications })}
            trailing={<Toggle on={settings.notifications} color={c.primary} />}
          />
          <ListRow
            title="Haptics"
            subtitle={settings.hapticsEnabled ? 'Taps, adds and confirmations buzz' : 'Vibration disabled'}
            icon="vibrate"
            iconTone={settings.hapticsEnabled ? 'success' : 'muted'}
            onPress={() => update({ hapticsEnabled: !settings.hapticsEnabled })}
            trailing={<Toggle on={settings.hapticsEnabled} color={c.primary} />}
          />
          <ListRow
            title="Open cart after adding"
            subtitle={settings.autoOpenCart ? 'Jumps straight to the cart' : 'Stays on the menu'}
            icon="cart"
            iconTone={settings.autoOpenCart ? 'success' : 'muted'}
            onPress={() => update({ autoOpenCart: !settings.autoOpenCart })}
            trailing={<Toggle on={settings.autoOpenCart} color={c.primary} />}
          />
          <ListRow
            title="Keep images on disk"
            subtitle={settings.saveImagesToDisk ? 'Faster scrolling, uses a little storage' : 'Images re-download every time'}
            icon="image"
            iconTone={settings.saveImagesToDisk ? 'success' : 'muted'}
            onPress={() => update({ saveImagesToDisk: !settings.saveImagesToDisk })}
            trailing={<Toggle on={settings.saveImagesToDisk} color={c.primary} />}
            last
          />
        </ListSection>

        <ListSection title="DATA">
          <ListRow title="Clear local data" subtitle={`${totalCartCount} item${totalCartCount === 1 ? '' : 's'} in carts · searches · cached profile`} icon="broom" iconTone="danger" onPress={() => void clearCaches()} />
          <ListRow title="Re-check the server" subtitle="Hits GET /health and updates the offline banner" icon="refresh" onPress={() => void checkHealth()} last />
        </ListSection>

        <View style={{ padding: spacing.md, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
            ABOUT
          </Text>
          {rows.map((row) => (
            <MetaRow key={row.label} label={row.label} value={row.value} />
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 }}>
            <Icon name={BRAND.icon} size={15} color={c.primary} />
            <Text variant="caption" weight="bold" style={{ flex: 1 }}>
              {BRAND.name} · {BRAND.tagline}
            </Text>
            <Tag label="v1.0.0" tone="muted" />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Toggle({ on, color }: { on: boolean; color: string }): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ width: 40, height: 23, borderRadius: 999, padding: 2, justifyContent: 'center', backgroundColor: on ? color : c.borderStrong }}>
      <View style={{ width: 19, height: 19, borderRadius: 999, backgroundColor: '#FFFFFF', transform: [{ translateX: on ? 17 : 0 }] }} />
    </View>
  );
}
