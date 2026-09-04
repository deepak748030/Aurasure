import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/lib/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { vendorApi, type CatalogItem } from '@/api/vendor';
import { useVendor } from '@/context/VendorContext';
import { colors } from '@/theme/colors';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function ItemCard({
  item,
  onEdit,
  onDelete,
  onToggleStock,
}: {
  item: CatalogItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStock: (val: boolean) => void;
}) {
  const inStock = item.inStock !== false && item.isAvailable !== false;
  const hasDiscount = item.mrp && item.mrp > item.price;

  return (
    <View style={styles.card}>
      {/* Veg/non-veg dot */}
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={[
              styles.vegDot,
              { borderColor: item.isVeg !== false ? colors.success : '#EF4444' },
            ]}
          >
            <View
              style={[
                styles.vegDotInner,
                { backgroundColor: item.isVeg !== false ? colors.success : '#EF4444' },
              ]}
            />
          </View>
          <Text variant="title" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
            {item.name}
          </Text>
        </View>

        {/* Edit / Delete */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
            <Icon name="edit" size={16} color={colors.brand[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
            <Icon name="trash" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {item.description ? (
        <Text
          variant="caption"
          color={colors.textSecondary}
          numberOfLines={2}
          style={{ marginTop: 4, marginLeft: 24 }}
        >
          {item.description}
        </Text>
      ) : null}

      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="title" weight="bold" style={{ color: colors.brand[700] }}>
            ₹{item.price}
          </Text>
          {hasDiscount ? (
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ textDecorationLine: 'line-through' }}
            >
              ₹{item.mrp}
            </Text>
          ) : null}
          {item.prepTime ? (
            <View style={styles.prepChip}>
              <Icon name="clock" size={11} color={colors.textSecondary} />
              <Text variant="caption" color={colors.textSecondary}> {item.prepTime}m</Text>
            </View>
          ) : null}
        </View>

        {/* Stock switch */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="caption" color={inStock ? colors.success : colors.danger} weight="semibold">
            {inStock ? 'In stock' : 'Out of stock'}
          </Text>
          <Switch
            value={inStock}
            onValueChange={onToggleStock}
            trackColor={{ false: colors.dangerBg, true: colors.successBg }}
            thumbColor={inStock ? colors.success : colors.danger}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>
    </View>
  );
}

export function MenuScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const { vendor } = useVendor();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await vendorApi.catalog();
      setItems(data.items);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load menu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const handleToggleStock = async (item: CatalogItem, val: boolean) => {
    haptic.selection();
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, inStock: val, isAvailable: val } : it,
      ),
    );
    try {
      await vendorApi.toggleStock(item.id, val);
    } catch (e) {
      // revert
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, inStock: !val, isAvailable: !val } : it,
        ),
      );
      haptic.error();
    }
  };

  const handleDelete = (item: CatalogItem) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" from your menu? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorApi.deleteItem(item.id);
              setItems((prev) => prev.filter((it) => it.id !== item.id));
              haptic.success();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
      ],
    );
  };

  const isApproved = vendor?.status === 'approved';

  return (
    <Screen
      title="Menu"
      subtitle={isApproved ? `${items.length} item${items.length !== 1 ? 's' : ''}` : 'Go live to manage menu'}
      scroll={false}
      padded={false}
      headerRight={
        isApproved ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('AddItem', undefined)}
            style={styles.addBtn}
          >
            <Icon name="plus" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : undefined
      }
    >
      {!isApproved ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Icon name="shield" size={42} color={colors.brand[200]} />
          <Text variant="h3" weight="bold" style={{ marginTop: 16, textAlign: 'center' }}>
            Awaiting verification
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8, textAlign: 'center' }}>
            Your menu will unlock after admin approves your outlet documents.
          </Text>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[600]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={[
            { paddingTop: 8, paddingBottom: 32 },
            items.length === 0 && { flex: 1 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onEdit={() => navigation.navigate('AddItem', { item })}
              onDelete={() => handleDelete(item)}
              onToggleStock={(val) => void handleToggleStock(item, val)}
            />
          )}
          ListHeaderComponent={
            error ? (
              <Text variant="bodySm" color={colors.danger} style={{ marginHorizontal: 16, marginBottom: 8 }}>
                {error}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="utensils"
              title="Empty menu"
              subtitle="Add your bestsellers first — they convert best."
              actionLabel="Add first item"
              onAction={() => navigation.navigate('AddItem', undefined)}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vegDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDotInner: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  prepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
