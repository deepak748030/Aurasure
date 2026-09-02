import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { MapView, Marker, type Region } from '@/components/map';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Button } from '../../components/ui/Button';
import { SmartImage } from '../../components/ui/SmartImage';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { CITY_COORDS, detectCity, POPULAR_CITIES, type PlaceResult } from '@/lib/location';
import { Images } from '@/assets';
import { useApp } from '@/context/AppContext';
import { useScreenBars } from '@/lib/systemBars';
import type { IconName, ModuleKey } from '@/types';

export function GateScreen(): React.ReactElement {
  const { gate } = useApp();
  const insets = useSafeAreaInsets();
  useScreenBars(colors.appBar, { navigationBar: colors.appBar });
  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <View style={{ height: insets.top, backgroundColor: colors.appBar }} />
      {gate === 'module' ? <Progress step={1} /> : null}
      {gate === 'location' ? <LocationStep /> : null}
      {gate === 'module' ? <ModuleStep /> : null}
      {gate === 'login' ? <LoginStep /> : null}
    </SafeAreaView>
  );
}

function Progress({ step }: { step: number }): React.ReactElement {
  const labels = ['Location', 'Module', 'Login'];
  return (
    <View style={styles.progress}>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step ? styles.dotActive : null, { marginLeft: i === 0 ? 0 : 6 }]} />
        ))}
      </View>
      <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 10 }}>
        Step {step + 1} of 3 · {labels[step]}
      </Text>
    </View>
  );
}

function Shell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.shell} keyboardShouldPersistTaps="handled">
      <View style={styles.brandRow}>
        <SmartImage source={{ kind: 'asset', source: Images.logo }} placeholderIcon="sparkles" style={styles.logo} />
        <View>
          <Text variant="h2" weight="extrabold" color={colors.text}>
            Aurasure
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Food &amp; shopping, one app
          </Text>
        </View>
      </View>
      {children}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ step 1 */

// Default map view roughly covering serviceable area (Indore region).
const DEFAULT_REGION = {
  latitude: 22.7196,
  longitude: 75.8577,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function LocationStep(): React.ReactElement {
  const { setLocation, setLocationStatus } = useApp();
  const [mode, setMode] = useState<'intro' | 'map'>('intro');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const applyDetection = (res: PlaceResult): void => {
    if (res.ok) {
      setLocation(res.city);
      return;
    }
    setError(res.denied ? 'Location permission was denied. Try picking the location from map.' : 'Could not read your location. Pick it from the map.');
    setMode('map');
  };

  // The gate only needs to ask when location is OFF. If the device already
  // has location on, pick the city automatically and skip straight to the
  // module picker - no tap needed.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return; // permission off -> show the gate
        setBusy(true);
        setError(null);
        setLocationStatus('loading');
        const res = await detectCity();
        setBusy(false);
        applyDetection(res);
      } catch {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrent = async (): Promise<void> => {
    haptic.light();
    setBusy(true);
    setError(null);
    setLocationStatus('loading');
    const res = await detectCity();
    setBusy(false);
    applyDetection(res);
  };

  if (mode === 'map') {
    return (
      <MapPickStep
        onBack={() => {
          setMode('intro');
          setError(null);
        }}
        onPick={(city) => setLocation(city)}
        error={error}
      />
    );
  }

  return (
    <View style={styles.locationRoot}>
      <View style={styles.locationHeader}>
        <View style={styles.locationHeaderSide} />
        <Text variant="title" weight="bold" color={colors.text}>
          Set Location
        </Text>
        <View style={styles.locationHeaderSide} />
      </View>

      <ScrollView contentContainerStyle={styles.locationContent} showsVerticalScrollIndicator={false}>
        <View style={styles.locationIllustration}>
          <View style={styles.locationIllustrationLeaf1} />
          <View style={styles.locationIllustrationLeaf2} />
          <View style={styles.locationPhone}>
            <View style={styles.locationPhoneTop} />
            <View style={styles.locationPhoneScreen}>
              <Icon name="mapPin" size={30} color="#22BBA0" />
              <View style={styles.locationPhoneLine} />
              <View style={styles.locationPhoneLine} />
              <View style={styles.locationPhoneLine} />
            </View>
          </View>
          <Icon name="user" size={30} color="#5B3A7E" style={{ position: 'absolute', right: 76, bottom: 40, zIndex: 3 }} />
        </View>

        <Text variant="h2" weight="extrabold" color={colors.text} style={styles.locationHeadline}>
          FIND STORES AND ITEMS NEAR YOU
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.locationSub}>
          By allowing location access, you can search for stores and items near you and receive more accurate delivery.
        </Text>

        {error ? <ErrorNote text={error} /> : null}

        {/* Primary CTA is wide, secondary is narrower. Use Current Location is
            full width; Set From Map is intentionally narrower and centered. */}
        <View style={styles.locationActions}>
          <Button
            title={busy ? 'Detecting location…' : 'Use Current Location'}
            variant="login"
            leftIcon="locate"
            fullWidth
            size="lg"
            loading={busy}
            onPress={() => void useCurrent()}
          />
          <View style={styles.locationMapWrap}>
            <Button
              title="Set From Map"
              variant="secondary"
              leftIcon="mapPinned"
              fullWidth
              size="lg"
              onPress={() => {
                haptic.light();
                setError(null);
                setMode('map');
              }}
              style={styles.locationMapBtn}
            />
          </View>
        </View>

        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 22 }}>
          We only use your location to show serviceable stores near you.
        </Text>
      </ScrollView>
    </View>
  );
}

