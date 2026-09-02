import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartImage } from '../ui/SmartImage';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Icon } from '@/lib/icons';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import type { ImageRef, IconName } from '@/types';

interface FoodHeroProps {
  gif: ImageRef;
  badge?: string;
  title: string;
  subtitle: string;
  onOrder: () => void;
}

/**
 * Animated hero on top of the food home: looping food GIF behind a promo
 * headline + ORDER NOW button, followed by the four quick-feature chips.
 */
export function FoodHero({ gif, badge = 'FOOD FEST', title, subtitle, onOrder }: FoodHeroProps): React.ReactElement {
  return (
    <View>
      <View style={styles.hero}>
        <SmartImage source={gif} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={['rgba(160,20,20,0.08)', 'rgba(120,10,10,0.42)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Badge label={badge} tone="danger" size="md" />
          <Text variant="h1" weight="bold" color={colors.white} style={{ marginTop: 10 }}>
            {title}
          </Text>
          <Text variant="subtitle" color="rgba(255,255,255,0.92)" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
          <Pressable
            onPress={() => {
              haptic.light();
              onOrder();
            }}
            style={({ pressed }) => [styles.orderBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text variant="overline" color={colors.white} weight="bold">
              ORDER NOW
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.features}>
        <FeatureChip icon="bike" label="Fast Delivery" />
        <FeatureChip icon="gift" label="Get Points" />
        <FeatureChip icon="percent" label="Flat 20% OFF" />
        <FeatureChip icon="package" label="Large Orders" />
      </View>
    </View>
  );
}

function FeatureChip({ icon, label }: { icon: IconName; label: string }): React.ReactElement {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={18} color={colors.food[600]} />
      </View>
      <Text variant="caption" color={colors.text} weight="semibold" style={{ marginTop: 6, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({

  hero: {
    position: 'relative',
    width: '100%',
    height: 208,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.food[100],
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  orderBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(11,16,32,0.72)',
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  features: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.food[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
