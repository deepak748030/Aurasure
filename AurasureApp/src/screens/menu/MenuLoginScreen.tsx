import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import { useApp } from '@/context/AppContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MenuStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MenuStackParamList, 'Login'>;

export function MenuLoginScreen({ navigation }: Props): React.ReactElement {
  useScreenBars(colors.appBar, { navigationBar: colors.appBar });
  const { login } = useApp();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const otpInput = useRef<TextInput>(null);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  useEffect(() => {
    if (step !== 'otp' || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, seconds]);

  const sendOtp = (): void => {
    if (!validPhone) {
      haptic.error();
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    haptic.success();
    setError(null);
    setStep('otp');
    setSeconds(60);
  };

  const verify = (): void => {
    if (otp.length !== 6) {
      haptic.error();
      setError('Enter the 6-digit code.');
      return;
    }
    haptic.success();
    login(`+91 ${phone}`, 'Aurasure User');
    navigation.goBack();
  };

  const resend = (): void => {
    if (seconds > 0) return;
    setOtp('');
    setError(null);
    setSeconds(60);
    haptic.light();
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <BackButton onPress={() => navigation.goBack()} />
            <Text variant="h3" weight="bold" color={colors.text}>
              {step === 'phone' ? 'Sign in' : 'Verify OTP'}
            </Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Icon name="login" size={28} color="#9C005E" />
            </View>
            <Text variant="h1" weight="extrabold" color={colors.text} style={styles.title}>
              {step === 'phone' ? 'Welcome back!' : `Code sent to +91 ${phone}`}
            </Text>
            <Text variant="body" color={colors.textSecondary} style={styles.sub}>
              {step === 'phone'
                ? 'Sign in with your mobile number to continue.'
                : 'Enter the 6-digit verification code to continue.'}
            </Text>
          </View>

          {step === 'phone' ? (
            <>
              <View style={styles.field}>
                <Icon name="phone" size={20} color={colors.textSecondary} />
                <Text variant="subtitle" weight="semibold" color={colors.text} style={{ marginLeft: 10 }}>
                  +91
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t.replace(/\D/g, '').slice(0, 10));
                    setError(null);
                  }}
                  placeholder="Mobile number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.input}
                  autoFocus
                />
              </View>

              {error ? <ErrorNote text={error} /> : null}
              <Button title="Get OTP" variant="login" fullWidth size="lg" onPress={sendOtp} style={{ marginTop: 18 }} />
            </>
          ) : (
            <>
              <View style={styles.otpRow}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[styles.otpSlot, otp.length > i ? styles.otpSlotActive : null]}>
                    <Text variant="h3" weight="bold" color={colors.text}>
                      {otp[i] ?? ''}
                    </Text>
                  </View>
                ))}
              </View>
              <TextInput
                ref={otpInput}
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
              <Button title="Verify & Sign in" variant="login" fullWidth size="lg" onPress={verify} disabled={otp.length !== 6} style={{ marginTop: 18 }} />

              <Pressable onPress={resend} style={{ marginTop: 18, alignItems: 'center' }}>
                <Text variant="subtitle" color={seconds > 0 ? colors.textTertiary : '#A4006B'} weight={seconds > 0 ? 'medium' : 'bold'}>
                  Resend code{seconds > 0 ? ` in 0:${String(seconds).padStart(2, '0')}` : ''}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  scroll: { flexGrow: 1, paddingHorizontal: 6, paddingBottom: 40 },
  hero: { marginTop: 26, alignItems: 'center' },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F4D5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, marginTop: 16, textAlign: 'center' },
  sub: { marginTop: 8, textAlign: 'center', lineHeight: 21 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 56,
    paddingHorizontal: 16,
    marginTop: 30,
  },
  input: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: 14, marginLeft: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  otpSlot: {
    width: 50,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D9D3DA',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotActive: { borderColor: '#A4006B', borderWidth: 2 },
  hiddenOtp: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
