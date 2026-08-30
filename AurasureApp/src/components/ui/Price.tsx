import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Badge } from './Badge';
import { colors } from '@/theme/colors';
import { discountPercent, formatINR } from '@/lib/format';
import type { TypographyVariant } from '@/theme/tokens';

interface PriceProps {
  price: number;
  mrp?: number;
  variant?: TypographyVariant;
  showDiscount?: boolean;
  color?: string;
}

export function Price({ price, mrp, variant = 'title', showDiscount = true, color }: PriceProps): React.ReactElement {
  const pct = discountPercent(mrp ?? price, price);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <Text variant={variant} weight="bold" color={color ?? colors.text}>
        {formatINR(price)}
      </Text>
      {mrp != null && mrp > price ? (
        <Text variant="caption" color={colors.textTertiary} style={{ textDecorationLine: 'line-through', marginLeft: 6 }}>
          {formatINR(mrp)}
        </Text>
      ) : null}
      {showDiscount && pct > 0 ? <Badge label={`${pct}% OFF`} tone="success" style={{ marginLeft: 6 }} /> : null}
    </View>
  );
}
