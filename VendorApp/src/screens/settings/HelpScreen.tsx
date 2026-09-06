import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { BackButton } from '@/components/ui/BackButton';
import { Card, Divider, EmptyState, SectionTitle } from '@/components/ui/VendorUI';
import { Icon, type IconName } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useVendorModal } from '@/components/ui/VendorModal';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

const SUPPORT_PHONE = '+919000000000';
const SUPPORT_EMAIL = 'partners@aurasure.app';

interface Faq { q: string; a: string; topic: string }
const FAQS: Faq[] = [
  { topic: 'Orders', q: 'How long do I have to accept an order?', a: 'You get two minutes. If nobody accepts, the order is released back to the customer and it counts against your acceptance rate. Set a realistic prep time when you accept — the customer sees it live.' },
  { topic: 'Orders', q: 'A dish is out of stock mid-order. What now?', a: 'Open the order and use partial accept to drop that line. The customer is refunded for it automatically and the rest of the order continues to the kitchen.' },
  { topic: 'Orders', q: 'When should I mark an order ready?', a: 'Only once it is packed and on the counter. Marking ready publishes the pickup task to nearby riders, so doing it early leaves a rider waiting.' },
  { topic: 'Orders', q: 'Can I cancel after accepting?', a: 'Reject before accepting where possible. After accepting, raise an issue from More so our team can cancel and inform the customer — repeated late cancellations affect your rating.' },
  { topic: 'Menu', q: 'Why is my new item marked pending?', a: 'New items and price rises above 20% go to our catalogue team for a quick check. It usually clears within a few hours, and the item stays hidden from customers until then.' },
  { topic: 'Menu', q: 'How do I pause an item for the day?', a: 'Open Menu, tap the item and turn off availability. It disappears from the storefront instantly and you can turn it back on any time.' },
  { topic: 'Payouts', q: 'When do settlements reach my bank?', a: 'Delivered orders settle after the platform commission of 5% on the item total. Settled amounts are shown in Business & payouts against each order code.' },
  { topic: 'Payouts', q: 'A payout looks wrong. What do I do?', a: 'Open Business & payouts, tap the order to read its statement, then raise an issue with that order code. Our finance team replies on your account.' },
  { topic: 'Outlet', q: 'How do I pause my outlet temporarily?', a: 'Use the open / paused switch on Home. Pausing stops new orders immediately but never cancels orders you already accepted.' },
  { topic: 'Outlet', q: 'My map pin is in the wrong place.', a: 'Go to More, then Outlet map pin, tap Use my location while standing at the outlet, and save. Riders navigate using this pin, so an accurate one means fewer pickup calls.' },
  { topic: 'Account', q: 'Can my staff use their own login?', a: 'Yes. Add them under More, then Staff access. They can run the order board but cannot see payouts or edit KYC.' },
  { topic: 'Account', q: 'How do I update my bank or KYC details?', a: 'Bank and KYC changes need a review. Raise an issue with what has changed and our team will unlock the relevant step for you.' },
];

const CHANNELS: { key: 'phone' | 'wa' | 'email'; icon: IconName; label: string; hint: string }[] = [
  { key: 'phone', icon: 'phone', label: 'Call us', hint: '9 AM – 11 PM' },
  { key: 'wa', icon: 'message', label: 'WhatsApp', hint: 'Fast replies' },
  { key: 'email', icon: 'mail', label: 'Email', hint: 'Within 24 h' },
];

/** Vendor-facing help centre: searchable FAQ plus direct support channels. */
export function HelpScreen({ navigation }: Props): React.ReactElement {
  const { showModal } = useVendorModal();
  const { vendor } = useVendor();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return FAQS;
    return FAQS.filter((faq) => `${faq.q} ${faq.a} ${faq.topic}`.toLowerCase().includes(needle));
  }, [term]);

  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    rows.forEach((faq) => map.set(faq.topic, [...(map.get(faq.topic) ?? []), faq]));
    return [...map.entries()];
  }, [rows]);

  const contact = async (channel: 'phone' | 'wa' | 'email'): Promise<void> => {
    haptic.light();
    const outlet = vendor?.outletName || 'my outlet';
    const targets = {
      phone: `tel:${SUPPORT_PHONE}`,
      wa: `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi Aurasure, I need help with ${outlet}.`)}`,
      email: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Vendor support · ${outlet}`)}&body=${encodeURIComponent(`Outlet: ${outlet}\nRegistered phone: ${vendor?.phone ?? ''}\n\nWhat happened:\n`)}`,
    };
    try {
      await Linking.openURL(targets[channel]);
    } catch {
      showModal({ title: 'Could not open that', message: `Reach us on ${SUPPORT_PHONE} or ${SUPPORT_EMAIL}.` });
    }
  };

  return (
    <Screen title="Help centre" subtitle={`${rows.length} answer${rows.length === 1 ? '' : 's'} for outlet operations`} headerLeft={<BackButton onPress={() => navigation.goBack()} />}>
      <Input value={term} onChangeText={setTerm} placeholder="Search: payout, prep time, pending item…" leftIcon="search" containerStyle={{ marginTop: 4 }} />

      <View style={styles.channels}>
        {CHANNELS.map((channel) => (
          <Pressable key={channel.key} onPress={() => void contact(channel.key)} style={({ pressed }) => [styles.channel, pressed && { opacity: 0.75 }]}>
            <View style={styles.channelIcon}><Icon name={channel.icon} size={19} color={colors.brand[600]} /></View>
            <Text variant="caption" weight="bold" style={{ marginTop: 8 }}>{channel.label}</Text>
            <Text variant="caption" color={colors.textTertiary}>{channel.hint}</Text>
          </Pressable>
        ))}
      </View>

      {grouped.length === 0 ? (
        <Card style={{ marginTop: 16 }}>
          <EmptyState icon="helpCircle" title="No answer for that" body="Try a different word, or raise an issue from More and our team will reply on your account." />
        </Card>
      ) : grouped.map(([topic, faqs]) => (
        <View key={topic}>
          <SectionTitle title={topic} />
          <Card style={styles.listCard}>
            {faqs.map((faq, index) => {
              const expanded = open === faq.q;
              return (
                <React.Fragment key={faq.q}>
                  {index ? <Divider /> : null}
                  <Pressable onPress={() => { haptic.light(); setOpen(expanded ? null : faq.q); }} style={styles.faq}>
                    <View style={styles.faqHead}>
                      <Text variant="bodySm" weight="bold" style={{ flex: 1 }}>{faq.q}</Text>
                      <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={17} color={colors.textTertiary} />
                    </View>
                    {expanded ? <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 8 }}>{faq.a}</Text> : null}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </Card>
        </View>
      ))}

      <Card tone="warm" style={styles.stillStuck}>
        <Text variant="title" weight="bold">Still stuck?</Text>
        <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 5 }}>
          Raise an issue from the More tab with the order code. It is attached to your account, so replies reach you here.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.stuckAction}>
          <Text variant="button" color={colors.brand[700]}>Back to More</Text>
          <Icon name="arrowRight" size={17} color={colors.brand[700]} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  channels: { flexDirection: 'row', gap: 8, marginTop: 14 },
  channel: { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  channelIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  listCard: { paddingVertical: 2, paddingHorizontal: 14 },
  faq: { paddingVertical: 14 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stillStuck: { marginTop: 22 },
  stuckAction: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
});
