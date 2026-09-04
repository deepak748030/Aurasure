import React, { useState } from 'react';
import { Alert, Switch, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { vendorApi } from '@/api/vendor';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddItem'>;

export function AddItemScreen({ route, navigation }: Props): React.ReactElement {
  const existing = route?.params?.item;
  const isEdit = Boolean(existing?.id);

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '');
  const [mrp, setMrp] = useState(existing?.mrp != null ? String(existing.mrp) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [prepTime, setPrepTime] = useState(existing?.prepTime != null ? String(existing.prepTime) : '15');
  const [isVeg, setIsVeg] = useState(existing?.isVeg !== false);
  const [inStock, setInStock] = useState(existing?.inStock !== false && existing?.isAvailable !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) {
      setError('Item name is required');
      haptic.error();
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      setError('Enter a valid price');
      haptic.error();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await vendorApi.saveItem({
        ...(isEdit && existing?.id ? { id: existing.id } : {}),
        name: name.trim(),
        price: Number(price),
        mrp: mrp.trim() ? Number(mrp) : Number(price),
        description: description.trim(),
        prepTime: Number(prepTime) || 15,
        isVeg,
        inStock,
        isAvailable: inStock,
      });
      haptic.success();
      navigation.goBack();
    } catch (e) {
      haptic.error();
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={isEdit ? 'Edit Item' : 'Add Item'}
      keyboardAvoiding
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
          <Icon name="chevronLeft" size={26} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <Input
        label="Item Name *"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Butter Chicken, Aura Tee"
        leftIcon="utensils"
      />
      <Input
        label="Selling Price ₹ *"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        leftIcon="rupee"
        placeholder="0"
      />
      <Input
        label="MRP ₹ (crossed-out original price)"
        value={mrp}
        onChangeText={setMrp}
        keyboardType="decimal-pad"
        leftIcon="tag"
        placeholder="Leave blank = same as price"
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Briefly describe this item..."
      />
      <Input
        label="Prep Time (minutes)"
        value={prepTime}
        onChangeText={setPrepTime}
        keyboardType="number-pad"
        leftIcon="timer"
        placeholder="15"
      />

      {/* Veg toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="leaf" size={18} color={isVeg ? colors.success : colors.textTertiary} />
          <View>
            <Text variant="title" weight="semibold">Vegetarian</Text>
            <Text variant="caption" color={colors.textSecondary}>Show green dot on the item</Text>
          </View>
        </View>
        <Switch
          value={isVeg}
          onValueChange={(v) => { haptic.selection(); setIsVeg(v); }}
          trackColor={{ false: colors.border, true: colors.success + '80' }}
          thumbColor={isVeg ? colors.success : colors.textTertiary}
        />
      </View>

      {/* In stock toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="package" size={18} color={inStock ? colors.brand[600] : colors.danger} />
          <View>
            <Text variant="title" weight="semibold">In Stock</Text>
            <Text variant="caption" color={colors.textSecondary}>Customers can order this item</Text>
          </View>
        </View>
        <Switch
          value={inStock}
          onValueChange={(v) => { haptic.selection(); setInStock(v); }}
          trackColor={{ false: colors.dangerBg, true: colors.brand[100] }}
          thumbColor={inStock ? colors.brand[600] : colors.danger}
        />
      </View>

      {error ? (
        <Text variant="bodySm" color={colors.danger} style={{ marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}

      <Button title={isEdit ? 'Save Changes' : 'Add to Menu'} loading={busy} onPress={() => void save()} />
    </Screen>
  );
}
