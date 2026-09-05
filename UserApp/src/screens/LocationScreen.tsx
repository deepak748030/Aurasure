import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { ListRow, ListSection } from '@/components/list/ListRow';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { MapSurface, type MapMarker } from '@/components/map/MapSurface';
import { haptic } from '@/lib/haptics';
import { useQuery } from '@/hooks/useQuery';
import { fetchCities, type ServiceCity } from '@/api/app';
import { hasCoords, project } from '@/lib/geo';

/**
 * `delivery_address_sheet.dart` as a full screen: use current location, pick a
 * saved address, choose the city, or add one by hand. The map card is flush
 * (0 gutter / 0 radius) per the design rules.
 */
export function LocationScreen({ navigation }: { navigation: { navigate: (name: string) => void; goBack: () => void; canGoBack: () => boolean } }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { addresses, selectedAddress, setSelectedAddressId, loadAddresses, requestLocation, locationStatus } = useSession();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const cities = useQuery<ServiceCity[]>(useCallback((signal: AbortSignal) => fetchCities(signal), []), {});
  const list = useMemo(() => cities.data ?? [], [cities.data]);
  const markers = useMemo<MapMarker[]>(() => {
    const pinned = list.filter(hasCoords);
    const positions = project(pinned);
    return pinned.map((city, index) => ({
      id: city.name,
      label: `${city.name} · ${city.outlets} outlets`,
      x: positions[index]?.x ?? 0.5,
      y: positions[index]?.y ?? 0.5,
      icon: 'store',
      active: selectedAddress?.city === city.name,
    }));
  }, [list, selectedAddress?.city]);

  const cityInfo = (city: ServiceCity): void => {
    haptic.selection();
    const here = selectedAddress?.city === city.name;
    sheet.info(
      city.name,
      `${city.outlets} outlet${city.outlets === 1 ? '' : 's'} serve${city.outlets === 1 ? 's' : ''} ${city.name} on Aurasure.${here ? ' Your delivery address is here.' : ' Save an address in this city to order from them.'}`,
    );
  };

  const useCurrent = async (): Promise<void> => {
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    if (!coords) {
      sheet.show({
        title: 'Location unavailable',
        message:
          locationStatus === 'denied'
            ? 'Turn on location for Aurasure in your system settings, or add an address manually.'
            : 'This device or browser did not return a location. Add your address manually instead.',
        icon: 'mapPinOff',
        tone: 'warning',
        dismissLabel: 'Later',
        actions: [{ label: 'Add address manually', onPress: () => navigation.navigate('AddressEdit'), variant: 'primary' }],
      });
      return;
    }
    haptic.success();
    sheet.success('Location captured', `Lat ${coords.latitude.toFixed(4)} · Lng ${coords.longitude.toFixed(4)}\nNearby stores are sorted by distance.`);
  };

  return (
    <Screen title="Delivery address" subtitle="Where should we bring it?" back={navigation.canGoBack()} scroll>
      <View style={{ gap: 0 }}>
        <View style={styles.mapWrap}>
          <MapSurface
            height={190}
            markers={markers}
            showUserDot={false}
            userLabel={list.length > 0 ? `${list.length} cities served` : 'Loading cities…'}
            onMarkerPress={(marker) => {
              const city = list.find((row) => row.name === marker.id);
              if (city) cityInfo(city);
            }}
          />
        </View>

        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md, gap: spacing.sm }}>
          <Button
            label={locating ? 'Getting your location…' : 'Use current location'}
            icon={locating ? undefined : 'navigation'}
            loading={locating}
            size="lg"
            onPress={() => void useCurrent()}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.light();
              navigation.navigate('AddressEdit');
            }}
            style={({ pressed }) => [styles.manual, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Icon name="edit" size={17} color={c.primary} />
            <Text variant="subtitle" weight="semibold" color={c.primary}>
              Enter address manually
            </Text>
            <Icon name="chevronRight" size={15} color={c.primary} />
          </Pressable>
        </View>

        <ListSection title={`Saved · ${addresses.length}`} action="Add new" onAction={() => navigation.navigate('AddressEdit')}>
          {addresses.length === 0 ? (
            <View style={{ padding: spacing.md, gap: 6 }}>
              <Text variant="bodySm" tone="muted">
                No saved addresses yet. Add one and it will be waiting here next time.
              </Text>
            </View>
          ) : (
            addresses.map((address, index) => (
              <ListRow
                key={address.id}
                title={address.label}
                subtitle={address.line}
                meta={`${address.city} · ${address.pin}`}
                icon={address.isDefault ? 'home' : 'mapPin'}
                last={index === addresses.length - 1}
                selected={selectedAddress?.id === address.id}
                badge={selectedAddress?.id === address.id ? 'DELIVERING' : undefined}
                onPress={() => {
                  setSelectedAddressId(address.id);
                  haptic.success();
                  if (!navigation.canGoBack()) navigation.navigate('Tabs');
                  else navigation.goBack();
                }}
              />
            ))
          )}
        </ListSection>

        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.edge }}>
          <Text variant="overline" tone="faint" style={{ paddingBottom: spacing.xs }}>
            SERVICEABLE CITIES · {list.length}
          </Text>
          <View style={styles.cityRow}>
            {list.map((city) => (
              <Pressable
                key={city.name}
                accessibilityRole="button"
                onPress={() => cityInfo(city)}
                style={({ pressed }) => [styles.cityChip, { backgroundColor: pressed ? c.surfaceAlt : c.surfaceHi }]}
              >
                <Text variant="caption" weight="medium">
                  {city.name} · {city.outlets}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ height: spacing.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 190, overflow: 'hidden' },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  cityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cityChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
});
