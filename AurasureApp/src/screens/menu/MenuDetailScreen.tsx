import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/ui/Screen';
import { BackButton } from '../../components/ui/BackButton';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { formatINR } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useScreenBars } from '@/lib/systemBars';
import { useApp } from '@/context/AppContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IconName } from '@/types';
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
        <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
            <Icon name="chevronLeft" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.heroIcon}>
            <Icon name={meta.icon} size={26} color={meta.color} filled />
          </View>
          <Text variant="h2" weight="extrabold" color={colors.white}>
            {meta.title}
          </Text>
          {meta.subtitle ? (
            <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>
              {meta.subtitle}
            </Text>
          ) : null}
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
  const { name, phone } = useApp();
  const [display, setDisplay] = useState(name ?? '');
  return (
    <>
      <Card>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Icon name="user" size={32} color="#5B3A7E" />
          </View>
          <Text variant="title" weight="bold" color={colors.text}>
            {phone ? name ?? 'Guest User' : 'Sign in to edit'}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {phone ?? 'Not signed in'}
          </Text>
        </View>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <Field label="Full name" value={display} onChangeText={setDisplay} icon="user" />
        <Field label="Phone" value={phone ?? ''} onChangeText={() => undefined} icon="phone" disabled />
        <View style={styles.row}>
          <View style={styles.rowIcon}><Icon name="mail" size={18} color="#8B5AD6" filled /></View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textTertiary} style={styles.overline}>Email</Text>
            <Text variant="subtitle" color={colors.textSecondary}>Add email for receipts</Text>
          </View>
        </View>
      </Card>
      <FullWidthButton label="Save changes" />
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
      <ToggleRow label="Push notifications" desc="Order updates & offers" value={state.push} onChange={() => toggle('push')} />
      <ToggleRow label="Email notifications" desc="Receipts & promotional emails" value={state.email} onChange={() => toggle('email')} />
      <ToggleRow label="Dark mode" desc="Comes soon" value={state.dark} onChange={() => toggle('dark')} />
      <ToggleRow label="Location" desc="Show serviceable stores near you" value={state.location} onChange={() => toggle('location')} last />
    </Card>
  );
}

/* ---------------------------- address ---------------------------- */

function AddressBody(): React.ReactElement {
  const { city } = useApp();
  const addresses = [
    { label: 'Home', detail: '12, Shanti Nagar, Indore, MP 452001', icon: 'home' as IconName },
    { label: 'Work', detail: 'Aurora Tower, Vijay Nagar, Indore, MP 452010', icon: 'store' as IconName },
  ];
  return (
    <>
      <Card>
        {addresses.map((a, i) => (
          <View key={a.label} style={[styles.row, i > 0 ? styles.rowTop : null]}>
            <View style={styles.rowIcon}><Icon name={a.icon} size={18} color="#9C005E" filled /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="title" weight="bold" color={colors.text}>{a.label}</Text>
                {i === 0 ? <Badge label="Default" tone="brand" style={{ marginLeft: 8 }} /> : null}
              </View>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{a.detail}</Text>
            </View>
          </View>
        ))}
      </Card>
      <FullWidthButton label="+ Add new address" />
    </>
  );
}

/* ---------------------------- coupon ---------------------------- */

function CouponsBody(): React.ReactElement {
  const coupons = [
    { code: 'AURA50', label: '₹50 off on your first order', min: 'Min order ₹199' },
    { code: 'FOOD25', label: '25% off on food delivery', min: 'Min order ₹349' },
    { code: 'FREEDEL', label: 'Free delivery on all orders', min: 'No minimum' },
  ];
  return (
    <View>
      {coupons.map((c) => (
        <Card key={c.code} style={{ marginBottom: 12 }}>
          <View style={styles.couponRow}>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="extrabold" color="#9C005E">{c.label}</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 3 }}>{c.min}</Text>
            </View>
            <View style={styles.couponCode}>
              <Text variant="caption" weight="bold" color="#9C005E">{c.code}</Text>
            </View>
          </View>
        </Card>
      ))}
      <FullWidthButton label="Apply coupon" />
    </View>
  );
}

/* ---------------------------- loyalty ---------------------------- */

function LoyaltyBody(): React.ReactElement {
  const [redeem] = useState(false);
  return (
    <>
      <BalanceCard icon="star" value="1,240" unit="points" hint="Earn 5 points on every ₹100 spent" cta="Redeem now" gradient={['#F2B63C', '#E5A710']} />
      <SectionLabel label="Recent activity" />
      <Card>
        <ActivityRow title="Order #AUR-2291" sub="Food delivery" amount="+120 pts" />
        <ActivityRow title="Referral bonus" sub="Friend joined" amount="+250 pts" positive />
        <ActivityRow title="Redeemed" sub="₹50 coupon" amount="-200 pts" />
      </Card>
    </>
  );
}

