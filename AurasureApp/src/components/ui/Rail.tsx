import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SectionHeader } from './Primitives';

/**
 * Horizontal rail used by every home section. Cards keep an 8px gap between
 * them; the rail itself is flush to the gutter (4px) and has zero vertical
 * padding above/below the cards, matching the "0 gap" list rule.
 */
export function Rail({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  children,
  style,
  contentStyle,
  scrollRef,
}: {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: Parameters<typeof SectionHeader>[0] extends never ? never : React.ComponentProps<typeof SectionHeader>['icon'];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: React.RefObject<ScrollView | null>;
}): React.ReactElement {
  return (
    <View style={style}>
      {title ? <SectionHeader title={title} subtitle={subtitle} actionLabel={actionLabel} onAction={onAction} icon={icon} /> : null}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ paddingHorizontal: 0, gap: 8 }, contentStyle]}
        style={{ overflow: 'visible' }}
      >
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Vertical list of rows with zero gaps (project rule for flat lists). */
export function FlatList0({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }): React.ReactElement {
  return <View style={[{ gap: 0 }, style]}>{children}</View>;
}
