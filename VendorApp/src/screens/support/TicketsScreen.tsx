import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';
import { Badge, Card, Divider, EmptyState, SectionTitle } from '@/components/ui/VendorUI';
import { Icon, type IconName } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { useVendorModal } from '@/components/ui/VendorModal';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tickets'>;

const TOPICS_FOOD: { key: string; label: string; icon: IconName; hint: string }[] = [
  { key: 'Payout', label: 'Payout', icon: 'wallet', hint: 'Settlement missing or amount looks wrong' },
  { key: 'Rider', label: 'Rider', icon: 'bike', hint: 'Pickup delay, no rider assigned' },
  { key: 'Order', label: 'Order', icon: 'orders', hint: 'Cancel, refund or a stuck order' },
  { key: 'Menu', label: 'Menu', icon: 'utensils', hint: 'Item pending approval or wrong price' },
  { key: 'Account', label: 'Account', icon: 'user', hint: 'KYC, bank details or login' },
  { key: 'Other', label: 'Other', icon: 'helpCircle', hint: 'Anything else' },
];
const TOPICS_SHOP: { key: string; label: string; icon: IconName; hint: string }[] = [
  { key: 'Payout', label: 'Payout', icon: 'wallet', hint: 'Settlement missing or amount looks wrong' },
  { key: 'Rider', label: 'Rider', icon: 'bike', hint: 'Pickup delay, no delivery partner assigned' },
  { key: 'Order', label: 'Order', icon: 'orders', hint: 'Cancel, refund or a stuck order' },
  { key: 'Catalogue', label: 'Catalogue', icon: 'package', hint: 'Product pending approval or wrong price' },
  { key: 'Account', label: 'Account', icon: 'user', hint: 'KYC, bank details or login' },
  { key: 'Other', label: 'Other', icon: 'helpCircle', hint: 'Anything else' },
];

const STATUS: Record<string, { label: string; color: string; background: string }> = {
  open: { label: 'OPEN', color: colors.warning, background: colors.warningBg },
  in_progress: { label: 'IN PROGRESS', color: colors.info, background: colors.infoBg },
  resolved: { label: 'RESOLVED', color: colors.success, background: colors.successBg },
};

/** Raise a support ticket and track every ticket already raised by this outlet. */
export function TicketsScreen({ navigation }: Props): React.ReactElement {
  const { showModal } = useVendorModal();
  const { vendor, refresh } = useVendor();
  const [topic, setTopic] = useState('Order');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const TOPICS = vendor?.module === 'food' ? TOPICS_FOOD : TOPICS_SHOP;
  const tickets = useMemo(() => vendor?.issues ?? [], [vendor?.issues]);
  const open = tickets.filter((ticket) => ticket.status !== 'resolved');
  const resolved = tickets.filter((ticket) => ticket.status === 'resolved');
  const selected = TOPICS.find((entry) => entry.key === topic);

  const submit = async (): Promise<void> => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 5) { setError('Add a short summary — at least a few words.'); return; }
    if (detail.trim().length < 10) { setError('Tell us a little more so we can find the order.'); return; }
    setBusy(true);
    try {
      await vendorApi.issue(`${topic}: ${cleanTitle}`, detail.trim());
      await refresh();
      setTitle(''); setDetail(''); setError('');
      haptic.success();
      showModal({ title: 'Ticket sent', message: 'Our team has it. Replies show up on this screen and on your account.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send this ticket');
      haptic.error();
    } finally {
      setBusy(false);
    }
  };

  const renderTicket = (ticket: { id: string; title: string; body: string; status: string; createdAt?: string }, index: number): React.ReactElement => {
    const tone = STATUS[ticket.status] ?? { label: 'OPEN', color: colors.warning, background: colors.warningBg };
    return (
      <React.Fragment key={ticket.id}>
        {index ? <Divider /> : null}
        <View style={styles.ticket}>
          <View style={styles.ticketHead}>
            <Text variant="bodySm" weight="bold" style={{ flex: 1 }}>{ticket.title}</Text>
            <Badge label={tone.label} color={tone.color} background={tone.background} />
          </View>
          {ticket.body ? <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 6 }}>{ticket.body}</Text> : null}
          {ticket.createdAt ? (
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>
              Raised {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          ) : null}
        </View>
      </React.Fragment>
    );
  };

  return (
    <Screen title="Support tickets" subtitle={open.length ? `${open.length} open with our team` : 'Raise an issue and track the reply'} headerLeft={<BackButton onPress={() => navigation.goBack()} />} onRefresh={() => void refresh()}>
      <SectionTitle title="What is this about?" />
      <View style={styles.topics}>
        {TOPICS.map((entry) => {
          const active = entry.key === topic;
          return (
            <Pressable
              key={entry.key}
              onPress={() => { haptic.light(); setTopic(entry.key); setError(''); }}
              style={[styles.topic, active && styles.topicActive]}
            >
              <Icon name={entry.icon} size={17} color={active ? colors.white : colors.brand[600]} />
              <Text variant="caption" weight="bold" color={active ? colors.white : colors.text}>{entry.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>{selected.hint}</Text> : null}

      <Card style={{ marginTop: 14 }}>
        <Input label="Summary" value={title} onChangeText={(text) => { setTitle(text); setError(''); }} placeholder="e.g. Settlement for AUR-VD-40006 not received" />
        <Input label="What happened?" value={detail} onChangeText={(text) => { setDetail(text); setError(''); }} multiline placeholder="Include the order code, amount and dates if useful" />
        {error ? <Text variant="caption" color={colors.danger} style={{ marginBottom: 10 }}>{error}</Text> : null}
        <Button title="Send support ticket" leftIcon="send" loading={busy} onPress={() => void submit()} />
        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 10 }}>
          Tickets are linked to {vendor?.outletName || 'your outlet'}, so replies always find you.
        </Text>
      </Card>

      <SectionTitle title="Open tickets" action={open.length ? `${open.length}` : undefined} />
      {open.length === 0 ? (
        <Card>
          <EmptyState icon="circleCheck" title="Nothing pending" body="You have no open tickets with our team right now." />
        </Card>
      ) : (
        <Card style={styles.listCard}>{open.map(renderTicket)}</Card>
      )}

      {resolved.length ? (
        <>
          <SectionTitle title="Resolved" action={`${resolved.length}`} />
          <Card style={styles.listCard}>{resolved.slice(0, 10).map(renderTicket)}</Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  topicActive: { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
  listCard: { paddingVertical: 2, paddingHorizontal: 14 },
  ticket: { paddingVertical: 14 },
  ticketHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
