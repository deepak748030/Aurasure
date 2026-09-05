import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Sheet, SheetOption, type SheetAction } from './Sheet';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { IconName } from '@/lib/icons';

/**
 * Imperative bottom-sheet API. The app has ZERO `Alert.alert` calls: anything
 * that would normally be an alert, a confirm dialog, a toast or an option list
 * goes through this queue and always appears from the bottom edge.
 */

export interface SheetRequest {
  title?: string;
  message?: string;
  subtitle?: string;
  icon?: IconName;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
  actions?: SheetAction[];
  dismissLabel?: string;
  /** Reveal the sheet behind a short delay - used for "order placed" style flows. */
  options?: { label: string; value: string; description?: string; icon?: IconName }[];
  /** Resolve payload for the chosen option (used by `pick`). */
  onOption?: (value: string) => void;
  dismissible?: boolean;
}

interface SheetApi {
  show: (request: SheetRequest) => void;
  hide: () => void;
  info: (title: string, message?: string, icon?: IconName) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  /** `await confirm({...})` → true when the primary action was tapped. */
  confirm: (request: { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; icon?: IconName }) => Promise<boolean>;
  /** Bottom option picker replacing native action sheets. */
  pick: (request: { title: string; subtitle?: string; options: { label: string; value: string; description?: string; icon?: IconName }[] }) => Promise<string | null>;
  open: boolean;
}

const SheetContext = createContext<SheetApi | null>(null);

const TONE_ICON: Record<NonNullable<SheetRequest['tone']>, IconName> = {
  neutral: 'info',
  success: 'circleCheck',
  danger: 'alert',
  warning: 'alert',
  info: 'info',
};

export function SheetProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const c = useColors();
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const resolver = useRef<((value: string | boolean | null) => void) | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    setRequest(null);
    const done = resolver.current;
    resolver.current = null;
    if (done) done(false);
  }, []);

  const show = useCallback((next: SheetRequest) => {
    haptic.light();
    setRequest(next);
    setVisible(true);
  }, []);

  const api = useMemo<SheetApi>(
    () => ({
      open: visible,
      show,
      hide: close,
      info: (title, message, icon) => show({ title, message, icon: icon ?? 'info', tone: 'info', dismissLabel: 'Got it' }),
      success: (title, message) => {
        haptic.success();
        show({ title, message, icon: 'circleCheck', tone: 'success', dismissLabel: 'Continue' });
      },
      error: (title, message) => {
        haptic.error();
        show({ title, message, icon: 'alert', tone: 'danger', dismissLabel: 'Try again' });
      },
      warning: (title, message) => show({ title, message, icon: 'alert', tone: 'warning', dismissLabel: 'OK' }),
      confirm: (params) =>
        new Promise<boolean>((resolve) => {
          resolver.current = (value) => resolve(value === true);
          show({
            title: params.title,
            message: params.message,
            icon: params.icon ?? (params.destructive ? 'deleteAlert' : 'help'),
            tone: params.destructive ? 'danger' : 'neutral',
            dismissLabel: params.cancelLabel ?? 'Not now',
            actions: [
              {
                label: params.confirmLabel ?? 'Yes, continue',
                variant: params.destructive ? 'danger' : 'primary',
                onPress: () => {
                  const done = resolver.current;
                  resolver.current = null;
                  setVisible(false);
                  setRequest(null);
                  done?.(true);
                },
              },
            ],
          });
        }),
      pick: (params) =>
        new Promise<string | null>((resolve) => {
          resolver.current = (value) => resolve(typeof value === 'string' ? value : null);
          show({
            title: params.title,
            subtitle: params.subtitle,
            options: params.options,
            dismissLabel: 'Cancel',
            onOption: (value) => {
              const done = resolver.current;
              resolver.current = null;
              setVisible(false);
              setRequest(null);
              setTimeout(() => setRequest(null), 320);
              done?.(value);
            },
          });
        }),
    }),
    [close, show, visible],
  );

  const toneColor =
    request?.tone === 'danger' ? c.danger : request?.tone === 'warning' ? c.warning : request?.tone === 'success' ? c.success : request?.tone === 'info' ? c.info : c.primary;

  return (
    <SheetContext.Provider value={api}>
      {children}
      <Sheet
        visible={visible && request != null}
        onClose={close}
        title={request?.title}
        subtitle={request?.subtitle}
        icon={request?.icon ?? (request?.tone ? TONE_ICON[request.tone] : undefined)}
        iconTint={toneColor}
        dismissible={request?.dismissible !== false}
        dismissLabel={request?.dismissLabel}
        actions={request?.actions}
        scrollable={Boolean(request?.message && request.message.length > 160)}
      >
        {request?.message ? (
          <Text variant="body" color={c.textSecondary} style={{ paddingBottom: spacing.xs }}>
            {request.message}
          </Text>
        ) : null}
        {request?.options?.map((option) => (
          <SheetOption
            key={option.value}
            label={option.label}
            description={option.description}
            icon={option.icon}
            onPress={() => request.onOption?.(option.value)}
          />
        ))}
      </Sheet>
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetApi {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used inside <SheetProvider>');
  return ctx;
}
