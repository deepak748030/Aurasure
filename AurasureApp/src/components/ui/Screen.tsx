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
import { useNavigation } from '@react-navigation/native';
import { Text } from './Text';
import { IconButton } from './Button';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { layout, radius, spacing } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * One screen shell for the whole app so the layout rules stay enforced:
 *   • left/right gutter is exactly `layout.contentHorizontalPadding` (4)
 *   • vertical padding is 0 at the top - rows own their own rhythm
 *   • `padded={false}` + `gap 0` is used by map / flat-list surfaces
 */

export interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Custom header replaces title/subtitle entirely (home hero, store banner). */
  header?: React.ReactNode;
  /** Renders a back chevron (auto-pops the navigator). */
  back?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  /** Horizontal 4px gutter - turned off for full-bleed map / list surfaces. */
  padded?: boolean;
  keyboardAvoiding?: boolean;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Safe edges the shell should respect (top/left/right by default). */
  edges?: ('top' | 'left' | 'right' | 'bottom')[];
  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
  /** Pinned above the safe area (pay bars, "view cart" strips). */
  stickyFooter?: React.ReactNode;
  /** Tints the status bar area with the header colour instead of the page bg. */
  headerBackground?: string;
}

export function Screen({
  children,
  title,
  subtitle,
  headerLeft,
  headerRight,
  header,
  back,
  onRefresh,
  refreshing,
  scroll = true,
  padded = true,
  keyboardAvoiding,
  backgroundColor,
  contentContainerStyle,
  style,
  edges = ['top', 'left', 'right'],
  scrollRef,
  onScroll,
  stickyFooter,
  headerBackground,
}: ScreenProps): React.ReactElement {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const bg = backgroundColor ?? c.bg;
  const topPaint = headerBackground ?? bg;
  const showHeader = Boolean(header || title || subtitle || headerRight || back || headerLeft);

  const headerNode = showHeader ? (
    header ?? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: layout.headerHeight - 12,
          paddingHorizontal: spacing.edge,
          paddingTop: 4,
          paddingBottom: 6,
        }}
      >
        {back ? (
          <IconButton
            name="chevronLeft"
            accessibilityLabel="Go back"
            onPress={() => {
              haptic.light();
              if (navigation.canGoBack()) navigation.goBack();
            }}
            size={34}
            iconSize={18}
          />
        ) : null}
        {headerLeft}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text variant="h3" weight="semibold" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {headerRight}
      </View>
    )
  ) : null;

  const content = (
    <>
      {headerNode ? <View style={{ backgroundColor: topPaint }}>{headerNode}</View> : null}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            padded ? { paddingHorizontal: layout.contentHorizontalPadding } : null,
            { paddingTop: 0, paddingBottom: insets.bottom + spacing.xxl },
            contentContainerStyle,
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={c.primary}
                colors={[c.primary]}
                progressBackgroundColor={c.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: padded ? layout.contentHorizontalPadding : 0 }}>{children}</View>
      )}
    </>
  );

  return (
    <SafeAreaView
      edges={edges.filter((edge) => edge !== 'bottom' || Boolean(stickyFooter))}
      style={{ flex: 1, backgroundColor: topPaint }}
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
        {stickyFooter ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: 'transparent' }}>
            {stickyFooter}
          </View>
        ) : null}
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </View>
    </SafeAreaView>
  );
}

/** Full-bleed surface: no 4px gutter, no radius, no vertical gaps (map/lists). */
export function FlushSurface({
  children,
  height,
  style,
}: {
  children: React.ReactNode;
  height?: number;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.mapBase, height, borderRadius: radius.flush, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

/** Simple 3-line page title block used by menu-ish screens. */
export function PageTitle({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: React.ReactNode;
}): React.ReactElement {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.edge }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}>
          <Icon name={icon} size={18} color={c.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="h2" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
