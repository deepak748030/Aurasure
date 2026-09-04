import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { Icon } from '@/lib/icons';

export interface VendorModalAction {
  label: string;
  onPress?: () => void | Promise<void>;
  destructive?: boolean;
  secondary?: boolean;
}
export interface VendorModalOptions {
  title: string;
  message?: string;
  actions?: VendorModalAction[];
}
interface ModalContextValue { showModal: (options: VendorModalOptions) => void; hideModal: () => void; }
const ModalContext = createContext<ModalContextValue | null>(null);

export function VendorModalProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [options, setOptions] = useState<VendorModalOptions | null>(null);
  const showModal = useCallback((next: VendorModalOptions) => setOptions(next), []);
  const hideModal = useCallback(() => setOptions(null), []);
  const value = useMemo(() => ({ showModal, hideModal }), [showModal, hideModal]);
  const insets = useSafeAreaInsets();
  const choose = (action: VendorModalAction): void => {
    hideModal();
    haptic.light();
    void action.onPress?.();
  };
  return <ModalContext.Provider value={value}>
    {children}
    <Modal visible={Boolean(options)} transparent animationType="slide" onRequestClose={hideModal} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={hideModal} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.handle} />
          <View style={styles.heading}><View style={styles.headingIcon}><Icon name="info" size={18} color={colors.brand[700]} /></View><View style={{ flex: 1 }}><Text variant="h2" weight="bold">{options?.title}</Text>{options?.message ? <Text variant="body" color={colors.textSecondary} style={styles.message}>{options.message}</Text> : null}</View><Pressable onPress={hideModal} hitSlop={10} style={styles.close}><Icon name="x" size={19} color={colors.textSecondary} /></Pressable></View>
          <ScrollView style={styles.actionsScroll} contentContainerStyle={styles.actions} showsVerticalScrollIndicator={false}>{(options?.actions?.length ? options.actions : [{ label: 'Close', secondary: true }]).map((action, index) => <Pressable key={`${action.label}-${index}`} onPress={() => choose(action)} style={({ pressed }) => [styles.action, { backgroundColor: action.destructive ? colors.danger : action.secondary ? colors.surfaceAlt : colors.brand[600], borderColor: action.destructive ? colors.danger : action.secondary ? colors.border : colors.brand[600] }, pressed && { opacity: 0.78 }]}><Text variant="button" weight="bold" color={action.secondary ? colors.text : colors.white}>{action.label}</Text></Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </ModalContext.Provider>;
}

export function useVendorModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useVendorModal must be used inside VendorModalProvider');
  return context;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.md, paddingTop: 10, maxHeight: '86%' },
  handle: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: 5, paddingRight: 8 },
  close: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  actionsScroll: { maxHeight: 360 },
  actions: { gap: 9, marginTop: 22, paddingBottom: 2 },
  action: { minHeight: 50, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
