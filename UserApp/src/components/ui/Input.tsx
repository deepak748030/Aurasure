import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  multiline?: boolean;
  secure?: boolean;
  box?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  hint,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  secure,
  multiline,
  value,
  containerStyle,
  ...rest
}: InputProps): React.ReactElement {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text variant="caption" weight="semibold" tone="muted">
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          styles.row,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
            borderWidth: focused ? 1.4 : 1,
            borderRadius: multiline ? radius.lg : radius.pill,
            alignItems: multiline ? 'flex-start' : 'center',
            justifyContent: 'center',
            minHeight: multiline ? 84 : 48,
            paddingHorizontal: spacing.sm,
            paddingVertical: multiline ? 10 : 0,
          },
        ]}
      >
        {icon ? (
          <View style={{ height: INPUT_LINE_HEIGHT, justifyContent: 'center', marginRight: 6, marginTop: multiline ? 1 : 0 }}>
            <Icon name={icon} size={17} color={focused ? c.primary : c.textTertiary} />
          </View>
        ) : null}
        <TextInput
          value={value}
          placeholderTextColor={c.textTertiary}
          onChangeText={rest.onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          underlineColorAndroid="transparent"
          style={[
            styles.input,
            {
              color: c.text,
              height: multiline ? undefined : INPUT_HEIGHT,
              minHeight: multiline ? 64 : INPUT_HEIGHT,
              paddingVertical: 0,
              paddingHorizontal: 0,
              paddingTop: 0,
              lineHeight: INPUT_LINE_HEIGHT,
              includeFontPadding: false,
            },
          ]}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden((prev) => !prev)}
            style={{ padding: 4, alignSelf: 'center', justifyContent: 'center' }}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={17} color={c.textTertiary} />
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={{ padding: 4, alignSelf: 'center', justifyContent: 'center', opacity: onRightIconPress ? 1 : 0.5 }}
          >
            <Icon name={rightIcon} size={17} color={c.primary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="alert" size={12} color={c.danger} />
          <Text variant="caption" color={c.danger}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Single-line field geometry. The box is 48 (same as a medium button, so an
 * input and a button side-by-side share a baseline), the text runs on a fixed
 * 20px line with font padding stripped so Android cannot push it upwards.
 */
const INPUT_HEIGHT = 46;
const INPUT_LINE_HEIGHT = 20;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, outlineStyle: 'none' } as Record<string, unknown>,
});

/** Search field with a clear button; used in the header and the search screen. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search for dishes, stores, products',
  onSubmit,
  onClear,
  autoFocus,
  trailing,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}): React.ReactElement {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 46,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: c.surface,
        borderWidth: focused ? 1.4 : 1,
        borderColor: focused ? c.primary : c.border,
      }}
    >
      <Icon name="search" size={17} color={c.primary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        autoFocus={autoFocus}
        returnKeyType="search"
        textAlignVertical="center"
        underlineColorAndroid="transparent"
        style={{ flex: 1, height: '100%', fontSize: 14, lineHeight: INPUT_LINE_HEIGHT, color: c.text, paddingVertical: 0, paddingHorizontal: 0, includeFontPadding: false }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          style={{ alignSelf: 'center', justifyContent: 'center' }}
        >
          <Icon name="circleX" size={16} color={c.textTertiary} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}
