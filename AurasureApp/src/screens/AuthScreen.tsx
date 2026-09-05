import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, BRAND } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { ApiError } from '@/api/client';
import { haptic } from '@/lib/haptics';

/**
 * Login / register in one screen (the reference app uses `login_view.dart` +
 * `registration_view.dart`). Every failure — including the server's
 * `USE_VENDOR_APP` / `USE_DELIVERY_APP` guards — is reported in the bottom
 * sheet, never an alert.
 */
export function AuthScreen({
  navigation,
  route,
}: {
  navigation: { goBack: () => void; navigate: (name: string) => void; replace: (name: string) => void };
  route: { params?: { mode?: 'login' | 'register' } };
}): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { login, register } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>(route.params?.mode ?? 'login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isLogin = mode === 'login';

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!isLogin && name.trim().length < 3) next.name = 'Enter your full name (min 3 characters)';
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) next.phone = 'Enter a valid 10-digit mobile number';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!isLogin && email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'That email address looks incomplete';
    if (!isLogin && confirm !== password) next.confirm = 'Passwords do not match';
    if (!isLogin && !terms) next.terms = 'Please accept the terms to continue';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (): Promise<void> => {
    if (!validate()) return;
    setBusy(true);
    try {
      if (isLogin) await login(phone.replace(/\D/g, ''), password);
      else await register({ name: name.trim(), phone: phone.replace(/\D/g, ''), password, ...(email.trim() ? { email: email.trim() } : {}) });
      haptic.success();
      sheet.success(isLogin ? 'Welcome back' : 'Account created', isLogin ? 'You are signed in to Aurasure.' : 'Your wallet, loyalty points and coupons are ready.');
      navigation.goBack();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === 'USE_VENDOR_APP') {
        sheet.show({
          title: 'This is a store account',
          message: 'That phone number is registered as an Aurasure partner. Please open the Vendor app to sign in.',
          icon: 'store',
          tone: 'warning',
          dismissLabel: 'Close',
        });
      } else if (apiError?.code === 'USE_DELIVERY_APP') {
        sheet.show({
          title: 'This is a delivery account',
          message: 'That phone number belongs to a delivery partner. Use the Aurasure Rider app instead.',
          icon: 'bike',
          tone: 'warning',
          dismissLabel: 'Close',
        });
      } else {
        sheet.error(isLogin ? 'Could not sign you in' : 'Could not create the account', apiError?.message ?? 'Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding title={undefined} back>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <View style={styles.heroRow}>
            <Icon name={BRAND.icon} size={26} color={c.onPrimary} />
            <Text variant="h3" weight="bold" color={c.onPrimary}>
              {isLogin ? 'Sign in to Aurasure' : 'Create your account'}
            </Text>
          </View>
          <Text variant="bodySm" color={c.isDark ? 'rgba(34,3,15,0.72)' : 'rgba(255,255,255,0.86)'}>
            {isLogin ? 'Order from the stores around you in a few taps.' : 'One account for food, groceries, wallet and rewards.'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingTop: spacing.lg }}>
          {!isLogin ? (
            <Input label="Full name" value={name} onChangeText={setName} placeholder="Asha Verma" icon="userRound" error={errors.name} autoCapitalize="words" />
          ) : null}
          <Input
            label="Mobile number"
            value={phone}
            onChangeText={(value) => setPhone(value.replace(/[^\d]/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
            icon="phone"
            error={errors.phone}
            hint="Your one-time login and order updates use this number"
          />
          {!isLogin ? <Input label="Email (optional)" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" icon="mail" error={errors.email} autoCapitalize="none" /> : null}
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secure icon="lock" error={errors.password} />
          {!isLogin ? <Input label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Repeat password" secure icon="lockCheck" error={errors.confirm} /> : null}

          {!isLogin ? (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: terms }} onPress={() => setTerms((prev) => !prev)} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={[styles.checkbox, { borderColor: errors.terms ? c.danger : terms ? c.primary : c.border, backgroundColor: terms ? c.primary : 'transparent' }]}>
                {terms ? <Icon name="check" size={12} color={c.onPrimary} /> : null}
              </View>
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                I agree to Aurasure's terms of use, cancellation and refund policies.
              </Text>
            </Pressable>
          ) : null}

          <Button title={isLogin ? 'Sign in' : 'Create account'} size="lg" loading={busy} onPress={() => void submit()} style={{ alignSelf: 'stretch' }} iconRight="arrowRight" />

          {isLogin ? (
            <Button
              title="Use the demo customer"
              variant="secondary"
              icon="play"
              onPress={() => {
                setPhone(DEMO_CREDENTIALS.phone);
                setPassword(DEMO_CREDENTIALS.password);
                setErrors({});
              }}
              style={{ alignSelf: 'stretch' }}
            />
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm }}>
            <Text variant="bodySm" tone="muted">
              {isLogin ? 'New to Aurasure?' : 'Already have an account?'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptic.selection();
                setMode(isLogin ? 'register' : 'login');
                setErrors({});
              }}
              hitSlop={8}
            >
              <Text variant="bodySm" weight="semibold" color={c.primary}>
                {isLogin ? 'Create an account' : 'Sign in'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.note, { backgroundColor: c.surfaceHi }]}>
            <Icon name="shield" size={15} color={c.primary} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              Sessions last 7 days and are stored on this device only. Log out any time from the Menu tab.
            </Text>
          </View>
        </View>
        <View style={{ height: spacing.xxl }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: -4, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: 6, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: radius.xs, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: spacing.sm, borderRadius: radius.md },
});
