import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { useContentBottomInset, useIsInsideTabs } from '@/hooks/useBottomInset';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  header?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  scroll?: boolean;
  backgroundColor?: string;
  /**
   * Which safe-area edges the wrapper should respect. Top and the landscape
   * cutouts are handled here once, so children never add `insets.top`
   * themselves. Screens that draw their own edge-to-edge hero pass `['top']`
   * only, or `[]` when they manage it internally.
   */
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function Screen({
  children,
  title,
  subtitle,
  headerRight,
  headerLeft,
  header,
  refreshing,
  onRefresh,
  keyboardAvoiding = false,
  contentStyle,
  padded = true,
  scroll = true,
  backgroundColor = colors.background,
  edges = ['top', 'left', 'right'],
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const insideTabs = useIsInsideTabs();
  const contentBottom = useContentBottomInset(24);
  const hasHeader = Boolean(header || title || subtitle || headerRight || headerLeft);

  const headerEl = (): React.ReactNode => {
    if (header) return header;
    if (!hasHeader) return null;
    return (
      <View
        style={{
          // The SafeAreaView above already reserves the status bar area, so the
          // header only needs its own breathing room.
          paddingTop: 10,
          paddingHorizontal: layout.contentHorizontalPadding,
          paddingBottom: 12,
          backgroundColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {headerLeft}
            <View style={{ flex: 1 }}>
              {title ? <Text variant="h2" weight="bold" color={colors.text}>{title}</Text> : null}
              {subtitle ? <Text variant="caption" color={colors.textSecondary}>{subtitle}</Text> : null}
            </View>
          </View>
          {headerRight ? <View>{headerRight}</View> : null}
        </View>
      </View>
    );
  };

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        padded ? { paddingHorizontal: layout.contentHorizontalPadding } : null,
        { paddingTop: hasHeader ? 8 : 4, paddingBottom: contentBottom },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.brand[500]}
            colors={[colors.brand[500]]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingBottom: contentBottom }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {headerEl()}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // Inside the tabs the screen already sits above the bar, so nothing
          // has to be compensated; outside them only the nav bar inset does.
          keyboardVerticalOffset={insideTabs ? 0 : insets.bottom}
          enabled
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
