import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

interface GridProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: 2 | 3;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

// Two/three column grid. Uses space-between with percentage widths so the
// container gap stays 0 (per design brief) while items stay evenly spaced.
export function Grid<T>({ data, renderItem, columns = 2, gap = 5, contentStyle }: GridProps<T>): React.ReactElement {
  // 3-across tiles use ~32.7% widths so the inter-card gap stays ~4px; the
  // 2-across rows keep a touch more air with 48.6%.
  const width = columns === 2 ? '48.6%' : '32.7%';
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, contentStyle]}>
      {data.map((item, index) => (
        <View key={index} style={{ width, marginBottom: gap }}>
          {renderItem(item, index)}
        </View>
      ))}
    </View>
  );
}
