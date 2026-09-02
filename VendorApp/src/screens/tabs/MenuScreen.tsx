import React, { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';

interface Item {
  id: string;
  name: string;
  price: number;
  inStock?: boolean;
}

export function MenuScreen(): React.ReactElement {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await vendorApi.catalog();
      setItems(data.items as unknown as Item[]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Menu unavailable until you are live');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    try {
      await vendorApi.saveItem({ name, price: Number(price) || 0, isVeg: true, inStock: true });
      setName('');
      setPrice('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
  };

  return (
    <Screen title="Menu / catalogue" subtitle="Add items customers will see" keyboardAvoiding onRefresh={() => void load()}>
      <Input label="Item name" value={name} onChangeText={setName} placeholder="Butter chicken / Aura tee" />
      <Input label="Price ₹" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Button title="Add item" onPress={() => void add()} />
      {error ? (
        <Text color={colors.danger} variant="bodySm" style={{ marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
      <View style={{ marginTop: 16 }}>
        {!items.length ? (
          <EmptyState icon="utensils" title="Empty menu" subtitle="Add your bestsellers first — they convert." />
        ) : (
          items.map((it) => (
            <View
              key={it.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="title">{it.name}</Text>
              <Text variant="title">₹{it.price}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
