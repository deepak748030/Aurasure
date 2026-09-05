import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button, IconButton } from '@/components/ui/Button';
import { type IconName } from '@/lib/icons';
import { EmptyState, Tag } from '@/components/ui/Primitives';
import { ListRow, ListSection } from '@/components/list/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { MapSurface, type MapMarker } from '@/components/map/MapSurface';
import { hasCoords, project } from '@/lib/geo';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';
import type { UserAddress } from '@/types';

const LABEL_ICON: Record<string, IconName> = {
  Home: 'home',
  Work: 'briefcase',
  Other: 'mapPin',
};

/** Saved addresses: pick the delivery one, edit, delete, add. */
export function AddressesScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { addresses, selectedAddressId, setSelectedAddressId, removeAddress, loadAddresses, isLoggedIn, selectedAddress } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      void loadAddresses().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, loadAddresses]);

  const pinned = useMemo(() => addresses.filter(hasCoords), [addresses]);
  const markers = useMemo<MapMarker[]>(() => {
    const positions = project(pinned);
    return pinned.map((address, index) => ({
      id: address.id,
      label: address.label,
      x: positions[index]?.x ?? 0.5,
      y: positions[index]?.y ?? 0.5,
      icon: LABEL_ICON[address.label] ?? 'mapPin',
      active: address.id === selectedAddressId,
    }));
  }, [pinned, selectedAddressId]);

  const askDelete = async (address: UserAddress): Promise<void> => {
    const ok = await sheet.confirm({
      title: 'Delete this address?',
      message: `${address.label} · ${address.line}. Orders already placed keep their own copy of the address.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      destructive: true,
      icon: 'trash',
    });
    if (!ok) return;
    try {
      await removeAddress(address.id);
      haptic.warning();
      sheet.success('Address deleted', 'Your other addresses are untouched.');
    } catch (error) {
      sheet.error('Could not delete', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const choose = (address: UserAddress): void => {
    setSelectedAddressId(address.id);
    haptic.success();
    if (!navigation.canGoBack()) navigation.navigate('Tabs');
  };

  const longPress = (address: UserAddress): void => {
    void (async () => {
      const value = await sheet.pick({
        title: address.label,
        subtitle: address.line,
        options: [
          { label: 'Edit address', value: 'edit', icon: 'edit' },
          { label: 'Set as delivery address', value: 'select', icon: 'check' },
          ...(address.isDefault ? [] : [{ label: 'Make default', value: 'default', icon: 'star' as IconName }]),
          { label: 'Delete', value: 'delete', icon: 'trash', description: 'Removed from your account' },
        ],
      });
      if (!value) return;
      if (value === 'edit') navigation.navigate('AddressEdit', { id: address.id });
      else if (value === 'select') choose(address);
      else if (value === 'default') setSelectedAddressId(address.id);
      else if (value === 'delete') await askDelete(address);
    })();
  };

  return (
    <Screen
      title="Addresses"
      subtitle={addresses.length > 0 ? `${addresses.length} saved` : 'None saved yet'}
      back
      padded={false}
      onRefresh={() => {
        if (isLoggedIn) void loadAddresses();
      }}
      refreshing={loading}
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm }}>
          <Button title="Add a new address" size="lg" icon="plus" onPress={() => navigation.navigate('AddressEdit', {})} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      <View style={{ height: 150 }}>
        <MapSurface
          height={150}
          showControls={false}
          userLabel={
            selectedAddress
              ? `${selectedAddress.label} · ${selectedAddress.city}`
              : 'No address selected'
          }
          showUserDot={false}
          markers={markers}
          footer={
            addresses.length > 0 && pinned.length === 0 ? (
              <Text variant="micro" tone="muted">
                No pins saved yet — open an address and save its map pin.
              </Text>
            ) : undefined
          }
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={3} thumb={34} />
        </View>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="mapPin"
          title="No saved addresses"
          subtitle="Add where you want orders to come — flat number, gate code and all."
          actionLabel="Add address"
          onAction={() => navigation.navigate('AddressEdit', {})}
        />
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          <ListSection title={`SAVED · ${addresses.length}`}>
            {addresses.map((address, index) => {
              const delivering = address.id === selectedAddressId;
              return (
                <ListRow
                  key={address.id}
                  title={address.label}
                  subtitle={address.line}
                  meta={`${address.city} · ${address.pin}`}
                  icon={LABEL_ICON[address.label] ?? 'mapPin'}
                  iconTone={delivering ? 'success' : 'primary'}
                  badge={delivering ? 'DELIVERING' : address.isDefault ? 'DEFAULT' : undefined}
                  selected={delivering}
                  last={index === addresses.length - 1}
                  onPress={() => choose(address)}
                  onLongPress={() => longPress(address)}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <IconButton name="edit" size={30} iconSize={15} accessibilityLabel={`Edit ${address.label}`} onPress={() => navigation.navigate('AddressEdit', { id: address.id })} />
                      <IconButton name="trash" tone="danger" size={30} iconSize={15} accessibilityLabel={`Delete ${address.label}`} onPress={() => void askDelete(address)} />
                    </View>
                  }
                />
              );
            })}
          </ListSection>

          <View style={{ marginHorizontal: spacing.edge, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: c.surfaceHi, gap: 6 }}>
            <Text variant="overline" tone="faint">
              WHY THIS MATTERS
            </Text>
            <Text variant="caption" tone="muted">
              Orders are matched to the nearest outlet by this address, and the rider sees exactly what you typed — floor, gate code, landmark.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Tag label="Suggestive search" icon="search" tone="muted" />
              <Tag label="Pin on map" icon="mapPin" tone="muted" />
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

