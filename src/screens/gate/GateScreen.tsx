import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SmartImage } from '../../components/ui/SmartImage';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { detectCity, POPULAR_CITIES } from '@/lib/location';
import { Images } from '@/assets';
import { useApp } from '@/context/AppContext';
import type { IconName, ModuleKey } from '@/types';

/** Universal fallback so the flow is testable without reading the demo code. */
const MASTER_OTP = '123456';

export function GateScreen(): React.ReactElement {
  const { gate } = useApp();
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <Progress step={gate === 'location' ? 0 : gate === 'module' ? 1 : 2} />
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

function LocationStep(): React.ReactElement {
  const { setLocation, setLocationStatus } = useApp();
  const [mode, setMode] = useState<'ask' | 'manual'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (): Promise<void> => {
    haptic.light();
    setBusy(true);
    setError(null);
    setLocationStatus('loading');
    const res = await detectCity();
    setBusy(false);
    if (res.ok) {
      setLocation(res.city);
      return;
    }
    setError(res.denied ? 'Location permission was denied. Pick your city below.' : 'Could not read your location. Pick your city below.');
    setMode('manual');
  };

  if (mode === 'manual') {
    return (
      <Shell>
        <Title icon="mapPin" title="Where should we deliver?" subtitle="You can change this anytime from the Menu tab." />
        <View style={styles.cityGrid}>
          {POPULAR_CITIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                haptic.selection();
                setLocation(c);
              }}
              style={({ pressed }) => [styles.cityChip, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text variant="subtitle" weight="semibold" color={colors.text}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>
      </Shell>
    );
  }

  return (
    <Shell>
      <Title
        icon="locate"
        title="Turn on location"
        subtitle="Aurasure uses your location to show nearby restaurants, live delivery times and serviceable products. We never store it."
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 10 }}>
          {error}
        </Text>
      ) : null}
      <Button
        title={busy ? 'Locating…' : 'Use my location'}
        leftIcon="locate"
        fullWidth
        onPress={() => {
          void ask();
        }}
        loading={busy}
        style={{ marginTop: 18 }}
      />
      <Button title="Choose city manually" variant="ghost" leftIcon="list" fullWidth style={{ marginTop: 8 }} onPress={() => setMode('manual')} />
      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 18 }}>
        By continuing you agree to our Terms &amp; Privacy Policy.
      </Text>
    </Shell>
  );
}

/* ------------------------------------------------------------------ step 2 */

const MODULE_CARDS: { key: ModuleKey; icon: IconName; title: string; sub: string; tint: string; accent: string }[] = [
  { key: 'food', icon: 'utensils', title: 'Food delivery', sub: 'Restaurants, live order tracking, 20-min drops', tint: colors.food[50], accent: colors.food[600] },
  { key: 'shop', icon: 'bag', title: 'E-commerce', sub: 'Electronics, fashion, home — shipped to you', tint: colors.brand[50], accent: colors.brand[600] },
];

function ModuleStep(): React.ReactElement {
  const { setModule, city } = useApp();
  return (
    <Shell>
      <Title icon="apps" title="What do you want first?" subtitle={`Delivering to ${city || 'your city'}. You can switch anytime from the Menu tab.`} />
      {MODULE_CARDS.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => {
            haptic.light();
            setModule(c.key);
          }}
          style={({ pressed }) => [styles.moduleCard, { opacity: pressed ? 0.94 : 1 }]}
        >
          <View style={[styles.moduleIcon, { backgroundColor: c.tint }]}>
            <Icon name={c.icon} size={26} color={c.accent} filled />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3" weight="bold" color={colors.text}>
              {c.title}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {c.sub}
            </Text>
          </View>
          <Icon name="chevronRight" size={20} color={colors.textTertiary} />
        </Pressable>
      ))}
    </Shell>
  );
}

/* ------------------------------------------------------------------ step 3 */

