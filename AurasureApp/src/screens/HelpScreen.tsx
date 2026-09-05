import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input, SearchField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { ListSection, MetaRow } from '@/components/list/ListRow';
import { Tag } from '@/components/ui/Primitives';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { useAppSettings } from '@/hooks/useAppSettings';
import { createSupportTicket, fetchFaqs, fetchMyTickets, type FaqItem } from '@/api/app';
import { ApiError } from '@/api/client';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Nav } from '@/navigation/types';

const TICKET_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'muted' },
  resolved: { label: 'Resolved', tone: 'success' },
};

/** Help centre: searchable FAQ + contact channels + support tickets, all server-driven. */
export function HelpScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const { online, user, isLoggedIn } = useSession();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [ticket, setTicket] = useState('');
  const [sending, setSending] = useState(false);

  const settings = useAppSettings();
  const support = settings.data?.support;
  const phone = support?.phone ?? '+919000000000';
  const displayPhone = support?.displayPhone ?? phone;
  const email = support?.email ?? 'support@aurasure.app';

  const faqs = useQuery<FaqItem[]>(useCallback((signal: AbortSignal) => fetchFaqs(signal), []), {});
  const tickets = useQuery(useCallback((signal: AbortSignal) => fetchMyTickets(signal), []), { enabled: isLoggedIn });

  const allFaqs = useMemo(() => faqs.data ?? [], [faqs.data]);
  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return allFaqs;
    return allFaqs.filter((faq) => `${faq.q} ${faq.a} ${(faq.match ?? []).join(' ')}`.toLowerCase().includes(needle));
  }, [term, allFaqs]);

  const contact = async (channel: 'phone' | 'email' | 'wa'): Promise<void> => {
    const targets = {
      phone: `tel:${phone}`,
      email: `mailto:${email}?subject=Aurasure customer support&body=${encodeURIComponent(`Order / issue details:\n\n(phone: ${user?.phone ?? ''})`)}`,
      wa: `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hi Aurasure, I need help with my order.')}`,
    } as const;
    try {
      await Linking.openURL(targets[channel]);
    } catch {
      sheet.info('Opening not supported here', `This device could not open that link. Support number: ${displayPhone}`);
    }
  };

  const sendTicket = async (): Promise<void> => {
    if (!isLoggedIn) {
      sheet.show({
        title: 'Sign in first',
        message: 'Support tickets are linked to your account so replies find you.',
        icon: 'user',
        tone: 'info',
        dismissLabel: 'Later',
        actions: [{ label: 'Sign in', onPress: () => navigation.navigate('Auth', { mode: 'login' }), variant: 'primary' }],
      });
      return;
    }
    if (ticket.trim().length < 12) {
      sheet.warning('Tell us a bit more', 'A sentence or two about what happened helps us find your order.');
      return;
    }
    setSending(true);
    try {
      const created = await createSupportTicket(ticket.trim());
      setTicket('');
      tickets.refresh();
      haptic.success();
      sheet.success('Message sent', `Ticket ${created.id} is with our team. Replies appear under Notifications.`);
    } catch (error) {
      sheet.error('Could not send', error instanceof ApiError ? error.message : 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
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
              { key: 'phone', label: 'Call', value: displayPhone, icon: 'phone' as IconName, channel: 'phone' as const },
              { key: 'email', label: 'Email', value: email, icon: 'mail' as IconName, channel: 'email' as const },
              { key: 'wa', label: 'WhatsApp', value: displayPhone, icon: 'chat' as IconName, channel: 'wa' as const },
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
              <Text variant="caption" weight="semibold">
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
          {faqs.loading ? (
            <View style={{ padding: spacing.md }}>
              <SkeletonList rows={4} thumb={30} />
            </View>
          ) : faqs.error ? (
            <View style={{ padding: spacing.md, gap: 6 }}>
              <Text variant="bodySm" tone="muted">
                Answers could not be loaded ({faqs.error.message}). The contact channels above still work.
              </Text>
              <Button title="Retry" size="sm" variant="secondary" onPress={() => faqs.refetch()} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : rows.length === 0 ? (
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
                    <Text variant="bodySm" weight="semibold">
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
          <Text variant="subtitle" weight="semibold">
            Write to us
          </Text>
          <Input label="What happened?" value={ticket} onChangeText={setTicket} multiline placeholder="Order AUR-FD-1042 arrived without the dip. The store did not answer." hint={`Replies land under Notifications${support ? ` · answers in ~${support.slaMinutes} min` : ''}`} icon="chat" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={sending ? 'Sending…' : 'Send message'} icon="send" loading={sending} onPress={() => void sendTicket()} style={{ flex: 1 }} />
            <Button title="Order history" variant="secondary" icon="orders" onPress={() => navigation.navigate('Tabs')} />
          </View>
        </View>

        {/* Ticket history */}
        {isLoggedIn && (tickets.data?.length ?? 0) > 0 ? (
          <ListSection title={`YOUR MESSAGES · ${tickets.data?.length ?? 0}`}>
            {(tickets.data ?? []).map((item) => {
              const status = TICKET_STATUS[item.status] ?? TICKET_STATUS.open!;
              return (
                <View key={item.id} style={{ padding: spacing.sm, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="micro" tone="faint" style={{ flex: 1 }}>
                      {item.id}
                      {item.orderCode ? ` · ${item.orderCode}` : ''}
                    </Text>
                    <Tag label={status.label} tone={status.tone} />
                  </View>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {item.message}
                  </Text>
                  {item.response ? (
                    <View style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.primaryFaint, gap: 2 }}>
                      <Text variant="micro" weight="semibold" color={c.primary}>
                        Support replied
                      </Text>
                      <Text variant="caption" tone="muted">
                        {item.response}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ListSection>
        ) : null}

        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceHi, gap: 4 }}>
          <Text variant="overline" tone="faint">
            SERVICE STATE
          </Text>
          <MetaRow label="API" value={online === false ? 'Unreachable' : 'Responding'} tone={online === false ? 'danger' : 'success'} />
          <MetaRow label="Your role" value={user ? `${user.name} · customer` : 'Guest'} />
          <MetaRow label="Wallet" value={money(user?.wallet ?? 0)} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <Tag label={support?.hours ?? 'Mon–Sat · 9:00–21:00'} icon="clock" tone="muted" />
            <Tag label={`Answers in ~${support?.slaMinutes ?? 15} min`} icon="zap" tone="muted" />
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
