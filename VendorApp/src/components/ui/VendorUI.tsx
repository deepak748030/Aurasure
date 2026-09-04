import React from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { Text } from './Text';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/types';

export function Card({ children, style, tone = 'plain' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'plain' | 'warm' | 'dark' }): React.ReactElement {
  return <View style={[styles.card, tone === 'warm' && styles.warmCard, tone === 'dark' && styles.darkCard, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }): React.ReactElement {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="h3" weight="bold">{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text variant="caption" weight="bold" color={colors.brand[600]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function Badge({ label, color = colors.brand[600], background = colors.brand[50] }: { label: string; color?: string; background?: string }): React.ReactElement {
  return <View style={[styles.badge, { backgroundColor: background }]}><Text variant="caption" weight="bold" color={color}>{label}</Text></View>;
}

export function IconButton({ icon, onPress, color = colors.text, background = colors.surface, size = 40 }: { icon: IconName; onPress?: () => void; color?: string; background?: string; size?: number }): React.ReactElement {
  return <Pressable onPress={() => { haptic.light(); onPress?.(); }} hitSlop={6} style={({ pressed }) => [styles.iconButton, { width: size, height: size, borderRadius: size / 3, backgroundColor: background }, pressed && { opacity: 0.7 }]}><Icon name={icon} size={20} color={color} /></Pressable>;
}

export function Divider({ space = 0 }: { space?: number } = {}): React.ReactElement {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space }} />;
}

export function EmptyState({ icon, title, body, action, onAction }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void }): React.ReactElement {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon name={icon} size={30} color={colors.brand[500]} /></View>
      <Text variant="h3" weight="bold" style={{ marginTop: 14, textAlign: 'center' }}>{title}</Text>
      <Text variant="bodySm" color={colors.textSecondary} style={{ marginTop: 6, textAlign: 'center', maxWidth: 290 }}>{body}</Text>
      {action ? <Pressable onPress={onAction} style={styles.emptyAction}><Text variant="button" color={colors.white}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function RowButton({ icon, title, subtitle, onPress, destructive = false }: { icon: IconName; title: string; subtitle?: string; onPress?: () => void; destructive?: boolean }): React.ReactElement {
  return (
    <Pressable onPress={() => { haptic.light(); onPress?.(); }} style={({ pressed }) => [styles.rowButton, pressed && { backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.dangerBg : colors.brand[50] }]}><Icon name={icon} size={19} color={destructive ? colors.danger : colors.brand[600]} /></View>
      <View style={{ flex: 1 }}><Text variant="title" weight="semibold" color={destructive ? colors.danger : colors.text}>{title}</Text>{subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}</View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }): React.ReactElement {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetOverlay} onPress={onClose}><Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}><View style={styles.handle} />{children}</Pressable></Pressable></Modal>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  warmCard: { backgroundColor: colors.surfaceWarm, borderColor: '#F1DCC5' },
  darkCard: { backgroundColor: colors.brand[800], borderColor: colors.brand[800] },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 56 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand[50] },
  emptyAction: { backgroundColor: colors.brand[600], borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, marginTop: 18 },
  rowButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 28, maxHeight: '86%' },
  handle: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: spacing.md },
});