function LoginStep(): React.ReactElement {
  const { login, module, city } = useApp();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const send = (): void => {
    if (!validPhone) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    haptic.success();
    setError(null);
    setSent(String(Math.floor(100000 + Math.random() * 900000)));
    setSeconds(30);
    setTimeout(() => otpRef.current?.focus(), 60);
  };

  const verify = (): void => {
    if (otp !== (sent ?? MASTER_OTP)) {
      haptic.error();
      setError('That OTP does not match. Check the code and try again.');
      return;
    }
    haptic.success();
    login(`+91 ${phone}`, name.trim() || undefined);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled>
      <Shell>
        <Title
          icon="phone"
          title={sent ? 'Enter the OTP' : 'Login with your mobile number'}
          subtitle={sent ? `Code sent to +91 ${phone}. ${module === 'food' ? 'Food' : 'Shopping'} orders go to ${city || 'your city'}.` : 'We will text you a 6-digit code. No password needed.'}
        />

        {!sent ? (
          <>
            <View style={styles.field}>
              <View style={styles.prefix}>
                <Text variant="subtitle" weight="bold" color={colors.text}>
                  🇮🇳
                </Text>
                <Text variant="subtitle" weight="bold" color={colors.text}>
                  {' +91'}
                </Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setError(null);
                  setPhone(t.replace(/\D/g, '').slice(0, 10));
                }}
                keyboardType="number-pad"
                placeholder="98765 43210"
                placeholderTextColor={colors.textTertiary}
                style={styles.phoneInput}
                maxLength={10}
              />
            </View>
            <View style={[styles.field, { marginTop: 10 }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.textTertiary}
                style={[styles.phoneInput, { paddingLeft: 14 }]}
                maxLength={28}
              />
            </View>
            {error ? <ErrorNote text={error} /> : null}
            <Button title="Send OTP" leftIcon="send" fullWidth onPress={send} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <View style={styles.otpRow}>
              {OTP_SLOTS.map((i) => (
                <View key={i} style={[styles.otpBox, otp.length > i ? styles.otpBoxActive : null]}>
                  <Text variant="h3" weight="bold" color={colors.text}>
                    {otp[i] ?? ''}
                  </Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={otpRef}
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
            <Card variant="alt" style={{ marginTop: 14 }}>
              <Text variant="caption" color={colors.textSecondary}>
                Demo build — no SMS is actually sent. Your OTP is{' '}
                <Text variant="caption" weight="bold" color={colors.text}>
                  {sent}
                </Text>{' '}
                (or use {MASTER_OTP}).
              </Text>
            </Card>
            {error ? <ErrorNote text={error} /> : null}
            <Button title="Verify & continue" leftIcon="shield" fullWidth onPress={verify} style={{ marginTop: 16 }} disabled={otp.length !== 6} />
            <Pressable
              onPress={() => {
                if (seconds > 0) return;
                setSent(String(Math.floor(100000 + Math.random() * 900000)));
                setOtp('');
                setSeconds(30);
              }}
              style={{ marginTop: 14, alignItems: 'center' }}
            >
              <Text variant="caption" color={seconds > 0 ? colors.textTertiary : colors.brand[700]} weight="semibold">
                {seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}
              </Text>
            </Pressable>
            <Pressable onPress={() => { setSent(null); setOtp(''); setError(null); }} style={{ marginTop: 8, alignItems: 'center' }}>
              <Text variant="caption" color={colors.textSecondary}>
                Change number
              </Text>
            </Pressable>
          </>
        )}
      </Shell>
    </KeyboardAvoidingView>
  );
}

const OTP_SLOTS = [0, 1, 2, 3, 4, 5];

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
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  dot: { width: 22, height: 4, borderRadius: radius.xs, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand[600] },
  shell: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
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
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  moduleIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  cityChip: {
    width: '48%',
    flexGrow: 0,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    marginRight: '4%',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
    marginTop: spacing.lg,
    paddingRight: 12,
    overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceAlt,
    marginRight: 10,
  },
  phoneInput: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: 12 },
  otpRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  // Keeps the real keyboard attached while the boxes above show the digits.
  hiddenOtp: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
});
