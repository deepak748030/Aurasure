import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ItemRow } from '@/components/list/ItemRow';
import { StoreCard } from '@/components/cards/Cards';
import { EmptyState } from '@/components/ui/Primitives';
import { SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { fetchCatalog, fetchRestaurants, fetchStores } from '@/api/catalog';
import { useCart } from '@/context/CartContext';
import { useCartActions } from '@/hooks/useCartActions';
import { useSession } from '@/context/SessionContext';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { spacing } from '@/theme/tokens';
import type { Nav } from '@/navigation/types';
import type { CatalogItem, Restaurant, ShopStore } from '@/types';

type Tab = 'items' | 'stores';

/**
 * Saved items + saved stores. Backed by `GET/PUT /users/me/favorites`, so it
 * survives reinstall as long as the account exists.
 */
export function FavoritesScreen({ navigation }: { navigation: Nav }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const actions = useCartActions();
  const { module, favorites, isFavorite, toggleFavorite, isLoggedIn } = useSession();
  const [tab, setTab] = useState<Tab>('items');

  const catalog = useQuery<CatalogItem[]>(useCallback(() => fetchCatalog(module, 200), [module]), { enabled: isLoggedIn });
  const outlets = useQuery<{ restaurants: Restaurant[]; stores: ShopStore[] }>(
    useCallback(async () => {
      const [restaurants, stores] = await Promise.all([fetchRestaurants({ limit: 40 }), fetchStores({ limit: 40 })]);
      return { restaurants: restaurants.restaurants, stores };
    }, []),
    { enabled: isLoggedIn },
  );

  const savedItems = useMemo(() => {
    const saved = new Set(favorites.filter((fav) => fav.module === module).map((fav) => fav.refId));
    return (catalog.data ?? []).filter((item) => saved.has(item.id));
  }, [catalog.data, favorites, module]);

  const savedOutlets = useMemo(() => {
    const saved = new Set(favorites.filter((fav) => fav.module === module).map((fav) => fav.refId));
    if (module === 'food') return (outlets.data?.restaurants ?? []).filter((row) => saved.has(row.id));
    return (outlets.data?.stores ?? []).filter((row) => saved.has(row.id));
  }, [outlets.data, favorites, module]);

  const count = savedItems.length + savedOutlets.length;

  const askRemove = async (refId: string, name: string): Promise<void> => {
    const ok = await sheet.confirm({
      title: 'Remove from favourites?',
      message: `${name} will be unsaved. You can save it again any time.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      destructive: true,
      icon: 'heart',
    });
    if (!ok) return;
    await toggleFavorite(module, refId);
  };

  if (!isLoggedIn) {
    return (
      <Screen title="Favourites" subtitle="Saved dishes and stores">
        <EmptyState
          icon="heart"
          title="Sign in to save favourites"
          subtitle="Hearts are stored on your Aurasure account so they follow you between devices."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Auth', { mode: 'login' })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Favourites"
      subtitle={count > 0 ? `${count} saved in ${module === 'food' ? 'Food' : 'Shop'}` : 'Nothing saved yet'}
      padded={false}
      onRefresh={() => {
        catalog.refresh();
        outlets.refresh();
      }}
      refreshing={catalog.refreshing || outlets.refreshing}
    >
      <SegmentedTabs
        tabs={[
          { key: 'items', label: module === 'food' ? 'Dishes' : 'Products', count: savedItems.length },
          { key: 'stores', label: module === 'food' ? 'Restaurants' : 'Stores', count: savedOutlets.length },
        ]}
        active={tab}
        onChange={(next) => setTab(next as Tab)}
      />

      {catalog.loading && tab === 'items' ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonList rows={4} thumb={72} />
        </View>
      ) : tab === 'items' ? (
        savedItems.length === 0 ? (
          <EmptyState
            icon="heart"
            title="No saved items"
            subtitle={`Tap the heart on any ${module === 'food' ? 'dish' : 'product'} and it lands here.`}
            actionLabel={`Browse ${module === 'food' ? 'food' : 'shop'}`}
            onAction={() => navigation.navigate('Tabs')}
          />
        ) : (
          <View style={{ backgroundColor: c.surface }}>
            {savedItems.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                module={module}
                last={index === savedItems.length - 1}
                qty={cart.qtyOf(module, item.id)}
                favorite={isFavorite(module, item.id)}
                onFavorite={() => void askRemove(item.id, item.name)}
                onOpen={() => navigation.navigate('Item', { module, id: item.id })}
                onAdd={() => void actions.quickAdd(module, item, { id: (module === 'food' ? item.restaurantId : item.storeId) ?? '', name: '', deliveryFee: 0, minOrder: 0, etaMinutes: 30 })}
                onInc={() => {
                  const line = cart.linesFor(module).find((row) => row.refId === item.id);
                  if (line) actions.inc(module, line.id, line.qty);
                }}
                onDec={() => {
                  const line = cart.linesFor(module).find((row) => row.refId === item.id);
                  if (line) actions.dec(module, line.id, line.qty);
                }}
              />
            ))}
          </View>
        )
      ) : outlets.loading ? (
        <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.sm }}>
          <SkeletonRail count={2} cardWidth={268} height={116} />
        </View>
      ) : savedOutlets.length === 0 ? (
        <EmptyState
          icon="store"
          title="No saved stores"
          subtitle="Open a store and tap the heart to keep it here."
          actionLabel="Browse stores"
          onAction={() => navigation.navigate('Tabs')}
        />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.edge, paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
          {savedOutlets.map((row) => (
            <StoreCard
              key={row.id}
              store={row}
              onPress={() => navigation.navigate('Outlet', { module, id: row.id, name: row.name })}
              favorite={isFavorite(module, row.id)}
              onFavorite={() => void askRemove(row.id, row.name)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
