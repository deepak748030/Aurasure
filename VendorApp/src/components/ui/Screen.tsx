import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/tokens';
import { useContentBottomInset } from '@/hooks/useBottomInset';
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
  appBarColor?: string | null;
  statusBarStyle?: SystemBarStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function Screen({
  children, title, subtitle, headerRight, headerLeft, header, refreshing, onRefresh,
  keyboardAvoiding = false, contentStyle, padded = true, scroll = true,
  backgroundColor = colors.background, appBarColor = colors.appBar, statusBarStyle, edges = ['top', 'left', 'right'],
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const contentBottom = useContentBottomInset(24);
  const hasHeader = Boolean(header || title || subtitle || headerRight || headerLeft);
  const barColor = appBarColor ?? backgroundColor;
  useScreenBars(barColor, { style: statusBarStyle, navigationBar: colors.appBar });

  const headerNode = header ?? (hasHeader ? (
    <View style={{ paddingHorizontal: layout.contentHorizontalPadding, paddingTop: 10, paddingBottom: 12 }}>
      <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center' }}>
        {headerLeft ? <View style={{ marginRight: 8 }}>{headerLeft}</View> : null}
        <View style={{ flex: 1 }}>
          {title ? <Text variant="h2" weight="bold">{title}</Text> : null}
          {subtitle ? <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {headerRight ? <View style={{ marginLeft: 8 }}>{headerRight}</View> : null}
      </View>
    </View>
  ) : null);

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padded ? { paddingHorizontal: layout.contentHorizontalPadding } : null, { paddingTop: hasHeader ? 4 : 0, paddingBottom: contentBottom }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.brand[600]} colors={[colors.brand[600]]} /> : undefined}
    >{children}</ScrollView>
  ) : <View style={[{ flex: 1, paddingBottom: contentBottom }, contentStyle]}>{children}</View>;

  const wrapped = keyboardAvoiding ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.bottom}>{body}</KeyboardAvoidingView> : body;
  return <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges.filter((e) => e !== 'top')}>
    <View style={{ backgroundColor: barColor, paddingTop: edges.includes('top') ? insets.top : 0 }}>{headerNode}</View>
    {wrapped}
  </SafeAreaView>;
}
