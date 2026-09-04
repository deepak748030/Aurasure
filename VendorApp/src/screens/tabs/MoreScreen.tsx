import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { useVendor } from '@/context/VendorContext';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      variant="overline"
      color={colors.textTertiary}
      style={{ marginTop: 20, marginBottom: 8, marginHorizontal: 4 }}
    >
      {label}
    </Text>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  chevron = true,
  iconBg,
  iconColor,
  last,
}: {
  icon: IconName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  chevron?: boolean;
  iconBg?: string;
  iconColor?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { haptic.light(); onPress?.(); }}
      style={({ pressed }) => [
        styles.menuItem,
        !last && { borderBottomWidth: 1, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg ?? colors.brand[50] }]}>
        <Icon name={icon} size={18} color={iconColor ?? colors.brand[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" weight="semibold">{label}</Text>
        {sublabel ? (
          <Text variant="caption" color={colors.textSecondary}>{sublabel}</Text>
        ) : null}
      </View>
      {chevron ? <Icon name="chevronRight" size={18} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

function IssueCard({ issue }: { issue: { id: string; title: string; body: string; status: string } }) {
  const statusColor = issue.status === 'open' ? colors.warning : colors.success;
  return (
    <View style={styles.issueCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="title" weight="semibold" style={{ flex: 1, marginRight: 8 }}>{issue.title}</Text>
        <View style={[styles.issueBadge, { backgroundColor: statusColor + '18' }]}>
          <Text variant="caption" weight="bold" style={{ color: statusColor, textTransform: 'capitalize' }}>
            {issue.status}
          </Text>
        </View>
      </View>
      {issue.body ? (
        <Text variant="caption" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 4 }}>
          {issue.body}
        </Text>
      ) : null}
    </View>
  );
}

export function MoreScreen(): React.ReactElement {
  const { vendor, logout, refresh } = useVendor();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);

  const issues = vendor?.issues ?? [];
  const openIssues = issues.filter((i) => i.status === 'open');

  const sendIssue = async () => {
    if (!title.trim()) {
      setMsg('Please describe what is broken.');
      setMsgOk(false);
      haptic.error();
      return;
    }
    setBusy(true);
    try {
      await vendorApi.issue(title.trim(), body.trim());
      await refresh();
      setTitle('');
      setBody('');
      setMsg('Ticket sent to admin. We will reply on your phone.');
      setMsgOk(true);
      setShowIssueForm(false);
      haptic.success();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to send');
      setMsgOk(false);
      haptic.error();
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to manage orders.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Screen title="More" subtitle={vendor?.outletName ?? vendor?.phone}>
      {/* Wallet hero */}
      <LinearGradient
        colors={[colors.brand[700], colors.brand[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletCard}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.walletIcon}>
            <Icon name="wallet" size={22} color={colors.brand[700]} />
          </View>
          <View>
            <Text variant="caption" color="rgba(255,255,255,0.72)" weight="semibold">
              SETTLEMENT WALLET
            </Text>
            <Text variant="h1" weight="extrabold" color={colors.white}>
              ₹{Math.round(vendor?.payoutBalance ?? 0)}
            </Text>
          </View>
        </View>
        <Text variant="bodySm" color="rgba(255,255,255,0.65)" style={{ marginTop: 10 }}>
          Credited per delivered order. Platform commission: 5% of item total (not delivery fee).
        </Text>
      </LinearGradient>

      {/* Profile info */}
      <SectionLabel label="OUTLET" />
      <View style={styles.section}>
        <MenuItem
          icon="store"
          label={vendor?.outletName || 'Outlet name not set'}
          sublabel={vendor?.module === 'food' ? 'Food Kitchen' : 'Shop'}
          chevron={false}
        />
        <MenuItem
          icon="phone"
          label={vendor?.phone ?? '—'}
          sublabel="Registered phone"
          chevron={false}
        />
        {vendor?.email ? (
          <MenuItem
            icon="mail"
            label={vendor.email}
            sublabel="Email"
            chevron={false}
            last
          />
        ) : (
          <MenuItem
            icon="mapPin"
            label={vendor?.city ? `${vendor.city}${vendor.pin ? ` · ${vendor.pin}` : ''}` : 'Address not set'}
            sublabel="Location"
            chevron={false}
            last
          />
        )}
      </View>

      {/* Operating hours */}
      {vendor?.hours ? (
        <>
          <SectionLabel label="OPERATING HOURS" />
          <View style={styles.section}>
            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <View style={[styles.menuIcon, { backgroundColor: colors.warningBg }]}>
                <Icon name="clock" size={18} color={colors.warning} />
              </View>
              <Text variant="title" weight="semibold">
                {vendor.hours.open} – {vendor.hours.close}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {/* Open issues */}
      {openIssues.length > 0 ? (
        <>
          <SectionLabel label={`OPEN ISSUES (${openIssues.length})`} />
          {openIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </>
      ) : null}

      {/* Raise an issue */}
      <SectionLabel label="SUPPORT" />
      <View style={styles.section}>
        <MenuItem
          icon="circleAlert"
          label="Raise an Issue"
          sublabel="Payout, rider, wrong menu…"
          onPress={() => setShowIssueForm((v) => !v)}
          last
        />
      </View>

      {showIssueForm ? (
        <View style={{ marginTop: 8 }}>
          <Input
            label="What's broken?"
            value={title}
            onChangeText={setTitle}
            placeholder="Payout, rider, wrong menu…"
            leftIcon="circleAlert"
          />
          <Input
            label="Details"
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Tell us exactly what happened..."
          />
          {msg ? (
            <Text
              variant="caption"
              color={msgOk ? colors.success : colors.danger}
              style={{ marginBottom: 10 }}
            >
              {msg}
            </Text>
          ) : null}
          <Button title="Send to Admin" loading={busy} onPress={() => void sendIssue()} />
        </View>
      ) : null}

      {/* All issue history */}
      {issues.length > 0 && !showIssueForm ? (
        <>
          <SectionLabel label="ISSUE HISTORY" />
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </>
      ) : null}

      {/* Danger zone */}
      <SectionLabel label="ACCOUNT" />
      <View style={styles.section}>
        <MenuItem
          icon="refresh"
          label="Refresh Profile"
          sublabel="Sync latest status from server"
          iconBg={colors.brand[50]}
          onPress={() => void refresh()}
        />
        <MenuItem
          icon="logout"
          label="Sign Out"
          sublabel="You will need to sign in again"
          iconBg={colors.dangerBg}
          iconColor={colors.danger}
          onPress={handleLogout}
          last
        />
      </View>

      <View style={{ height: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  walletCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
