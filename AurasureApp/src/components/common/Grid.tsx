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
export function Grid<T>({ data, renderItem, columns = 2, gap = 8, contentStyle }: GridProps<T>): React.ReactElement {
  const width = columns === 2 ? '48.5%' : '31.5%';
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
