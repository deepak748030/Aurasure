import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { Tag } from '@/components/ui/Primitives';
import { MapSurface } from '@/components/map/MapSurface';
import { hasCoords } from '@/lib/geo';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { ApiError } from '@/api/client';
import type { Nav, Route } from '@/navigation/types';

const LABELS: { key: string; label: string; icon: IconName; hint: string }[] = [
  { key: 'Home', label: 'Home', icon: 'home', hint: 'Flat / house number, floor, building name' },
  { key: 'Work', label: 'Work', icon: 'briefcase', hint: 'Company name, floor, landmark' },
  { key: 'Other', label: 'Other', icon: 'mapPin', hint: 'Nearby landmark, gate, anything useful' },
];

/**
 * Add / edit an address. The server keeps label, line, city, pin (and the
 * default flag); map coordinates stay on the device because the API has no
 * lat/lng field for addresses.
 */
export function AddressEditScreen({ navigation, route }: { navigation: Nav; route: Route<'AddressEdit'> }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { addresses, addAddress, editAddress, loadAddresses, setSelectedAddressId, requestLocation, locationStatus, coords } = useSession();
  const id = route.params?.id;
  const existing = useMemo(() => addresses.find((address) => address.id === id) ?? null, [addresses, id]);

  const [label, setLabel] = useState(existing?.label ?? 'Home');
  const [line, setLine] = useState(existing?.line ?? '');
  const [city, setCity] = useState(existing?.city ?? 'Raipur');
  const [pin, setPin] = useState(existing?.pin ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? addresses.length === 0);
  const [saveCoords, setSaveCoords] = useState(() => hasCoords(existing));
  const [busy, setBusy] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only when the book is empty *and* we have not already tried — depending on
  // `addresses.length` re-ran this fetch every time the list changed, and a
  // user with zero addresses re-fetched on every render pass.
  const triedLoad = useRef(false);
  useEffect(() => {
    if (triedLoad.current || addresses.length > 0) return;
    triedLoad.current = true;
    void loadAddresses().catch(() => undefined);
  }, [addresses.length, loadAddresses]);

  const activeLabel = LABELS.find((row) => row.key === label) ?? LABELS[0]!;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (line.trim().length < 10) next.line = 'Give a bit more detail — floor, building or landmark';
    if (city.trim().length < 3) next.city = 'City is required';
    if (!/^\d{6}$/.test(pin.trim())) next.pin = 'PIN code must be 6 digits';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate()) return;
    setBusy(true);
    try {
      const pinCoords = saveCoords && coords ? { lat: coords.latitude, lng: coords.longitude } : saveCoords && hasCoords(existing) ? { lat: existing.lat, lng: existing.lng } : { lat: null, lng: null };
      const payload = { label: activeLabel.label, line: line.trim(), city: city.trim(), pin: pin.trim(), isDefault, ...pinCoords };
      if (existing) {
        await editAddress(existing.id, payload);
        if (isDefault) setSelectedAddressId(existing.id);
      } else {
        const created = await addAddress(payload);
        if (isDefault || addresses.length === 0) setSelectedAddressId(created.id);
      }
      haptic.success();
      sheet.show({
        title: existing ? 'Address updated' : 'Address saved',
        message: `${activeLabel.label} · ${line.trim().slice(0, 48)} is ready to use at checkout.${saveCoords && (coords || hasCoords(existing)) ? ' The map pin was saved with it.' : ''}`,
        icon: 'circleCheck',
        tone: 'success',
        dismissLabel: 'Done',
      });
      navigation.goBack();
    } catch (error) {
      sheet.error('Could not save', error instanceof ApiError ? error.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const useCurrentLocation = async (): Promise<void> => {
    if (pinning) return;
    setPinning(true);
    // `force` because this button means "read the GPS again" — everywhere else
    // the cached fix is the right answer.
    const next = await requestLocation({ force: true }).catch(() => null);
    setPinning(false);
    if (!next) {
      sheet.info('Location unavailable', locationStatus === 'denied' ? 'Allow location for Aurasure in system settings, then try again.' : 'This device or browser did not return a location — type the address instead.', 'mapPinOff');
      return;
    }
    setSaveCoords(true);
    haptic.success();
    sheet.success('Pinned', `Roughly ${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)}. The rider uses your written address.`);
  };

  return (
    <Screen
      title={existing ? 'Edit address' : 'Add address'}
      subtitle="Where should we bring your orders?"
      back
      keyboardAvoiding
      stickyFooter={
        <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.sm, gap: 6 }}>
          <Button title={busy ? 'Saving…' : existing ? 'Save changes' : 'Save address'} size="lg" icon="check" loading={busy} onPress={() => void save()} style={{ alignSelf: 'stretch' }} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={styles.labelRow}>
          {LABELS.map((row) => {
            const on = label === row.key;
            return (
              <Pressable
                key={row.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptic.selection();
                  setLabel(row.key);
                }}
                style={({ pressed }) => [styles.labelChip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primaryFaint : c.surface, opacity: pressed ? 0.92 : 1 }]}
              >
                <Icon name={row.icon} size={16} color={on ? c.primary : c.textSecondary} />
                <Text variant="caption" weight={on ? 'bold' : 'medium'} color={on ? c.primary : c.textSecondary}>
                  {row.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 140, borderRadius: radius.md, overflow: 'hidden' }}>
          <MapSurface
            height={140}
            showControls={false}
            userLabel={coords ? 'Current location' : hasCoords(existing) ? 'Saved pin' : 'Not pinned'}
            showUserDot={Boolean(coords || hasCoords(existing))}
            markers={
              coords || hasCoords(existing)
                ? [{ id: 'me', label: 'Pin', x: 0.5, y: 0.5, icon: 'mapPin', tone: 'primary', active: true }]
                : []
            }
          />
        </View>

        <View style={{ gap: 6 }}>
          <Input
            label="Address"
            value={line}
            onChangeText={setLine}
            multiline
            placeholder={activeLabel.hint}
            icon="mapPinned"
            error={errors.line}
            hint="Landmark helps the rider find you fast"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input label="City" value={city} onChangeText={setCity} icon="store" error={errors.city} containerStyle={{ flex: 1 }} />
            <Input label="PIN" value={pin} onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" icon="shield" error={errors.pin} containerStyle={{ width: 120 }} />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Button
            title={pinning ? 'Getting your location…' : coords && saveCoords ? 'Recenter on my location' : 'Pin current location'}
            variant="secondary"
            icon="navigation"
            loading={pinning}
            disabled={pinning}
            onPress={() => void useCurrentLocation()}
            style={{ alignSelf: 'stretch' }}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: saveCoords }}
            onPress={() => {
              haptic.selection();
              setSaveCoords((prev) => !prev);
            }}
            style={({ pressed }) => [styles.defaultRow, { borderColor: c.border, opacity: pressed ? 0.94 : 1 }]}
          >
            <View style={[styles.checkbox, { borderColor: saveCoords ? c.primary : c.borderStrong, backgroundColor: saveCoords ? c.primary : 'transparent' }]}>
              {saveCoords ? <Icon name="check" size={12} color={c.onPrimary} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" weight="semibold">
                Save this pin with the address
              </Text>
              <Text variant="micro" tone="muted">
                {coords
                  ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} — helps the rider find you`
                  : 'Pin your location first, then save it here'}
              </Text>
            </View>
            <Tag label={saveCoords ? 'ON' : 'OFF'} tone={saveCoords ? 'success' : 'muted'} />
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDefault }}
            onPress={() => {
              haptic.selection();
              setIsDefault((prev) => !prev);
            }}
            style={({ pressed }) => [styles.defaultRow, { borderColor: c.border, opacity: pressed ? 0.94 : 1 }]}
          >
            <View style={[styles.checkbox, { borderColor: isDefault ? c.primary : c.borderStrong, backgroundColor: isDefault ? c.primary : 'transparent' }]}>
              {isDefault ? <Icon name="check" size={12} color={c.onPrimary} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" weight="semibold">
                Make this my default
              </Text>
              <Text variant="micro" tone="muted">
                New orders start with this address
              </Text>
            </View>
            <Tag label={isDefault ? 'ON' : 'OFF'} tone={isDefault ? 'success' : 'muted'} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', gap: 6 },
  labelChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: radius.xs, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
