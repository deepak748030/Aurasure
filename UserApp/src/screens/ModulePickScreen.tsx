import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/lib/icons';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import { useSession } from '@/context/SessionContext';
import { haptic } from '@/lib/haptics';
import type { ModuleKey } from '@/types';

const MODULES: { key: ModuleKey; name: string; blurb: string; examples: string[]; icon: IconName; art: string }[] = [
  {
    key: 'food',
    name: 'Food',
    blurb: 'Restaurants & cloud kitchens',
    examples: ['Biryani', 'Pizza', 'Thali', 'Cafe'],
    icon: 'utensils',
    art: '🍛',
  },
  {
    key: 'shop',
    name: 'Shop',
    blurb: 'Daily needs from local stores',
    examples: ['Grocery', 'Pharma', 'Fashion', 'Electronics'],
    icon: 'store',
    art: '🛍️',
  },
];

/** `module_view.dart` — the two big cards that decide which catalogue to show. */
export function ModulePickScreen({ navigation }: { navigation: import('@/navigation/types').Nav }): React.ReactElement {
  const c = useColors();
  const { module, setModule, addresses, selectedAddress } = useSession();

  return (
    <Screen
      title="What do you need today?"
      subtitle="You can switch any time from the header"
      back={navigation.canGoBack()}
      scroll={false}
    >
      <View style={{ flex: 1, gap: spacing.md, paddingHorizontal: spacing.edge, justifyContent: 'center' }}>
        {MODULES.map((item) => {
          const active = module === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                haptic.medium();
                setModule(item.key);
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: active ? c.primarySoft : c.surface,
                  borderColor: active ? c.primary : c.border,
                  opacity: pressed ? 0.94 : 1,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.emojiPlate, { backgroundColor: c.surfaceHi }]}>
                  <Text variant="display" tone="plain">
                    {item.art}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="h3" weight="bold">
                    {item.name}
                  </Text>
                  <Text variant="bodySm" tone="muted">
                    {item.blurb}
                  </Text>
                </View>
                <View style={[styles.radio, { borderColor: active ? c.primary : c.borderStrong }]}>{active ? <Icon name="check" size={13} color={c.onPrimary} /> : null}</View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
                {item.examples.map((example) => (
                  <View key={example} style={[styles.pill, { backgroundColor: c.surfaceHi }]}>
                    <Text variant="micro" weight="semibold" tone="muted">
                      {example}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: spacing.edge, paddingBottom: spacing.md, gap: spacing.sm }}>
        {selectedAddress ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Location')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: c.surfaceHi }}
          >
            <Icon name="mapPin" size={16} color={c.primary} />
            <Text variant="bodySm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
              {selectedAddress.label} · {selectedAddress.line}
            </Text>
            <Icon name="chevronDown" size={14} color={c.textTertiary} />
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
            <Icon name="info" size={15} color={c.warning} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              {addresses.length === 0 ? 'No delivery address yet' : 'Pick a delivery address to see stores near you'}
            </Text>
          </View>
        )}
        <Button
          label="Continue"
          size="lg"
          iconRight="arrowRight"
          onPress={() => {
            haptic.success();
            navigation.navigate('Tabs');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiPlate: { width: 58, height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
});