/* ---------------------------- wallet ---------------------------- */

function WalletBody(): React.ReactElement {
  return (
    <>
      <BalanceCard icon="wallet" value={formatINR(480)} unit="" hint="Stored value you can spend instantly" cta="Add money" gradient={['#F0A93C', '#D98E12']} />
      <SectionLabel label="Transactions" />
      <Card>
        <ActivityRow title="Money added" sub="UPI · 12 Aug" amount="+₹250" positive />
        <ActivityRow title="Order #AUR-2288" sub="Food delivery" amount="-₹120" />
        <ActivityRow title="Cashback" sub="Coupon AURA50" amount="+₹50" positive />
        <ActivityRow title="Refund" sub="Order #AUR-2250" amount="+₹300" positive />
      </Card>
    </>
  );
}

/* ---------------------------- refer ---------------------------- */

function ReferBody(): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const code = 'DEEPRAK08';
  const copy = (): void => {
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
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
        <Pressable onPress={copy} style={({ pressed }) => [styles.codeBox, { opacity: pressed ? 0.9 : 1 }]}>
          <Text variant="h3" weight="extrabold" color="#2C9B4D" style={{ letterSpacing: 2 }}>{code}</Text>
          <View style={styles.copyPill}>
            <Icon name={copied ? 'check' : 'tag'} size={14} color="#2C9B4D" />
            <Text variant="caption" weight="bold" color="#2C9B4D" style={{ marginLeft: 4 }}>{copied ? 'Copied' : 'Copy'}</Text>
          </View>
        </Pressable>
      </Card>
      <FullWidthButton label="Share my code" />
    </View>
  );
}

/* ---------------------------- delivery / vendor ---------------------------- */

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
      <FullWidthButton label="Apply as Delivery Partner" />
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
      <FullWidthButton label="Register as Vendor" />
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
    <View style={styles.field}>
      <Icon name={icon} size={18} color={colors.textSecondary} style={styles.fieldIcon} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.textTertiary} style={styles.overline}>{label}</Text>
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

function ToggleRow({ label, desc, value, onChange, last }: { label: string; desc: string; value: boolean; onChange: () => void; last?: boolean }): React.ReactElement {
  return (
    <View style={[styles.row, !last ? styles.rowTop : null]}>
      <View style={styles.rowIcon}><Icon name="settings" size={18} color="#6D6D7A" filled /></View>
      <View style={{ flex: 1 }}>
        <Text variant="subtitle" weight="semibold" color={colors.text}>{label}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 1 }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#DDD6DE', true: '#C9A3E2' }} thumbColor={value ? '#9C005E' : '#FFFFFF'} />
    </View>
  );
}

function BalanceCard({ icon, value, unit, hint, cta, gradient }: { icon: IconName; value: string; unit: string; hint: string; cta: string; gradient: [string, string] }): React.ReactElement {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
      <Icon name={icon} size={22} color={colors.white} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14 }}>
        <Text variant="display" weight="extrabold" color={colors.white}>{value}</Text>
        {unit ? <Text variant="title" weight="bold" color="rgba(255,255,255,0.9)" style={{ marginLeft: 6 }}>{unit}</Text> : null}
      </View>
      <Text variant="caption" color="rgba(255,255,255,0.9)" style={{ marginTop: 6 }}>{hint}</Text>
      <Pressable onPress={() => haptic.light()} style={styles.balanceCta}>
        <Text variant="caption" weight="bold" color={gradient[1]}>{cta}</Text>
      </Pressable>
    </LinearGradient>
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
    <Card>
      <View style={styles.referHero}>
        <View style={styles.rowIcon}><Icon name={icon} size={22} color="#9C005E" filled /></View>
        <Text variant="h3" weight="bold" color={colors.text} style={{ marginTop: 10, textAlign: 'center' }}>{title}</Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4, textAlign: 'center' }}>{desc}</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  // Side spacing comes from the 10px content gutter - the hero above is full
  // bleed, and the body never double-pads.
  content: { paddingHorizontal: 10, marginTop: 16 },
  avatarWrap: { alignItems: 'center', paddingVertical: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F6E9F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0EAF0',
  },
  fieldIcon: { marginRight: 12 },
  overline: { letterSpacing: 0.4 },
  input: { fontSize: 16, color: colors.text, paddingVertical: 2 },
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
  sectionLabel: { marginTop: 20, marginBottom: 8, marginLeft: 4 },
  referHero: { alignItems: 'center', paddingVertical: 8 },
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
});
