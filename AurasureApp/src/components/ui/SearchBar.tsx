import React from 'react';
import { Pressable, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search Aurasure',
  onSubmit,
  autoFocus = false,
  style,
}: SearchBarProps): React.ReactElement {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          // Pill, so it lines up with the app's rounded CTAs.
          borderRadius: radius.pill,
          paddingHorizontal: 16,
          height: 48,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Icon name="search" size={18} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 14,
          color: colors.text,
          paddingVertical: 0,
        }}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        blurOnSubmit={false}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="x" size={16} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}
