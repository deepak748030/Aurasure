import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/ui/BackButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Input } from '../../components/ui/Input';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import { useApp } from '@/context/AppContext';
import { useAppQuery } from '@/hooks/useAppQuery';
import { ApiError } from '@/api/client';
import {
  addAddressToServer,
  addWalletMoney,
  applyReferral,
  deleteAddressFromServer,
  fetchCoupons,
  fetchLoyalty,
  fetchMe,
  fetchReferral,
  fetchWallet,
  redeemLoyalty,
  submitPartnerApplication,
  updateProfile,
} from '@/api/account';
import { userProfile } from '../../data/mock';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Coupon, IconName, LoyaltyData, ReferralInfo, WalletData } from '@/types';
import type { MenuDetailKey, MenuStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MenuStackParamList, 'MenuDetail'>;

interface Meta {
  title: string;
  subtitle?: string;
  icon: IconName;
  tint: string;
  color: string;
  gradient: [string, string];
}

const META: Record<MenuDetailKey, Meta> = {
  editProfile: { title: 'Edit Profile', subtitle: 'Keep your details up to date', icon: 'user', tint: '#E4F1FC', color: '#2E87D6', gradient: ['#4A7BE0', '#2E87D6'] },
  myAddress: { title: 'My Address', subtitle: 'Manage delivery addresses', icon: 'mapPin', tint: '#FDE9DE', color: '#E07B3B', gradient: ['#F09A5A', '#E07B3B'] },
  settings: { title: 'Settings', subtitle: 'Preferences & notifications', icon: 'settings', tint: '#EEEEF0', color: '#6D6D7A', gradient: ['#7A7A88', '#5A5A66'] },
  coupon: { title: 'Coupons', subtitle: 'Offers & promo codes', icon: 'ticket', tint: '#FFF3D6', color: '#DD9A0B', gradient: ['#F0B429', '#DD9A0B'] },
  loyalty: { title: 'Loyalty Points', subtitle: 'Earn & redeem points', icon: 'star', tint: '#FFF5DE', color: '#E5A710', gradient: ['#F2B63C', '#E5A710'] },
  wallet: { title: 'My Wallet', subtitle: 'Balance & transactions', icon: 'wallet', tint: '#FFF3D6', color: '#D98E12', gradient: ['#F0A93C', '#D98E12'] },
  refer: { title: 'Refer & Earn', subtitle: 'Invite friends, earn rewards', icon: 'share', tint: '#E5F7E5', color: '#2C9B4D', gradient: ['#4CB86A', '#2C9B4D'] },
  delivery: { title: 'Join as a Delivery Man', subtitle: 'Earn flexible income', icon: 'truck', tint: '#E2F1FF', color: '#2E87D6', gradient: ['#4A7BE0', '#2E87D6'] },
  vendor: { title: 'Open Vendor', subtitle: 'Sell on Aurasure', icon: 'store', tint: '#FCE7E4', color: '#D9573F', gradient: ['#E5765F', '#D9573F'] },
  liveChat: { title: 'Live Chat', subtitle: 'Talk to us in real time', icon: 'message', tint: '#E5F7E5', color: '#2C9B4D', gradient: ['#4CB86A', '#2C9B4D'] },
  help: { title: 'Help & Support', subtitle: 'We are here to help', icon: 'phone', tint: '#E4F1FC', color: '#2E87D6', gradient: ['#4A7BE0', '#2E87D6'] },
  terms: { title: 'Terms & Conditions', subtitle: 'Legal agreement', icon: 'info', tint: '#F0E8FF', color: '#8C5ADB', gradient: ['#A06BE8', '#8C5ADB'] },
  privacy: { title: 'Privacy Policy', subtitle: 'How we protect your data', icon: 'shield', tint: '#FBE3E8', color: '#D9573F', gradient: ['#E5765F', '#D9573F'] },
  refund: { title: 'Refund Policy', subtitle: 'Returns & refunds', icon: 'refresh', tint: '#E5F7E5', color: '#2C9B4D', gradient: ['#4CB86A', '#2C9B4D'] },
};

// Legal / static prose for the policy screens.
const LEGAL: Record<'terms' | 'privacy' | 'refund', string[]> = {
  terms: [
    'By accessing or using the Aurasure app, you agree to be bound by these Terms & Conditions.',
    'We provide a marketplace for food delivery and shopping. Orders placed via Aurasure are subject to availability and confirmation by the respective store or restaurant.',
    'Prices, offers and delivery charges are shown at checkout and may change without prior notice.',
    'You are responsible for keeping your account credentials secure. Any activity under your account is your responsibility.',
    'We may suspend or terminate access if these terms are violated or if any unlawful activity is detected.',
  ],
  privacy: [
    'We collect only the information needed to serve you: your name, phone number, location and order history.',
    'Your location is used to show serviceable stores and estimate delivery times. We never share your precise location with third parties.',
    'Payment details are processed by secure, PCI-compliant providers and are never stored on our servers.',
    'We do not sell your personal data. We may share anonymised analytics to improve the experience.',
    'You may request deletion of your account and associated data at any time by contacting support.',
  ],
  refund: [
    'Cancellations are free until the store or seller starts preparing your order.',
    'If your order is wrong, damaged or missing items, you can request a refund within 24 hours of delivery.',
    'Refunds for food go back to your original payment method within 5-7 business days.',
    'For shop orders, refunds follow the seller\u2019s return policy. Unused, non-perishable items can be returned within 7 days.',
    'Wallet credits, if used, are restored to your wallet first before any cash refund is issued.',
  ],
};

export function MenuDetailScreen({ route, navigation }: Props): React.ReactElement {
  const meta = META[route.params.key];
  const insets = useSafeAreaInsets();
  useScreenBars(meta.gradient[0], { navigationBar: colors.appBar });
  const openChat = (): void => haptic.success();

  const body = renderBody(route.params.key, meta, { openChat });

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
      >
        <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 6 }]}>
          <View style={styles.heroBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
              <Icon name="chevronLeft" size={22} color={colors.white} />
            </Pressable>
            <View style={styles.heroText}>
              <Text variant="h3" weight="bold" color={colors.white} numberOfLines={1}>
                {meta.title}
              </Text>
              {meta.subtitle ? (
                <Text variant="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {meta.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>{body}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function renderBody(
  key: MenuDetailKey,
  meta: Meta,
  ctx: { openChat: () => void },
): React.ReactElement {
  switch (key) {
    case 'editProfile':
      return <EditProfileBody />;
    case 'settings':
      return <SettingsBody />;
    case 'myAddress':
      return <AddressBody />;
    case 'coupon':
      return <CouponsBody />;
    case 'loyalty':
      return <LoyaltyBody />;
    case 'wallet':
      return <WalletBody />;
    case 'refer':
      return <ReferBody />;
    case 'delivery':
      return <DeliveryBody />;
    case 'vendor':
      return <VendorBody />;
    case 'liveChat':
      return <LiveChatBody onStart={ctx.openChat} />;
    case 'help':
      return <HelpBody />;
    case 'terms':
    case 'privacy':
    case 'refund':
      return <LegalBody keyName={key} meta={meta} />;
    default:
      return <Text>Nothing here yet.</Text>;
  }
}

/* ---------------------------- profile ---------------------------- */

function EditProfileBody(): React.ReactElement {
  const { phone } = useApp();
  const loggedIn = !!phone;
  const { data: profile } = useAppQuery(fetchMe, () => userProfile);
  const [display, setDisplay] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    if (!display.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ name: display.trim(), email: email.trim() });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!loggedIn) {
    return (
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Icon name="user" size={40} color={colors.textTertiary} />
          <Text variant="subtitle" color={colors.textSecondary} style={{ marginTop: 12, textAlign: 'center' }}>
            Sign in to edit your profile
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Card style={styles.profileCard}>
        <View>
          <View style={styles.avatar}>
            <Icon name="user" size={26} color="#5B3A7E" />
          </View>
          <View style={styles.avatarBadge}>
            <Icon name="edit" size={11} color={colors.white} />
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text variant="title" weight="bold" color={colors.text}>
            {display || 'Your name'}
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {profile?.phone ?? 'Member'}
          </Text>
        </View>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <Field label="Full name" value={display} onChangeText={setDisplay} icon="user" />
        <Field label="Phone" value={profile?.phone ?? ''} onChangeText={() => undefined} icon="phone" disabled />
        <Field label="Email" value={email} onChangeText={setEmail} icon="mail" />
      </Card>
      {error ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 10, marginLeft: 4 }}>
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text variant="caption" color={colors.success} style={{ marginTop: 10, marginLeft: 4 }}>
          Saved — your profile is up to date ✓
        </Text>
      ) : null}
      <Button
        title={saving ? 'Saving…' : 'Save changes'}
        onPress={() => void save()}
        fullWidth
        size="lg"
        loading={saving}
        style={{ marginTop: 16 }}
        leftIcon="check"
      />
    </>
  );
}

