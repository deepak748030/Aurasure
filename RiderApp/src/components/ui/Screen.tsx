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
import { useScreenBars, type SystemBarStyle } from '@/lib/systemBars';

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
   * Color of the app-bar strip, i.e. the surface painted behind the status bar
   * (the Android notification bar) plus the header. Defaults to the soft plum
   * the tab bar uses; pass a screen's own hero color (e.g. `colors.appBarHero`)
   * to make the notification bar bleed into that hero. Pass `null` to skip the
   * band entirely and let `backgroundColor` show through.
   */
  appBarColor?: string | null;
  /** Force the status bar icon color; auto (white on dark, ink on light) by default. */
  statusBarStyle?: SystemBarStyle;
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
  appBarColor = colors.appBar,
  statusBarStyle,
  edges = ['top', 'left', 'right'],
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const insideTabs = useIsInsideTabs();
  const contentBottom = useContentBottomInset(24);
  const hasHeader = Boolean(header || title || subtitle || headerRight || headerLeft);
  const respectTop = edges.includes('top');
  const barColor = appBarColor ?? backgroundColor;

  // Notification bar takes this screen's app-bar color (SystemBarHost derives
  // the icon contrast from it); the bottom strip is always the light tab bar, so
  // the gesture pill / back buttons stay dark there.
  useScreenBars(barColor, { style: statusBarStyle, navigationBar: colors.appBar });

  const headerEl = (): React.ReactNode => {
    if (header) return header;
    if (!hasHeader) return null;
    return (
      <View
        style={{
          // The band above already reserves the status bar area, so the
          // header only needs its own breathing room.
          paddingTop: 6,
          paddingHorizontal: layout.contentHorizontalPadding,
          paddingBottom: 6,
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
        { paddingTop: 0, paddingBottom: contentBottom },
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

  const headerNode = headerEl();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges.filter((edge) => edge !== 'top')}>
      {/* App-bar strip: paints the area the transparent status bar sits over,
          so the notification bar always carries the app color. */}
      <View style={{ backgroundColor: barColor, paddingTop: respectTop ? insets.top : 0 }}>
        {headerNode}
      </View>
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
