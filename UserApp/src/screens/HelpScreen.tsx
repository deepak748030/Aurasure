import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input, SearchField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { ListSection, MetaRow } from '@/components/list/ListRow';
import { Tag } from '@/components/ui/Primitives';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { SUPPORT_PHONE } from '@/config';
import { money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

interface Faq {
  q: string;
  a: string;
  match: string[];
  icon: IconName;
}

const FAQS: Faq[] = [
  { q: 'How do I place an order?', a: 'Open a store, tap ADD on what you want, then the cart and Place order. The store confirms it and you can watch every step in Track order.', match: ['order', 'place', 'buy'], icon: 'cart' },
  { q: 'Can I cancel after ordering?', a: 'Yes — free until the store confirms, from the order screen. After that the store has to approve it. Wallet payments are refunded the moment a cancellation goes through.', match: ['cancel', 'refund', 'drop'], icon: 'circleX' },
  { q: 'When is the wallet charged?', a: 'Only if you pick "Aurasure wallet" as the payment method. Then it is debited when the order is created and credited back if the order is cancelled.', match: ['wallet', 'pay', 'charge', 'money'], icon: 'wallet' },
  { q: 'How do coupons work?', a: 'Claim a code in Coupons, then apply it in the cart. One coupon per order, and it needs the minimum order value. The server re-checks it when you place the order.', match: ['coupon', 'promo', 'code', 'discount'], icon: 'coupon' },
  { q: 'How are loyalty points counted?', a: '5 points for every ₹100 spent, rounded down. 100 points redeem as ₹10 in your wallet, and a cancelled order takes its points back.', match: ['loyalty', 'point', 'tier'], icon: 'loyalty' },
  { q: 'Can I pay with UPI or card?', a: 'Not in this build — it ships with cash on delivery and the in-app wallet. The payment method row tells you when a gateway is enabled.', match: ['upi', 'card', 'gateway', 'online'], icon: 'creditCard' },
  { q: 'Why is my cart locked to one store?', a: 'Every order comes from a single kitchen or shop, so mixing stores would silently drop items. Adding from a new store asks whether to replace the cart.', match: ['cart', 'store', 'mix', 'two'], icon: 'store' },
  { q: 'The item price changed at checkout', a: 'Prices come from the live catalogue. If a store updates a price while your cart is open, the invoice uses the new one — it is shown before you place the order.', match: ['price', 'changed', 'cost'], icon: 'tag' },
  { q: 'The app says the server is offline', a: 'The API is reachable but its database is not up, or the base URL in your .env is wrong. Settings shows the exact address being used; the store operator starts MongoDB.', match: ['offline', 'server', 'db', 'error', 'health'], icon: 'wifiOff' },
  { q: 'How do I change my delivery address?', a: 'Tap the address in the home header, pick a saved one or add a new one. The chosen address is used for distance and shown to the rider.', match: ['address', 'location', 'deliver'], icon: 'mapPin' },
];

/** Help centre: searchable FAQ + the channels that actually exist here. */
export function HelpScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { online, user } = useSession();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [ticket, setTicket] = useState('');

  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return FAQS;
    return FAQS.filter((faq) => `${faq.q} ${faq.a} ${faq.match.join(' ')}`.toLowerCase().includes(needle));
  }, [term]);

  const contact = async (channel: 'phone' | 'email' | 'wa'): Promise<void> => {
    const targets = {
      phone: `tel:${SUPPORT_PHONE}`,
      email: `mailto:support@aurasure.app?subject=Aurasure customer support&body=${encodeURIComponent(`Order / issue details:\n\n(phone: ${user?.phone ?? ''})`)}`,
      wa: `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent('Hi Aurasure, I need help with my order.')}`,
    } as const;
    try {
      await Linking.openURL(targets[channel]);
    } catch {
      sheet.info('Opening not supported here', `This device could not open that link. Support number: ${SUPPORT_PHONE}`);
    }
  };

  const sendTicket = async (): Promise<void> => {
    if (ticket.trim().length < 12) {
      sheet.warning('Tell us a bit more', 'A sentence or two about what happened helps us find your order.');
      return;
    }
    const value = ticket.trim();
    setTicket('');
    sheet.show({
      title: 'Message written',
      message: 'This build has no support-ticket endpoint, so nothing was sent to a queue. Copy it into a call or email instead — we kept it out of your order notes on purpose.',
      icon: 'chat',
      tone: 'warning',
      dismissLabel: 'Close',
      actions: [
        {
          label: 'Call support',
          variant: 'primary',
          onPress: () => void contact('phone'),
        },
        {
          label: 'Email it',
          variant: 'secondary',
          onPress: () => {
            void Linking.openURL(`mailto:support@aurasure.app?subject=Aurasure issue&body=${encodeURIComponent(value)}`);
          },
        },
      ],
    });
  };

  return (
    <Screen
      title="Help & support"
      subtitle={`${rows.length} answers · phone, email or WhatsApp`}
      back={navigation.canGoBack()}
      padded={false}
    >
      <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm, gap: spacing.sm }}>
        <SearchField value={term} onChangeText={setTerm} placeholder="Search: cancel, wallet, coupon…" onClear={() => setTerm('')} />
        {online === false ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.warningBg }}>
            <Icon name="wifiOff" size={15} color={c.warning} />
            <Text variant="caption" color={c.warning} style={{ flex: 1 }}>
              The API is not reachable right now — order actions will fail until it is back.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl }}>
        {/* Contact channels */}
        <View style={styles.channelRow}>
          {(
            [
              { key: 'phone', label: 'Call', value: SUPPORT_PHONE, icon: 'phone' as IconName, channel: 'phone' as const },
              { key: 'email', label: 'Email', value: 'support@aurasure.app', icon: 'mail' as IconName, channel: 'email' as const },
              { key: 'wa', label: 'WhatsApp', value: SUPPORT_PHONE, icon: 'chat' as IconName, channel: 'wa' as const },
            ]
          ).map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              onPress={() => {
                haptic.light();
                void contact(row.channel);
              }}
              style={({ pressed }) => [styles.channel, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.92 : 1 }]}
            >
              <View style={[styles.channelIcon, { backgroundColor: c.primarySoft }]}>
                <Icon name={row.icon} size={16} color={c.primary} />
              </View>
              <Text variant="caption" weight="bold">
                {row.label}
              </Text>
              <Text variant="micro" tone="faint" numberOfLines={1}>
                {row.value}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* FAQ */}
        <ListSection title={`FREQUENT QUESTIONS · ${rows.length}`}>
          {rows.length === 0 ? (
            <View style={{ padding: spacing.md, gap: 6 }}>
              <Text variant="bodySm" tone="muted">
                Nothing matches “{term}”. Try “cancel”, “wallet” or “coupon”, or write to us below.
              </Text>
              <Button title="Clear search" size="sm" variant="secondary" onPress={() => setTerm('')} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : (
            rows.map((faq, index) => {
              const expanded = open === faq.q;
              return (
                <Pressable
                  key={faq.q}
                  accessibilityRole="button"
                  onPress={() => {
                    haptic.selection();
                    setOpen(expanded ? null : faq.q);
                  }}
                  style={({ pressed }) => [styles.faq, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
                >
                  <View style={[styles.faqIcon, { backgroundColor: expanded ? c.primary : c.primarySoft }]}>
                    <Icon name={faq.icon} size={15} color={expanded ? c.onPrimary : c.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="bodySm" weight="bold">
                      {faq.q}
                    </Text>
                    {expanded ? (
                      <Text variant="caption" tone="muted">
                        {faq.a}
                      </Text>
                    ) : (
                      <Text variant="micro" tone="faint" numberOfLines={1}>
                        {faq.a.slice(0, 64)}…
                      </Text>
                    )}
                  </View>
                  <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={15} color={c.textTertiary} />
                  {index < rows.length - 1 ? <View style={styles.hair} /> : null}
                </Pressable>
              );
            })
          )}
        </ListSection>

        {/* Write to us */}
        <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: spacing.sm }}>
          <Text variant="subtitle" weight="bold">
            Write to us
          </Text>
          <Input label="What happened?" value={ticket} onChangeText={setTicket} multiline placeholder="Order AUR-FD-1042 arrived without the dip. The store did not answer." hint="No ticket API exists on this build — we will not pretend otherwise" icon="chat" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Prepare message" icon="arrowUpRight" onPress={() => void sendTicket()} style={{ flex: 1 }} />
            <Button title="Order history" variant="secondary" icon="orders" onPress={() => navigation.navigate('Tabs')} />
          </View>
        </View>

        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceHi, gap: 4 }}>
          <Text variant="overline" tone="faint">
            SERVICE STATE
          </Text>
          <MetaRow label="API" value={online === false ? 'Unreachable' : 'Responding'} tone={online === false ? 'danger' : 'success'} />
          <MetaRow label="Your role" value={user ? `${user.name} · customer` : 'Guest'} />
          <MetaRow label="Wallet" value={money(user?.wallet ?? 0)} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <Tag label="Mon-Sat · 9:00-21:00" icon="clock" tone="muted" />
            <Tag label="Answers in ~15 min" icon="zap" tone="muted" />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  channelRow: { flexDirection: 'row', gap: 6 },
  channel: { flex: 1, alignItems: 'center', gap: 4, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  channelIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  faq: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.sm, position: 'relative' },
  faqIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  hair: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 1, backgroundColor: 'rgba(120,100,118,0.12)' },
});
