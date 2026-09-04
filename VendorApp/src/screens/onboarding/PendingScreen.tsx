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
import { spacing } from '@/theme/tokens';

const COPY: Record<string, { title: string; body: string }> = {
  submitted: { title: 'Application submitted', body: 'Our team is checking your outlet and each document. We will update this screen when there is movement.' },
  under_review: { title: 'Review in progress', body: 'A reviewer is checking the details. Keep your phone handy in case we need a sharper photo.' },
  needs_info: { title: 'One update needed', body: 'Replace the document called out below. Your other steps are saved.' },
  rejected: { title: 'Let’s fix this', body: 'Read the reviewer note, update the relevant step, then submit again.' },
  suspended: { title: 'Outlet paused by Aurasure', body: 'This outlet cannot receive orders while the account is suspended. Contact support for help.' },
};
export function PendingScreen(): React.ReactElement {
  const navigation = useNavigation<any>(); const { vendor, refresh, logout } = useVendor(); const status = vendor?.status ?? 'submitted'; const copy = COPY[status] || { title: 'Application status', body: 'Refresh to see the latest status from Aurasure.' }; const docs = vendor?.documents ?? [];
  return <Screen title="Verification" subtitle={vendor?.outletName || 'Vendor application'} onRefresh={() => void refresh()}>
    <Card tone="warm" style={styles.hero}><View style={styles.heroIcon}><Icon name={status === 'rejected' || status === 'needs_info' ? 'circleAlert' : 'shield'} size={27} color={status === 'rejected' ? colors.warning : colors.brand[700]} /></View><Badge label={status.replace('_', ' ').toUpperCase()} color={status === 'rejected' ? colors.warning : colors.brand[700]} background={status === 'rejected' ? colors.warningBg : colors.brand[50]} /><Text variant="h2" weight="bold" style={{ marginTop: 14, textAlign: 'center' }}>{copy.title}</Text><Text variant="body" color={colors.textSecondary} style={{ marginTop: 7, textAlign: 'center' }}>{copy.body}</Text>{vendor?.reviewNote ? <View style={styles.note}><Text variant="caption" weight="bold" color={colors.warning}>REVIEWER NOTE</Text><Text variant="bodySm" color={colors.text} style={{ marginTop: 4 }}>{vendor.reviewNote}</Text></View> : null}</Card>
    <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 26, marginBottom: 8 }}>APPLICATION TIMELINE</Text><Timeline status={status} />
    <Text variant="overline" color={colors.textTertiary} style={{ marginTop: 26, marginBottom: 8 }}>DOCUMENT CHECKLIST</Text><Card style={{ paddingVertical: 4 }}>{docs.map((doc, index) => <React.Fragment key={doc.key}><View style={styles.doc}><Icon name={doc.verified ? 'circleCheck' : doc.uri ? 'clock' : 'circleAlert'} size={19} color={doc.verified ? colors.success : doc.uri ? colors.warning : colors.danger} /><View style={{ flex: 1 }}><Text variant="title" weight="semibold">{doc.label}</Text>{doc.note ? <Text variant="caption" color={colors.danger}>{doc.note}</Text> : null}</View><Text variant="caption" weight="bold" color={doc.verified ? colors.success : doc.uri ? colors.warning : colors.danger}>{doc.verified ? 'Verified' : doc.uri ? 'Reviewing' : 'Missing'}</Text></View>{index < docs.length - 1 ? <Divider /> : null}</React.Fragment>)}</Card>
    {status === 'needs_info' || status === 'rejected' ? <Button title="Update application" style={{ marginTop: 18 }} onPress={() => navigation.navigate('Onboarding')} /> : null}<Button title="Refresh status" variant="secondary" style={{ marginTop: 10 }} onPress={() => void refresh()} /><Button title="Sign out" variant="ghost" onPress={logout} />
  </Screen>;
}
function Timeline({ status }: { status: string }): React.ReactElement { const steps = ['submitted', 'under_review', 'approved']; const active = status === 'needs_info' || status === 'rejected' ? 1 : Math.max(0, steps.indexOf(status)); return <View style={styles.timeline}>{steps.map((step, index) => <View key={step} style={styles.timeRow}><View style={styles.timeRail}><View style={[styles.timeDot, { backgroundColor: index <= active ? colors.brand[600] : colors.border }]}>{index <= active ? <Icon name="check" size={12} color={colors.white} /> : null}</View>{index < steps.length - 1 ? <View style={[styles.timeLine, { backgroundColor: index < active ? colors.brand[600] : colors.border }]} /> : null}</View><View style={{ paddingBottom: index < steps.length - 1 ? 22 : 0 }}><Text variant="title" weight="bold">{step === 'under_review' ? 'Under review' : step.replace(/^./, (letter) => letter.toUpperCase())}</Text><Text variant="caption" color={colors.textSecondary}>{index === 0 ? 'Your documents are with our team' : index === 1 ? 'KYC and outlet details are being checked' : 'Orders unlock after approval'}</Text></View></View>)}</View>; }
const styles = StyleSheet.create({ hero: { alignItems: 'center', padding: 22 }, heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, note: { width: '100%', backgroundColor: colors.warningBg, padding: 12, borderRadius: 10, marginTop: 15 }, timeline: { paddingLeft: 2 }, timeRow: { flexDirection: 'row' }, timeRail: { width: 32, alignItems: 'center' }, timeDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, timeLine: { flex: 1, width: 2, minHeight: 25 }, doc: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 65 }, });