/* ---------------------------- settings ---------------------------- */

function SettingsBody(): React.ReactElement {
  const [state, setState] = useState({ push: true, email: true, dark: false, location: true });
  const toggle = (k: keyof typeof state): void => {
    haptic.light();
    setState((s) => ({ ...s, [k]: !s[k] }));
  };
  return (
    <Card>
      <ToggleRow label="Push notifications" desc="Order updates & offers" value={state.push} onChange={() => toggle('push')} icon="bell" tint="#FDE9F3" />
      <ToggleRow label="Email notifications" desc="Receipts & promotional emails" value={state.email} onChange={() => toggle('email')} icon="mail" tint="#E4F1FC" />
      <ToggleRow label="Dark mode" desc="Comes soon" value={state.dark} onChange={() => toggle('dark')} icon="zap" tint="#F0E8FF" />
      <ToggleRow label="Location" desc="Show serviceable stores near you" value={state.location} onChange={() => toggle('location')} icon="mapPin" tint="#E5F7E5" last />
    </Card>
  );
}

/* ---------------------------- address ---------------------------- */

const EMPTY_ADDR = { label: '', line: '', city: '', pin: '' };

function AddressBody(): React.ReactElement {
  const q = useAppQuery(fetchMe, () => userProfile);
  const addresses = q.data?.addresses ?? [];
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDR);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = (): void => q.refresh();

  const addAddress = async (): Promise<void> => {
    if (!form.label.trim() || !form.line.trim() || !form.city.trim() || !form.pin.trim()) {
      setMsg('Fill every field (label, address, city, PIN)');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await addAddressToServer({
        label: form.label.trim(),
        line: form.line.trim(),
        city: form.city.trim(),
        pin: form.pin.trim(),
      });
      setSheet(false);
      setForm(EMPTY_ADDR);
      refresh();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Could not save the address');
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id: string): Promise<void> => {
    try {
      await deleteAddressFromServer(id);
      refresh();
    } catch {
      setMsg('Could not delete the address');
    }
  };

  return (
    <>
      {addresses.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', paddingVertical: 18 }}>
            No saved addresses yet — add one below.
          </Text>
        </Card>
      ) : (
        <Card>
          {addresses.map((a, i) => (
            <View key={a.id} style={[styles.row, i > 0 ? styles.rowTop : null]}>
              <View style={styles.rowIcon}><Icon name={a.isDefault ? 'home' : 'mapPin'} size={18} color="#9C005E" filled /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text variant="title" weight="bold" color={colors.text}>{a.label}</Text>
                  {a.isDefault ? <Badge label="Default" tone="brand" size="sm" style={{ marginLeft: 8 }} /> : null}
                </View>
                <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {a.line}, {a.city} {a.pin}
                </Text>
              </View>
              {!a.isDefault ? (
                <Pressable onPress={() => void removeAddress(a.id)} hitSlop={8} style={styles.deleteMini}>
                  <Icon name="trash" size={16} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>
      )}
      <Button
        title="+ Add new address"
        onPress={() => {
          setMsg(null);
          setSheet(true);
        }}
        fullWidth
        size="lg"
        style={{ marginTop: 16 }}
        leftIcon="plusCircle"
      />
      {msg ? (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 10, marginLeft: 4 }}>
          {msg}
        </Text>
      ) : null}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Add new address">
        <Input label="Label (Home/Work)" value={form.label} onChangeText={(t) => setForm((s) => ({ ...s, label: t }))} placeholder="Home" leftIcon="tag" />
        <Input label="Address line" value={form.line} onChangeText={(t) => setForm((s) => ({ ...s, line: t }))} placeholder="House / flat, street, landmark" leftIcon="mapPin" />
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Input label="City" value={form.city} onChangeText={(t) => setForm((s) => ({ ...s, city: t }))} placeholder="Indore" leftIcon="mapPinned" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="PIN" value={form.pin} onChangeText={(t) => setForm((s) => ({ ...s, pin: t }))} placeholder="452001" keyboardType="number-pad" leftIcon="mapPin" />
          </View>
        </View>
        <Button
          title={saving ? 'Saving…' : 'Save address'}
          onPress={() => void addAddress()}
          fullWidth
          size="lg"
          loading={saving}
          style={{ marginTop: 4 }}
          leftIcon="check"
        />
      </BottomSheet>
    </>
  );
}

/* ---------------------------- coupon ---------------------------- */

const MOCK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'AURA50', title: '₹50 off on your first order', subtitle: 'Welcome coupon', minOrder: 199, offType: 'flat', offValue: 50, expiresAt: null, usedAt: null },
  { id: 'c2', code: 'FOOD25', title: '25% off on food delivery', subtitle: 'Up to ₹120', minOrder: 349, offType: 'percent', offValue: 25, expiresAt: null, usedAt: null },
  { id: 'c3', code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum', minOrder: 0, offType: 'flat', offValue: 0, expiresAt: null, usedAt: null },
];

const fmtDay = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

function CouponsBody(): React.ReactElement {
  const q = useAppQuery(fetchCoupons, () => MOCK_COUPONS);
  const coupons: Coupon[] = (q.data ?? MOCK_COUPONS).filter((c) => !c.usedAt);
  return (
    <View>
      {coupons.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', paddingVertical: 18 }}>
            No active coupons right now.
          </Text>
        </Card>
      ) : null}
      {coupons.map((c) => (
        <Card key={c.code} style={{ marginBottom: 10 }}>
          <View style={styles.couponRow}>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="extrabold" color="#9C005E">{c.title}</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>
                {c.subtitle}
                {c.minOrder > 0 ? ` · Min order ₹${c.minOrder}` : ''}
                {c.expiresAt ? ` · Till ${fmtDay(c.expiresAt)}` : ''}
              </Text>
            </View>
            <View style={[styles.couponCode, q.source === 'api' && { borderColor: '#B78FD0' }]}>
              <Text variant="caption" weight="bold" color="#9C005E">{c.code}</Text>
            </View>
          </View>
        </Card>
      ))}
      <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 4 }}>
        Codes auto-apply at checkout when you spend above the minimum.
      </Text>
    </View>
  );
}

