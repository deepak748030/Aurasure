import React from 'react';
import { View } from 'react-native';
import { Icon } from '@/lib/icons';
import { Text } from './Text';
import { colors } from '@/theme/colors';
import { formatCount } from '@/lib/format';

interface RatingProps {
  value: number;
  reviews?: number;
  size?: number;
  showValue?: boolean;
}

export function Rating({ value, reviews, size = 13, showValue = true }: RatingProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Icon name="star" size={size} color={colors.star} filled style={{ marginRight: 4 }} />
      {showValue ? (
        <Text variant="caption" color={colors.textSecondary} weight="semibold">
          {value.toFixed(1)}
        </Text>
      ) : null}
      {reviews != null ? (
        <Text variant="caption" color={colors.textTertiary} style={{ marginLeft: 3 }}>
          ({formatCount(reviews)})
        </Text>
      ) : null}
    </View>
  );
}
