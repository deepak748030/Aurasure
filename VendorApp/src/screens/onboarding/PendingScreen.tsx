import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card, Badge, Divider } from '@/components/ui/VendorUI';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';

const COPY: Record<string, { title: string; body: string }> = {
  submitted: { title: 'Application submitted', body: 'Our team is checking your outlet and each document. We will update this screen when there is movement.' },
  under_review: { title: 'Review in progress', body: 'A reviewer is checking the details. Keep your phone handy in case we need a sharper photo.' },
  needs_info: { title: 'One update needed', body: 'Replace the document called out below. Your other steps are saved.' },
  rejected: { title: 'Let’s fix this', body: 'Read the reviewer note, update the relevant step, then submit again.' },
  suspended: { title: 'Outlet paused by Aurasure', body: 'This outlet cannot receive orders while the account is suspended. Contact support for help.' },
};

const STEPS = [
  { key: 'submitted', label: 'Submitted', body: 'Your documents are with our team' },
  { key: 'under_review', label: 'Under review', body: 'KYC and outlet details are being checked' },
  { key: 'approved', label: 'Approved', body: 'Orders unlock after approval' },
] as const;

export function PendingScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const { vendor, refresh, logout } = useVendor();
  const status = vendor?.status ?? 'submitted';
  const copy = COPY[status] || { title: 'Application status', body: 'Refresh to see the latest status from Aurasure.' };
  const docs = vendor?.documents ?? [];
  const alert = status === 'rejected' || status === 'needs_info';
  const verified = docs.filter((doc) => doc.verified).length;
  const canEdit = status === 'needs_info' || status === 'rejected';

  return (
    <Screen title="Verification" subtitle={vendor?.outletName || 'Vendor application'} onRefresh={() => void refresh()}>
      <Card tone="warm" style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name={alert ? 'circleAlert' : 'shield'} size={26} color={status === 'rejected' ? colors.warning : colors.brand[700]} />
        </View>
        <Badge
          label={status.replace(/_/g, ' ').toUpperCase()}
          color={status === 'rejected' ? colors.warning : colors.brand[700]}
          background={status === 'rejected' ? colors.warningBg : colors.brand[50]}
        />
        <Text variant="h2" weight="bold" style={styles.heroTitle}>{copy.title}</Text>
        <Text variant="bodySm" color={colors.textSecondary} style={styles.heroBody}>{copy.body}</Text>
        {vendor?.reviewNote ? (
          <View style={styles.note}>
            <Text variant="overline" color={colors.warning}>REVIEWER NOTE</Text>
            <Text variant="bodySm" color={colors.text} style={{ marginTop: 4 }}>{vendor.reviewNote}</Text>
          </View>
        ) : null}
      </Card>

      <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>APPLICATION TIMELINE</Text>
      <Card style={styles.timelineCard}><Timeline status={status} /></Card>

      <View style={styles.sectionHead}>
        <Text variant="overline" color={colors.textTertiary}>DOCUMENT CHECKLIST</Text>
        {docs.length ? <Text variant="caption" color={colors.textTertiary}>{verified}/{docs.length} verified</Text> : null}
      </View>
      <Card style={styles.listCard}>
        {docs.length === 0 ? (
          <View style={styles.docEmpty}>
            <Text variant="bodySm" color={colors.textSecondary}>No documents on this application yet.</Text>
          </View>
        ) : docs.map((doc, index) => {
          const tone = doc.verified ? colors.success : doc.uri ? colors.warning : colors.danger;
          const state = doc.verified ? 'Verified' : doc.uri ? 'Reviewing' : 'Missing';
          return (
            <React.Fragment key={doc.key}>
              <View style={styles.doc}>
                <Icon name={doc.verified ? 'circleCheck' : doc.uri ? 'clock' : 'circleAlert'} size={18} color={tone} />
                <View style={styles.docText}>
                  <Text variant="bodySm" weight="semibold">{doc.label}</Text>
                  {doc.note ? <Text variant="caption" color={colors.danger} style={{ marginTop: 2 }}>{doc.note}</Text> : null}
                </View>
                <Text variant="caption" weight="bold" color={tone} style={styles.docState}>{state}</Text>
              </View>
              {index < docs.length - 1 ? <Divider /> : null}
            </React.Fragment>
          );
        })}
      </Card>

      <View style={styles.actions}>
        {canEdit ? <Button title="Update application" onPress={() => navigation.navigate('Onboarding')} /> : null}
        <Button title="Refresh status" variant="secondary" style={canEdit ? { marginTop: 10 } : undefined} onPress={() => void refresh()} />
        <Button title="Sign out" variant="ghost" style={{ marginTop: 10 }} onPress={logout} />
      </View>
    </Screen>
  );
}

function Timeline({ status }: { status: string }): React.ReactElement {
  const active = status === 'needs_info' || status === 'rejected' ? 1 : Math.max(0, STEPS.findIndex((step) => step.key === status));
  return (
    <View>
      {STEPS.map((step, index) => {
        const done = index <= active;
        const last = index === STEPS.length - 1;
        return (
          <View key={step.key} style={styles.timeRow}>
            <View style={styles.timeRail}>
              <View style={[styles.timeDot, { backgroundColor: done ? colors.brand[600] : colors.surface, borderColor: done ? colors.brand[600] : colors.border }]}>
                {done ? <Icon name="check" size={12} color={colors.white} /> : null}
              </View>
              {!last ? <View style={[styles.timeLine, { backgroundColor: index < active ? colors.brand[600] : colors.border }]} /> : null}
            </View>
            <View style={[styles.timeText, last ? null : { paddingBottom: 20 }]}>
              <Text variant="bodySm" weight="bold" color={done ? colors.text : colors.textSecondary}>{step.label}</Text>
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>{step.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, marginTop: 4 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { marginTop: 12, textAlign: 'center' },
  heroBody: { marginTop: 6, textAlign: 'center', maxWidth: 300 },
  note: { width: '100%', backgroundColor: colors.warningBg, padding: 12, borderRadius: 12, marginTop: 16 },
  sectionLabel: { marginTop: 26, marginBottom: 10 },
  sectionHead: { marginTop: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineCard: { paddingVertical: 18, paddingHorizontal: 16 },
  listCard: { paddingVertical: 2, paddingHorizontal: 16 },
  timeRow: { flexDirection: 'row' },
  timeRail: { width: 32, alignItems: 'center' },
  timeDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  timeLine: { flex: 1, width: 2, minHeight: 22, marginVertical: 2 },
  timeText: { flex: 1, paddingLeft: 4, marginTop: -1 },
  doc: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14 },
  docText: { flex: 1 },
  docState: { textAlign: 'right' },
  docEmpty: { paddingVertical: 18 },
  actions: { marginTop: 22 },
});