/* ---------------------------- loyalty ---------------------------- */

const MOCK_LOYALTY = (): LoyaltyData => ({
  points: 1240,
  tier: 'Silver',
  activity: [
    { id: 'l1', type: 'earned', title: 'Order reward', note: '₹580 spent → points', points: 290, balanceAfter: 1240, createdAt: new Date().toISOString() },
    { id: 'l2', type: 'earned', title: 'Order reward', note: '₹780 spent → points', points: 390, balanceAfter: 950, createdAt: new Date().toISOString() },
    { id: 'l3', type: 'earned', title: 'Referral bonus', note: 'Friend joined', points: 250, balanceAfter: 560, createdAt: new Date().toISOString() },
  ],
});

const REDEEM_CHOICES = [100, 200, 500, 1000];

function LoyaltyBody(): React.ReactElement {
  const q = useAppQuery(fetchLoyalty, MOCK_LOYALTY);
  const points = q.data?.points ?? 0;
  const tier = q.data?.tier ?? 'Bronze';
  const [sheet, setSheet] = useState(false);
  const [choice, setChoice] = useState<number>(100);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const confirmRedeem = async (): Promise<void> => {
    setBusy(true);
    setErr(null);
    try {
      await redeemLoyalty(choice);
      setSheet(false);
      q.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not redeem points');
    } finally {
      setBusy(false);
    }
  };

  const activity = q.data?.activity ?? MOCK_LOYALTY().activity;

  return (
    <>
      <LinearGradient colors={['#F2B63C', '#E5A710']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Icon name="star" size={22} color={colors.white} />
          <View style={styles.tierPill}>
            <Text variant="overline" weight="bold" color="#7A5200">{tier.toUpperCase()} MEMBER</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14 }}>
          <Text variant="display" weight="extrabold" color={colors.white}>{points.toLocaleString('en-IN')}</Text>
          <Text variant="title" weight="bold" color="rgba(255,255,255,0.9)" style={{ marginLeft: 6 }}>points</Text>
        </View>
        <Text variant="caption" color="rgba(255,255,255,0.9)" style={{ marginTop: 6 }}>
          Earn 5 points on every ₹100 spent · 100 pts = ₹10 wallet money
        </Text>
        <Pressable onPress={() => { setChoice(100); setErr(null); setSheet(true); }} style={styles.balanceCta}>
          <Text variant="caption" weight="bold" color="#B8860B">REDEEM POINTS</Text>
        </Pressable>
      </LinearGradient>

      <SectionLabel label="Recent activity" />
      <Card>
        {activity.length === 0 ? (
          <Text variant="body" color={colors.textSecondary} style={{ paddingVertical: 14, textAlign: 'center' }}>
            No activity yet — order food or shop to start earning.
          </Text>
        ) : (
          activity.slice(0, 8).map((t) => (
            <ActivityRow
              key={t.id}
              title={t.title}
              sub={`${t.note ?? ''} · ${fmtDay(t.createdAt)}`}
              amount={`${t.type === 'earned' ? '+' : '-'}${Math.abs(t.points)} pts`}
              positive={t.type === 'earned'}
            />
          ))
        )}
      </Card>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Redeem points">
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {REDEEM_CHOICES.map((c) => {
              const on = choice === c;
              const disabled = c > points;
              return (
                <Pressable
                  key={c}
                  disabled={disabled}
                  onPress={() => { haptic.selection(); setChoice(c); }}
                  style={[styles.chip, on && styles.chipOn, disabled && { opacity: 0.35 }]}
                >
                  <Text variant="caption" weight="bold" color={on ? colors.white : colors.text}>
                    {c} pts
                  </Text>
                  <Text variant="overline" color={on ? 'rgba(255,255,255,0.85)' : colors.textTertiary} style={{ marginLeft: 4 }}>
                    = ₹{c / 10}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {err ? (
            <Text variant="caption" color={colors.danger} style={{ marginTop: 10 }}>
              {err}
            </Text>
          ) : null}
          <Button
            title={busy ? 'Redeeming…' : `Redeem ${choice} points → ₹${choice / 10}`}
            onPress={() => void confirmRedeem()}
            fullWidth
            size="lg"
            loading={busy}
            disabled={choice > points}
            style={{ marginTop: 18 }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

/* ---------------------------- wallet ---------------------------- */

const MOCK_WALLET = (): WalletData => ({
  balance: 480,
  transactions: [
    { id: 'w1', type: 'credit', title: 'Money added', note: 'Instant top-up · UPI', amount: 250, balanceAfter: 250, createdAt: new Date().toISOString() },
    { id: 'w2', type: 'credit', title: 'Referral bonus', note: 'Friend joined with your code', amount: 300, balanceAfter: 550, createdAt: new Date().toISOString() },
    { id: 'w3', type: 'debit', title: 'Order AUR-FD-88K2', note: 'Food delivery', amount: 120, balanceAfter: 430, createdAt: new Date().toISOString() },
    { id: 'w4', type: 'credit', title: 'Cashback', note: 'Coupon AURA50', amount: 50, balanceAfter: 480, createdAt: new Date().toISOString() },
  ],
});

const TOPUP_CHOICES = [100, 250, 500, 1000];

function WalletBody(): React.ReactElement {
  const q = useAppQuery(fetchWallet, MOCK_WALLET);
  const balance = q.data?.balance ?? 0;
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState<number>(250);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addMoney = async (): Promise<void> => {
    setBusy(true);
    setErr(null);
    try {
      await addWalletMoney(amount);
      setSheet(false);
      q.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not add money');
    } finally {
      setBusy(false);
    }
  };

  const transactions = q.data?.transactions ?? [];

  return (
    <>
      <LinearGradient colors={['#F0A93C', '#D98E12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Icon name="wallet" size={22} color={colors.white} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14 }}>
          <Text variant="display" weight="extrabold" color={colors.white}>{formatINR(balance)}</Text>
        </View>
        <Text variant="caption" color="rgba(255,255,255,0.9)" style={{ marginTop: 6 }}>
          {q.source === 'api' ? 'Live balance · synced with your account' : 'Stored value you can spend instantly'}
        </Text>
        <Pressable onPress={() => { setErr(null); setSheet(true); }} style={styles.balanceCta}>
          <Text variant="caption" weight="bold" color="#B07000">+ ADD MONEY</Text>
        </Pressable>
      </LinearGradient>

      <SectionLabel label="Transactions" />
      <Card>
        {transactions.length === 0 ? (
          <Text variant="body" color={colors.textSecondary} style={{ paddingVertical: 14, textAlign: 'center' }}>
            No transactions yet — add money or place an order to see activity here.
          </Text>
        ) : (
          transactions.slice(0, 12).map((t) => (
            <ActivityRow
              key={t.id}
              title={t.title}
              sub={`${t.note ?? ''} · ${fmtDay(t.createdAt)}`}
              amount={`${t.type === 'credit' ? '+' : '-'}${formatINR(t.amount)}`}
              positive={t.type === 'credit'}
            />
          ))
        )}
      </Card>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Add money to wallet">
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
            {TOPUP_CHOICES.map((c) => {
              const on = amount === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => { haptic.selection(); setAmount(c); }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text variant="subtitle" weight="bold" color={on ? colors.white : colors.text}>
                    {formatINR(c)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 12 }}>
            Instant top-up via UPI · money is ready to spend right away.
          </Text>
          {err ? (
            <Text variant="caption" color={colors.danger} style={{ marginTop: 10 }}>
              {err}
            </Text>
          ) : null}
          <Button
            title={busy ? 'Adding…' : `Add ${formatINR(amount)}`}
            onPress={() => void addMoney()}
            fullWidth
            size="lg"
            loading={busy}
            style={{ marginTop: 18 }}
            leftIcon="plus"
          />
        </View>
      </BottomSheet>
    </>
  );
}

/* ---------------------------- refer ---------------------------- */

const MOCK_REFERRAL: ReferralInfo = { code: 'DEEPRAK08', earnings: 300, friends: 2, referredBy: null };

function ReferBody(): React.ReactElement {
  const q = useAppQuery(fetchReferral, () => MOCK_REFERRAL);
  const code = q.data?.code ?? 'AURASURE';
  const [shared, setShared] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyCode, setApplyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const share = async (): Promise<void> => {
    setShared(false);
    try {
      await Share.share({
        title: 'Aurasure — you get ₹50 off',
        message: `I'm inviting you to Aurasure 🎉 Food delivery + shopping in one app. Use my code ${code} at sign-up and get ₹50 off your first order — I earn ₹100 too! Download Aurasure today.`,
      });
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      setMsg({ ok: true, text: `Your code is ${code} — share it with friends.` });
    }
  };

  const apply = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await applyReferral(applyCode.trim());
      setApplyOpen(false);
      setApplyCode('');
      setMsg({ ok: true, text: `Welcome gift added ✓ +₹${res.reward} wallet & ${res.points} points.` });
      q.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not apply the code' });
    } finally {
      setBusy(false);
    }
  };

  const earnings = q.data?.earnings ?? 0;
  const friends = q.data?.friends ?? 0;

  return (
    <View>
      <Card>
        <View style={styles.referHero}>
          <Icon name="gift" size={30} color="#2C9B4D" />
          <Text variant="h3" weight="bold" color={colors.text} style={{ marginTop: 10 }}>Earn ₹100 per referral</Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4, textAlign: 'center' }}>
            Share your code with friends — they get ₹50 off, you get ₹100 in wallet.
          </Text>
        </View>
        <View style={styles.codeBox}>
          <Text variant="h3" weight="extrabold" color="#2C9B4D" style={{ letterSpacing: 2 }}>{code}</Text>
          <View style={styles.copyPill}>
            <Icon name="share" size={14} color="#2C9B4D" />
            <Text variant="caption" weight="bold" color="#2C9B4D" style={{ marginLeft: 4 }}>YOUR CODE</Text>
          </View>
        </View>
        <Button title="Share my code" onPress={() => void share()} fullWidth size="lg" style={{ marginTop: 14 }} leftIcon="share" />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text variant="h3" weight="extrabold" color="#2C9B4D">{formatINR(earnings)}</Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>Earned so far</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={{ flex: 1 }}>
            <Text variant="h3" weight="extrabold" color="#2C9B4D">{friends}</Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>Friends joined</Text>
          </View>
        </View>
        {q.data?.referredBy ? (
          <Text variant="caption" color={colors.success} style={{ marginTop: 12 }}>
            You joined with code {q.data.referredBy} — welcome bonus applied ✓
          </Text>
        ) : (
          <Pressable
            onPress={() => { setApplyCode(''); setMsg(null); setApplyOpen(true); }}
            style={({ pressed }) => [styles.inviteRow, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text variant="caption" weight="bold" color={colors.brand[700]}>Have a friend's code? Apply it here</Text>
            <Icon name="arrowRight" size={14} color={colors.brand[700]} />
          </Pressable>
        )}
      </Card>

      {shared ? (
        <Text variant="caption" color={colors.success} style={{ marginTop: 10, textAlign: 'center' }}>
          Shared ✓ Thanks for spreading the word!
        </Text>
      ) : null}
      {msg && !applyOpen ? (
        <Text variant="caption" color={msg.ok ? colors.success : colors.danger} style={{ marginTop: 10, textAlign: 'center' }}>
          {msg.text}
        </Text>
      ) : null}

      <BottomSheet visible={applyOpen} onClose={() => setApplyOpen(false)} title="Have a referral code?">
        <View>
          <Text variant="body" color={colors.textSecondary} style={{ marginBottom: 12 }}>
            Enter your friend's code to get ₹50 in wallet + 250 points as a welcome gift.
          </Text>
          <Input label="Referral code" value={applyCode} onChangeText={setApplyCode} placeholder="e.g. AAR3210" leftIcon="tag" autoCapitalize="characters" />
          {msg && applyOpen ? (
            <Text variant="caption" color={msg.ok ? colors.success : colors.danger} style={{ marginTop: 8 }}>
              {msg.text}
            </Text>
          ) : null}
          <Button
            title={busy ? 'Applying…' : 'Apply code'}
            onPress={() => void apply()}
            fullWidth
            size="lg"
            loading={busy}
            style={{ marginTop: 16 }}
            leftIcon="gift"
          />
        </View>
      </BottomSheet>
    </View>
  );
}

/* ---------------------------- delivery / vendor ---------------------------- */

function PartnerApplySheet({ kind }: { kind: 'delivery' | 'vendor' }): React.ReactElement {
  const { phone, name } = useApp();
  const [open, setOpen] = useState(false);
  const [fName, setFName] = useState(name ?? '');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (!fName.trim() || !city.trim()) {
      setErr('Fill your name and city');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await submitPartnerApplication(kind, { name: fName.trim(), city: city.trim() });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not submit — try again');
    } finally {
      setBusy(false);
    }
  };

  const close = (): void => {
    setOpen(false);
    setDone(false);
    setErr(null);
  };

  return (
    <>
      <Button
        title={kind === 'delivery' ? 'Apply as Delivery Partner' : 'Register as Vendor'}
        onPress={() => { setDone(false); setErr(null); setOpen(true); }}
        fullWidth
        size="lg"
        style={{ marginTop: 16 }}
        leftIcon={kind === 'delivery' ? 'truck' : 'store'}
      />
      <BottomSheet visible={open} onClose={close} title={kind === 'delivery' ? 'Join as a Delivery Partner' : 'Open your shop on Aurasure'}>
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <View style={styles.doneIcon}>
              <Icon name="circleCheck" size={30} color={colors.success} />
            </View>
            <Text variant="h3" weight="bold" color={colors.text} style={{ marginTop: 10 }}>
              Application submitted ✓
            </Text>
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 6 }}>
              Our team will call {phone ?? 'you'} within 48 hours to complete onboarding.
            </Text>
            <Button title="Done" onPress={close} fullWidth size="lg" style={{ marginTop: 18 }} />
          </View>
        ) : (
          <View>
            <Text variant="caption" color={colors.textSecondary} style={{ marginBottom: 12 }}>
              We review every application and usually reach out within 48 hours.
            </Text>
            <Input label="Full name" value={fName} onChangeText={setFName} placeholder="Your name" leftIcon="user" />
            <Input label="City" value={city} onChangeText={setCity} placeholder="e.g. Indore" leftIcon="mapPinned" />
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
              Phone on file: {phone ?? '— sign in to prefill'}
            </Text>
            {err ? (
              <Text variant="caption" color={colors.danger} style={{ marginTop: 8 }}>
                {err}
              </Text>
            ) : null}
            <Button
              title={busy ? 'Submitting…' : 'Submit application'}
              onPress={() => void submit()}
              fullWidth
              size="lg"
              loading={busy}
              style={{ marginTop: 16 }}
              leftIcon="check"
            />
          </View>
        )}
      </BottomSheet>
    </>
  );
}

function DeliveryBody(): React.ReactElement {
  return (
    <>
      <InfoHero icon="truck" title="Drive & earn with Aurasure" desc="Flexible hours, weekly payouts and fuel support." />
      <Card>
        <StatRow label="Earnings/week" value="₹8,000+" />
        <StatRow label="Payout cycle" value="Every Friday" />
        <StatRow label="Fuel support" value="₹500/week" />
        <StatRow label="Ride support" value="24×7" />
      </Card>
      <PartnerApplySheet kind="delivery" />
    </>
  );
}

function VendorBody(): React.ReactElement {
  return (
    <>
      <InfoHero icon="store" title="Sell to millions" desc="List your shop or restaurant on Aurasure and reach customers near you." />
      <Card>
        <StatRow label="Commission" value="As low as 5%" />
        <StatRow label="Payouts" value="T+1 settlement" />
        <StatRow label="Onboarding" value="Within 48 hrs" />
      </Card>
      <PartnerApplySheet kind="vendor" />
    </>
  );
}

/* ---------------------------- chat / help ---------------------------- */

function LiveChatBody({ onStart }: { onStart: () => void }): React.ReactElement {
  return (
    <>
      <InfoHero icon="message" title="We reply in minutes" desc="Our team is available 24×7 to resolve any issue." />
      <Card>
        <ActivityRow title="Start a conversation" sub="Chat with a support agent" amount="Chat now" positive />
      </Card>
      <FullWidthButton label="Open live chat" />
    </>
  );
}

function HelpBody(): React.ReactElement {
  const items = [
    { label: 'Track my order', icon: 'package' as IconName },
    { label: 'Cancel an order', icon: 'close' as IconName },
    { label: 'Payment issues', icon: 'wallet' as IconName },
    { label: 'Report a problem', icon: 'circleAlert' as IconName },
  ];
  return (
    <Card>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.row, i > 0 ? styles.rowTop : null]}>
          <View style={styles.rowIcon}><Icon name={it.icon} size={18} color="#2E87D6" filled /></View>
          <Text variant="subtitle" weight="semibold" color={colors.text} style={{ flex: 1, marginLeft: 12 }}>{it.label}</Text>
          <Icon name="chevronRight" size={18} color="#C0B6C0" />
        </View>
      ))}
    </Card>
  );
}

