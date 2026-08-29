import React from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import type { IconName } from '@/types';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  leftIcon?: IconName;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  leftIcon,
  multiline = false,
  containerStyle,
  ...rest
}: InputProps): React.ReactElement {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary} weight="semibold" style={{ marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, multiline && { height: 88, alignItems: 'flex-start' }]}>
        {leftIcon ? <Icon name={leftIcon} size={18} color={colors.textTertiary} style={{ marginLeft: 12, marginRight: 8 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline={multiline}
          style={[
            styles.input,
            { textAlignVertical: multiline ? 'top' : 'center', marginTop: multiline ? 10 : 0 },
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 46,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
    paddingLeft: 12,
  },
});
