import React from 'react';
import { ScrollView, View } from 'react-native';
import { Chip } from '../ui/Chip';
import { haptic } from '@/lib/haptics';
import type { FoodCategory } from '@/types';

interface FoodCategoryPillsProps {
  items: FoodCategory[];
  activeId?: string;
  onSelect: (id: string) => void;
}

export function FoodCategoryPills({ items, activeId, onSelect }: FoodCategoryPillsProps): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
    >
      {items.map((c, i) => (
        <View key={c.id} style={{ marginRight: i === items.length - 1 ? 0 : 8 }}>
          <Chip label={c.name} icon={c.icon} active={c.id === activeId} onPress={() => onSelect(c.id)} />
        </View>
      ))}
    </ScrollView>
  );
}