/* ---------------------------- legal ---------------------------- */

function LegalBody({ keyName, meta }: { keyName: 'terms' | 'privacy' | 'refund'; meta: Meta }): React.ReactElement {
  const paragraphs = LEGAL[keyName];
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.rowIcon}><Icon name={meta.icon} size={18} color={meta.color} filled /></View>
        <Text variant="title" weight="bold" color={colors.text} style={{ marginLeft: 12 }}>Last updated · 28 Aug 2026</Text>
      </View>
      {paragraphs.map((p, i) => (
        <Text key={i} variant="body" color={colors.textSecondary} style={{ marginTop: 14, lineHeight: 22 }}>
          {p}
        </Text>
      ))}
    </Card>
  );
}

/* ---------------------------- shared bits ---------------------------- */

function Field({ label, value, onChangeText, icon, disabled }: { label: string; value: string; onChangeText: (t: string) => void; icon: IconName; disabled?: boolean }): React.ReactElement {
  return (
    <View style={[styles.fieldWrap, styles.fieldWrapBorder]}>
      <Text variant="caption" color={colors.textTertiary} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.fieldInputRow}>
        <Icon name={icon} size={18} color={colors.textSecondary} style={styles.fieldIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </View>
    </View>
  );
}

function ToggleRow({ label, desc, value, onChange, last, icon, tint }: { label: string; desc: string; value: boolean; onChange: () => void; last?: boolean; icon: IconName; tint: string }): React.ReactElement {
  return (
    <View style={[styles.row, !last ? styles.rowTop : null]}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}><Icon name={icon} size={18} color="#6D6D7A" filled /></View>
      <View style={{ flex: 1 }}>
        <Text variant="subtitle" weight="semibold" color={colors.text}>{label}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 1 }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#DDD6DE', true: '#C9A3E2' }} thumbColor={value ? '#9C005E' : '#FFFFFF'} />
    </View>
  );
}