function MapPickStep({
  onBack,
  onPick,
  error,
}: {
  onBack: () => void;
  onPick: (city: string) => void;
  error: string | null;
}): React.ReactElement {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  const suggestions = query && !picked ? POPULAR_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

  const useThis = (): void => {
    if (!picked) return;
    haptic.success();
    onPick(picked);
  };

  const animateTo = (r: Region): void => {
    mapRef.current?.animateToRegion(r, 350);
  };

  // Search actually works: picking a suggestion (or hitting enter) moves the
  // map + marker to that city's centre, not just fills the input.
  const pickCity = (city: string): void => {
    haptic.selection();
    setQuery(city);
    setPicked(city);
    const coords = CITY_COORDS[city];
    if (coords) {
      const next: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
      setRegion(next);
      animateTo(next);
    }
  };

  const zoomIn = (): void => {
    haptic.light();
    animateTo({ ...region, latitudeDelta: Math.max(region.latitudeDelta / 2, 0.002), longitudeDelta: Math.max(region.longitudeDelta / 2, 0.002) });
  };

  const zoomOut = (): void => {
    haptic.light();
    animateTo({ ...region, latitudeDelta: Math.min(region.latitudeDelta * 2, 60), longitudeDelta: Math.min(region.longitudeDelta * 2, 60) });
  };

  const goToMyLocation = async (): Promise<void> => {
    haptic.light();
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        haptic.error();
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(r);
      animateTo(r);
    } catch {
      haptic.error();
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.mapScreen}>
      <View style={styles.mapTop}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.mapBack}>
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.mapSearch}>
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setPicked(null);
            }}
            placeholder="Search Location"
            placeholderTextColor={colors.textTertiary}
            style={styles.mapSearchInput}
            autoCorrect={false}
            returnKeyType="search"
            // Enter picks the first match directly.
            onSubmitEditing={() => {
              const first = suggestions[0];
              if (first) pickCity(first);
            }}
          />
          <Pressable
            onPress={() => {
              const first = suggestions[0];
              if (first) pickCity(first);
            }}
            hitSlop={8}
          >
            <Icon name="search" size={22} color="#9C005E" />
          </Pressable>
        </View>
        <View style={styles.mapBack} />
      </View>

      {/* Real interactive map. The sides keep a 4px gutter (mapArea padding),
          and the whole map fills the sheet above the bottom CTA. */}
      <MapView
        ref={mapRef}
        style={styles.mapArea}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={(r) => setRegion(r)}
        onMapReady={() => mapRef.current?.animateToRegion(DEFAULT_REGION, 0)}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} pinColor="#A4006B" />
      </MapView>

      <View style={styles.mapControls}>
        <Pressable style={styles.mapControlBtn} hitSlop={6} onPress={goToMyLocation} disabled={locating}>
          <Icon name="locate" size={24} color="#9C005E" />
        </Pressable>
        <View style={styles.mapZoomBox}>
          <Pressable style={styles.mapZoomBtn} hitSlop={6} onPress={zoomIn}>
            <Icon name="plus" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.mapZoomDivider} />
          <Pressable style={styles.mapZoomBtn} hitSlop={6} onPress={zoomOut}>
            <Icon name="minus" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.mapSuggestions}>
          {suggestions.map((c) => (
            <Pressable
              key={c}
              onPress={() => pickCity(c)}
              style={({ pressed }) => [styles.mapSuggestion, { opacity: pressed ? 0.86 : 1 }]}
            >
              <Icon name="mapPin" size={18} color="#9C005E" />
              <Text variant="subtitle" weight="semibold" color={colors.text} style={{ marginLeft: 10, flex: 1 }}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.mapSheet}>
        <View style={styles.mapSheetHandle} />
        <View style={styles.mapHintRow}>
          <View style={styles.mapHintDot} />
          <Text variant="subtitle" color={colors.textSecondary} style={{ marginLeft: 10 }}>
            Move the map to pick location
          </Text>
        </View>
        {error ? <ErrorNote text={error} /> : null}
        <Button
          title={picked ? `Use ${picked}` : 'Service not available in this area'}
          variant="login"
          leftIcon={picked ? 'mapPin' : 'mapPinned'}
          fullWidth
          size="lg"
          disabled={!picked}
          style={{ marginTop: 16 }}
          onPress={useThis}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ step 2 */

const MODULE_OPTIONS: { key: ModuleKey; label: string; icon: IconName; gradient: [string, string] }[] = [
  { key: 'food', label: 'Food', icon: 'utensils', gradient: ['#A4006B', '#F5D9E9'] },
  { key: 'shop', label: 'Pharmacy', icon: 'pill', gradient: ['#9C005E', '#F4D7E7'] },
  { key: 'shop', label: 'Ecommerce', icon: 'cart', gradient: ['#990559', '#F2D5E3'] },
  { key: 'shop', label: 'Parcel', icon: 'package', gradient: ['#960058', '#F4D7E7'] },
  { key: 'shop', label: 'Cosmetic', icon: 'gem', gradient: ['#920355', '#F2D5E3'] },
  { key: 'shop', label: 'Flower', icon: 'leaf', gradient: ['#8F0054', '#F5D9E9'] },
  { key: 'shop', label: 'AuraGo', icon: 'zap', gradient: ['#8C0052', '#F4D7E7'] },
];

function ModuleStep(): React.ReactElement {
  const { setModule, city } = useApp();
  return (
    <View style={styles.moduleRoot}>
      <ScrollView style={styles.moduleScrollView} contentContainerStyle={styles.moduleScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.moduleTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.moduleTitleRow}>
              <Text variant="display" weight="extrabold" color={colors.text}>
                20 minutes
              </Text>
              <Icon name="bell" size={24} color={colors.text} style={{ marginLeft: 12 }} />
            </View>
            <Pressable style={styles.moduleAddressRow}>
              <Text variant="bodySm" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {city ? `${city}, Madhya Pradesh 4756...` : '3RX8+32C, Hetampura, Madhya Pradesh 4756...'}
              </Text>
              <Icon name="chevronDown" size={18} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        </View>

        <View style={styles.moduleGrid}>
          {MODULE_OPTIONS.map((m, i) => (
            <Pressable
              key={`${m.label}-${i}`}
              onPress={() => {
                haptic.light();
                setModule(m.key);
              }}
              style={({ pressed }) => [styles.moduleTileWrap, { opacity: pressed ? 0.92 : 1 }]}
            >
              <LinearGradient colors={m.gradient} start={{ x: 0.4, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.moduleTile}>
                {/* Module glyph, not the logo image - the logo carries its own
                    background and would look boxed on the gradient tiles. */}
                <Icon name={m.icon} size={40} color="#7B004A" filled style={{ marginBottom: 14 }} />
                <Text variant="h3" weight="bold" color="#42001F">
                  {m.label}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ step 3 */

const LOGIN_TABS = [
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
] as const;

type LoginTab = (typeof LOGIN_TABS)[number]['key'];

function LoginStep(): React.ReactElement {
  const { login, back } = useApp();
  const [tab, setTab] = useState<LoginTab>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validPhone = /^[6-9]\d{9}$/.test(phone);
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async (): Promise<void> => {
    setError(null);
    // Phone login has no password: after a valid number, straight to OTP.
    if (tab === 'phone') {
      if (!validPhone) {
        haptic.error();
        setError('Enter a valid 10-digit Indian mobile number.');
        return;
      }
      // Simulated OTP dispatch so the button visibly works before the OTP step.
      setBusy(true);
      await new Promise((r) => setTimeout(r, 750));
      haptic.success();
      setBusy(false);
      setOtpFor(`+91 ${phone}`);
      return;
    }
    if (!validEmail) {
      haptic.error();
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      haptic.error();
      setError('Please enter your password.');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    haptic.success();
    login(email.trim());
  };

  if (otpFor) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled>
        <OtpStep
          phone={otpFor}
          onBack={() => {
            setOtpFor(null);
            setError(null);
          }}
          onVerify={() => login(otpFor)}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled>
      <ScrollView contentContainerStyle={styles.loginShell} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.loginCentered}>
          <Pressable onPress={back} style={styles.backBtn} hitSlop={10}>
            <Icon name="arrowLeft" size={24} color={colors.text} />
          </Pressable>

          <SmartImage source={{ kind: 'asset', source: Images.logo }} contentFit="contain" style={styles.loginLogo} />
          <Text variant="h1" weight="extrabold" color={colors.text} style={styles.loginTitle}>
            Hey there! welcome back!
          </Text>

          <View style={styles.tabs}>
            {LOGIN_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setTab(t.key);
                    setError(null);
                  }}
                  style={[styles.tab, active ? styles.tabActive : null]}
                >
                  <Text variant="subtitle" weight="semibold" color={active ? colors.white : colors.textSecondary}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'phone' ? (
            <LoginField
              icon="phone"
              prefix="+91"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="Phone"
              keyboardType="number-pad"
              maxLength={10}
            />
          ) : (
            <LoginField
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {/* Password + remember/forgot only apply to email login. Phone login
              has no password — after a valid number it goes straight to OTP. */}
          {tab === 'email' ? (
            <>
              <LoginField
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry={!showPassword}
                rightIcon="eye"
                onRightPress={() => setShowPassword((v) => !v)}
                style={{ marginTop: 12 }}
              />
              <View style={styles.rowBetween}>
                <Pressable style={styles.rememberRow} onPress={() => setRemember((v) => !v)} hitSlop={8}>
                  <View style={[styles.checkbox, remember ? styles.checkboxActive : null]}>
                    {remember ? <Icon name="check" size={14} color={colors.white} /> : null}
                  </View>
                  <Text variant="subtitle" color={colors.textSecondary}>
                    Remember me?
                  </Text>
                </Pressable>
                <Pressable onPress={() => setError('Password reset link would be sent to your account.')}>
                  <Text variant="subtitle" color={colors.brand[700]} weight="semibold">
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {error ? <ErrorNote text={error} /> : null}
          <View style={styles.loginActions}>
            <Button
              title={tab === 'phone' ? 'Continue' : 'Login'}
              variant="login"
              leftIcon="login"
              fullWidth
              size="lg"
              loading={busy}
              onPress={submit}
              style={{ marginTop: 18, height: 58 }}
            />
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text variant="caption" color={colors.textTertiary} style={styles.orText}>
              Or
            </Text>
            <View style={styles.orLine} />
          </View>

          <Pressable onPress={() => setError('Sign up flow will be added later.')} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text variant="subtitle" color={colors.textSecondary}>
              Don't have account?{' '}
              <Text variant="subtitle" color={colors.brand[700]} weight="bold">
                Sign Up
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OtpStep({ phone, onBack, onVerify }: { phone: string; onBack: () => void; onVerify: () => void }): React.ReactElement {
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async (): Promise<void> => {
    if (otp.length !== 6) return;
    setBusy(true);
    setError(null);
    // Short simulated verification round-trip before the session starts.
    await new Promise((r) => setTimeout(r, 800));
    haptic.success();
    onVerify();
  };

  // The slot that currently owns the caret (next digit to type), or the last
  // one once full. Tapping any slot brings focus (keyboard) back to the input.
  const caretIndex = Math.min(otp.length, 5);

  const focusInput = (): void => inputRef.current?.focus();

  return (
    <View style={styles.otpScreen}>
      <View style={styles.otpHeader}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.otpBack}>
          <Icon name="arrowLeft" size={24} color={colors.text} />
        </Pressable>
        <Text variant="h3" weight="bold" color={colors.text}>
          Phone Verification
        </Text>
        <View style={styles.otpHeaderSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.otpContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.otpIllustration}>
          <Icon name="smartphone" size={70} color="#B0267A" />
          <View style={styles.otpLockBadge}>
            <Icon name="lock" size={18} color={colors.white} />
          </View>
        </View>

        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 30 }}>
          We've sent a verification code to
        </Text>
        <Text variant="h3" weight="bold" color={colors.text} style={{ textAlign: 'center', marginTop: 5 }}>
          {phone}
        </Text>

        <View style={styles.otpSlotsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Pressable
              key={i}
              onPress={focusInput}
              style={({ pressed }) => [
                styles.otpSlot,
                otp.length > i ? styles.otpSlotActive : null,
                i === caretIndex ? styles.otpSlotCaret : null,
                { opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text variant="h3" weight="bold" color={colors.text}>
                {otp[i] ?? ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(t) => {
            setError(null);
            setOtp(t.replace(/\D/g, '').slice(0, 6));
          }}
          keyboardType="number-pad"
          autoFocus
          maxLength={6}
          style={styles.hiddenOtp}
        />

        {error ? <ErrorNote text={error} /> : null}
        <View style={styles.otpActions}>
          <Button title="Verify" variant="login" fullWidth size="lg" loading={busy} onPress={verify} disabled={otp.length !== 6} style={{ marginTop: 36 }} />
        </View>

        <View style={styles.otpResendRow}>
          <Text variant="subtitle" color={colors.textSecondary}>
            Didn't receive the code?
          </Text>
          <Pressable
            onPress={() => {
              if (seconds > 0) return;
              setSeconds(60);
              setOtp('');
              setError(null);
            }}
            hitSlop={8}
          >
            <Text variant="subtitle" color={seconds > 0 ? colors.textTertiary : '#A4006B'} weight={seconds > 0 ? 'medium' : 'bold'}>
              Resent it{seconds > 0 ? ` (${seconds}s)` : ''}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

interface LoginFieldProps {
  icon: IconName;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  prefix?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  rightIcon?: IconName;
  onRightPress?: () => void;
  style?: ViewStyle;
}

function LoginField({
  icon,
  value,
  onChangeText,
  placeholder,
  prefix,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  maxLength,
  rightIcon,
  onRightPress,
  style,
}: LoginFieldProps): React.ReactElement {
  return (
    <View style={[styles.loginField, style]}>
      <Icon name={icon} size={20} color={colors.textSecondary} style={styles.loginFieldIcon} />
      {prefix ? (
        <Text variant="subtitle" weight="semibold" color={colors.text} style={styles.prefixText}>
          {prefix}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.loginInput}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
      />
      {rightIcon ? (
        <Pressable onPress={onRightPress} hitSlop={10} style={styles.rightIconBtn}>
          <Icon name={rightIcon} size={20} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Title({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }): React.ReactElement {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={styles.titleIcon}>
        <Icon name={icon} size={22} color={colors.brand[600]} filled />
      </View>
      <Text variant="h1" weight="extrabold" color={colors.text} style={{ marginTop: 12 }}>
        {title}
      </Text>
      <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 20 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function ErrorNote({ text }: { text: string }): React.ReactElement {
  return (
    <View style={styles.errorRow}>
      <Icon name="circleAlert" size={14} color={colors.danger} />
      <Text variant="caption" color={colors.danger} style={{ marginLeft: 6, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: spacing.md, paddingBottom: spacing.xs },
  dot: { width: 22, height: 4, borderRadius: radius.xs, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand[600] },
  shell: { paddingHorizontal: 6, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl },
  logo: { width: 44, height: 44, borderRadius: radius.md, marginRight: 12 },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Keeps the real keyboard attached while the boxes above show the digits.
  hiddenOtp: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },

  // -- login page --
  loginShell: { flexGrow: 1, paddingHorizontal: 6, paddingBottom: 40 },
  loginCentered: { flex: 1, paddingTop: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  loginLogo: {
    width: '100%',
    maxWidth: 230,
    height: 92,
    alignSelf: 'center',
    marginTop: 22,
  },
  loginTitle: { textAlign: 'center', marginTop: 14, fontSize: 23 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: 26,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.brand[600] },
  loginField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 55,
    paddingHorizontal: 14,
    marginTop: 16,
    overflow: 'hidden',
  },
  loginFieldIcon: { marginRight: 10 },
  prefixText: { marginRight: 8 },
  loginInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 14 },
  rightIconBtn: { paddingLeft: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  // Login submit button: full width of the 6px-gutter content column.
  loginActions: {
    alignItems: 'stretch',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: { borderColor: colors.brand[600], backgroundColor: colors.brand[600] },
  orRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { marginHorizontal: 12 },

  // -- module picker --
  moduleRoot: { flex: 1, backgroundColor: colors.background },
  moduleScrollView: { flex: 1 },
  moduleScroll: { flexGrow: 1, paddingHorizontal: 6, paddingTop: 22, paddingBottom: 28 },
  moduleTop: { flexDirection: 'row', alignItems: 'center' },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduleAddressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 34,
  },
  moduleTileWrap: {
    width: '31.5%',
    marginBottom: 16,
  },
  moduleTile: {
    height: 142,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  // -- otp screen --
  otpScreen: { flex: 1, backgroundColor: colors.background },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  otpBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  otpHeaderSpacer: { width: 36 },
  otpContent: { flexGrow: 1, paddingHorizontal: 6, paddingBottom: 30 },
  otpIllustration: { width: 104, height: 104, borderRadius: 28, backgroundColor: '#E9B7D6', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 44 },
  otpLockBadge: {
    position: 'absolute',
    right: 12,
    bottom: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#A4006B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 },
  otpSlot: {
    width: 50,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D9D3DA',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotActive: { borderColor: '#A4006B', borderWidth: 2 },
  // The slot that currently owns the caret (next digit to type).
  otpSlotCaret: { borderColor: '#C88BB4', borderWidth: 2, backgroundColor: '#FBF2F8' },
  otpResendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  // Verify button spans the full 6px-gutter content column.
  otpActions: {
    alignItems: 'stretch',
  },

  // -- location intro --
  locationRoot: { flex: 1, backgroundColor: colors.surface },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  locationHeaderSide: { width: 36, height: 36 },
  locationContent: { flexGrow: 1, paddingHorizontal: 6, paddingBottom: 34 },
  locationIllustration: {
    width: 210,
    height: 190,
    alignSelf: 'center',
    marginTop: 40,
    position: 'relative',
  },
  locationIllustrationLeaf1: {
    position: 'absolute',
    width: 46,
    height: 130,
    borderRadius: 23,
    backgroundColor: '#DDEBE4',
    left: 12,
    top: 10,
    transform: [{ rotate: '-28deg' }],
  },
  locationIllustrationLeaf2: {
    position: 'absolute',
    width: 40,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#C4D8CF',
    right: 10,
    top: 20,
    transform: [{ rotate: '24deg' }],
  },
  locationPhone: {
    position: 'absolute',
    left: 58,
    top: 0,
    width: 104,
    height: 154,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#10111D',
    backgroundColor: '#F8FAFB',
    zIndex: 2,
    overflow: 'hidden',
  },
  locationPhoneTop: { height: 8, alignSelf: 'center', width: 46, borderRadius: 8, backgroundColor: '#10111D', marginTop: 4 },
  locationPhoneScreen: { flex: 1, margin: 7, borderRadius: 12, backgroundColor: '#BCE7DD', alignItems: 'center', paddingTop: 10 },
  locationPhoneLine: { height: 3, borderRadius: 2, backgroundColor: '#8CCDBF', width: 58, marginTop: 8 },
  locationHeadline: { textAlign: 'center', marginTop: 30, fontSize: 19, lineHeight: 25, letterSpacing: -0.1 },
  locationSub: { textAlign: 'center', marginTop: 12, lineHeight: 21 },
  // The primary "Use Current Location" CTA spans the full 6px-gutter column,
  // wider than the narrower Set From Map button below it.
  locationActions: {
    marginTop: 26,
    alignItems: 'stretch',
  },
  // Narrow wrapper that constrains Set From Map to a smaller width and centers
  // it below the wide Use Current Location button.
  locationMapWrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 10,
  },
  locationMapBtn: {
    width: '100%',
  },

  // -- map picker --
  mapScreen: { flex: 1, backgroundColor: '#C5C8CF' },
  mapTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mapBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mapSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E5EC',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 44,
    // Fill width between the back button and the screen edge.
    marginHorizontal: 6,
  },
  mapSearchInput: { flex: 1, fontSize: 15, color: colors.text },
  // Real map fills the screen with the 6px screen gutter.
  mapArea: {
    flex: 1,
    backgroundColor: '#C5C8CF',
    marginHorizontal: 6,
  },
  mapControls: {
    position: 'absolute',
    right: 18,
    top: '42%',
    zIndex: 6,
    alignItems: 'center',
  },
  mapControlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  mapZoomBox: {
    width: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  mapZoomBtn: { height: 50, alignItems: 'center', justifyContent: 'center' },
  mapZoomDivider: { height: 1, backgroundColor: colors.border },
  mapSuggestions: {
    position: 'absolute',
    top: 4,
    left: 18,
    right: 18,
    zIndex: 7,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 6,
  },
  mapSuggestion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EAF0' },
  mapSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 26,
  },
  mapSheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#D9D3DA', alignSelf: 'center', marginBottom: 18 },
  mapHintRow: { flexDirection: 'row', alignItems: 'center' },
  mapHintDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C9CCD3' },
});
