import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { useInAppUpdates } from '@/lib/inAppUpdates';

/**
 * Play Store in-app update prompt for the Vendor app. The update downloads and
 * installs right here — the vendor never has to leave the app for the Play
 * Store. Same bottom-sheet visual language as the rest of the app.
 */
export function InAppUpdateGate(): React.ReactElement | null {
  const { phase, info, start, dismiss } = useInAppUpdates();
  const insets = useSafeAreaInsets();

  if (phase !== 'available' || !info) return null;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => void dismiss()}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => void dismiss()} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 8 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={styles.iconWrap}>
              <Icon name="download" size={22} color={colors.brand[600]} />
            </View>
            <View style={styles.headingCopy}>
              <Text variant="h2" weight="bold">
                New version available
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.message}>
                A new version of Aurasure Vendor is ready. Install it right here — you don't need to
                open the Play Store.
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button title="Update now" leftIcon="download" onPress={() => void start()} />
            <Button title="Later" variant="secondary" onPress={() => void dismiss()} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    marginBottom: 18,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingCopy: { flex: 1 },
  message: { marginTop: 6, paddingRight: 4 },
  actions: { gap: 10, marginTop: 22 },
});