function ActivityRow({ title, sub, amount, positive }: { title: string; sub: string; amount: string; positive?: boolean }): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon name="receipt" size={18} color="#9C005E" /></View>
      <View style={{ flex: 1 }}>
        <Text variant="subtitle" weight="semibold" color={colors.text}>{title}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 1 }}>{sub}</Text>
      </View>
      <Text variant="title" weight="bold" color={positive ? colors.success : colors.text}>{amount}</Text>
    </View>
  );
}

function InfoHero({ icon, title, desc }: { icon: IconName; title: string; desc: string }): React.ReactElement {
  return (
    <Card style={styles.infoHeroCard}>
      <View style={styles.infoHeroIcon}>
        <Icon name={icon} size={22} color="#9C005E" filled />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text variant="title" weight="bold" color={colors.text}>{title}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{desc}</Text>
      </View>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text variant="subtitle" color={colors.textSecondary} style={{ flex: 1 }}>{label}</Text>
      <Text variant="title" weight="bold" color={colors.text}>{value}</Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }): React.ReactElement {
  return <Text variant="overline" color="#A9A2AD" style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function FullWidthButton({ label }: { label: string }): React.ReactElement {
  return <Button title={label} variant="login" fullWidth size="lg" style={{ marginTop: 18 }} />;
}

/* ---------------------------- styles ---------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  // Slim app-bar style header: back button + title inline on one row, no
  // oversized icon block under it.
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, marginLeft: 12 },
  // Side spacing comes from the 10px content gutter - the hero above is full
  // bleed, and the body never double-pads.
  content: { paddingHorizontal: 10, marginTop: 14 },
  // Profile card: avatar + identity side by side, like a contact sheet.
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F6E9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9C005E',
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stacked field: label on top, input row below - much easier to scan than
  // squeezed single-line fields.
  fieldWrap: { paddingVertical: 12 },
  fieldWrapBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0EAF0',
  },
  fieldLabel: { marginBottom: 8, letterSpacing: 0.6 },
  fieldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  fieldIcon: { marginRight: 10 },
  overline: { letterSpacing: 0.4 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    minHeight: 58,
  },
  rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0EAF0' },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
  },
  couponRow: { flexDirection: 'row', alignItems: 'center' },
  couponCode: {
    backgroundColor: '#FAF0F9',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D9A6CF',
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  balanceCard: {
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'flex-start',
  },
  balanceCta: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionLabel: { marginTop: 22, marginBottom: 10, marginLeft: 4 },
  referHero: { alignItems: 'center', paddingVertical: 8 },
  infoHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EAF7EE',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D6EFDD',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  deleteMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  tierPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand[50],
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
