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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { TAB_BAR_HEIGHT } from '@/lib/layout';

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
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const hasHeader = Boolean(header || title || subtitle || headerRight || headerLeft);

  const headerEl = (): React.ReactNode => {
    if (header) return header;
    if (!hasHeader) return null;
    return (
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
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
        padded ? { paddingHorizontal: 16 } : null,
        { paddingTop: hasHeader ? 8 : insets.top + 8, paddingBottom: insets.bottom + 24 },
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
    <View style={[{ flex: 1, paddingBottom: insets.bottom }, contentStyle]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {headerEl()}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={TAB_BAR_HEIGHT + insets.bottom}
          enabled
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}
