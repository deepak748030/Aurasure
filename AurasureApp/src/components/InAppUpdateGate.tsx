import React from 'react';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/sheet/Sheet';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { useInAppUpdates } from '@/lib/inAppUpdates';

/**
 * Renders the in-app update prompt when the Play Store has a newer build.
 * The sheet is the app's only alert surface (no `Alert.alert` anywhere), so
 * the update CTA lives in the same bottom sheet as every other message.
 */
export function InAppUpdateGate(): React.ReactElement | null {
  const c = useColors();
  const { phase, info, start, dismiss } = useInAppUpdates();

  if (phase !== 'available' || !info) return null;

  return (
    <Sheet
      visible
      onClose={() => void dismiss()}
      title="New version available"
      subtitle={info.updateInProgress ? 'Download in progress' : `Version ${info.storeVersion}`}
      icon="download"
      iconTint={c.info}
      dismissLabel="Later"
      actions={[
        {
          label: 'Update now',
          variant: 'primary',
          icon: 'download',
          onPress: () => void start(),
        },
      ]}
    >
      <Text variant="body" color={c.textSecondary} style={{ paddingBottom: spacing.sm }}>
        A new version of Aurasure is ready. Download and install it right here — you don't need to
        open the Play Store.
      </Text>
      {info.flexibleAllowed && !info.immediateAllowed ? (
        <Text variant="bodySm" color={c.textTertiary} style={{ paddingBottom: spacing.sm }}>
          The update downloads in the background, then a quick restart installs it.
        </Text>
      ) : null}
    </Sheet>
  );
}
