import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SearchField } from '@/components/ui/Input';
import { Icon, type IconName } from '@/lib/icons';
import { Chip, EmptyState, SectionHeader, Tag } from '@/components/ui/Primitives';
import { StoreCard } from '@/components/cards/Cards';
import { ItemRow } from '@/components/list/ItemRow';
import { SkeletonList, SkeletonRail } from '@/components/ui/Skeleton';
import { useQuery } from '@/hooks/useQuery';
import { search, type SearchResults } from '@/api/catalog';
import { useSession } from '@/context/SessionContext';
import { useCart } from '@/context/CartContext';
import { useCartActions } from '@/hooks/useCartActions';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { radius, spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import type { Nav } from '@/navigation/types';

const SUGGESTIONS: Record<'food' | 'shop', string[]> = {
  food: ['Biryani', 'Pizza', 'Dosa', 'Burger', 'Cake', 'Coffee', 'Thali', 'Rolls'],
  shop: ['Milk', 'Bread', 'Eggs', 'Shampoo', 'T-shirt', 'Earphones', 'Vitamins', 'Detergent'],
};

type Scope = 'all' | 'items' | 'stores';

export function SearchScreen({ navigation, route }: { navigation: Nav; route: { params?: { initial?: string } } }): React.ReactElement {
  const c = useColors();
  const sheet = useSheet();
  const cart = useCart();
  const actions = useCartActions();
  const { module, recentSearches, pushRecentSearch, clearRecentSearches, isFavorite, toggleFavorite } = useSession();
  const [text, setText] = useState(route.params?.initial ?? '');
  const [submitted, setSubmitted] = useState(route.params?.initial ?? '');
  const [scope, setScope] = useState<Scope>('all');

  const results = useQuery<SearchResults | null>(
    useCallback(async () => {
      const term = submitted.trim();
      if (term.length < 2) return null;
      return search(module, term);
    }, [module, submitted]),
    {},
  );

  const items = useMemo(() => (module === 'food' ? (results.data?.items ?? []) : (results.data?.products ?? [])), [results.data, module]);
  const stores = useMemo(() => (module === 'food' ? (results.data?.restaurants ?? []) : (results.data?.stores ?? [])), [results.data, module]);
  const searching = submitted.trim().length >= 2 && results.loading;

  const run = (term: string): void => {
    const clean = term.trim();
    setText(clean);
    setSubmitted(clean);
    if (clean.length >= 2) pushRecentSearch(clean);
  };

  const total = items.length + stores.length;

  return (
    <Screen title="Search" subtitle={module === 'food' ? 'Dishes, stores and cuisines' : 'Products and stores'} back={navigation.canGoBack()} padded={false}>
      <View style={{ paddingHorizontal: spacing.edge, gap: spacing.sm, paddingBottom: spacing.sm }}>
        <SearchField value={text} onChangeText={setText} placeholder={module === 'food' ? 'Search biryani, pizza, cafe…' : 'Search milk, soap, shoes…'} autoFocus onSubmit={() => run(text)} onClear={() => { setText(''); setSubmitted(''); }} />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {([
            { key: 'all', label: 'Everything', icon: 'layers' },
            { key: 'items', label: module === 'food' ? 'Dishes' : 'Products', icon: module === 'food' ? 'utensils' : 'bag' },
            { key: 'stores', label: module === 'food' ? 'Restaurants' : 'Stores', icon: 'store' },
          ] as { key: Scope; label: string; icon: IconName }[]).map((row) => (
            <Chip key={row.key} label={row.label} icon={row.icon} size="sm" selected={scope === row.key} onPress={() => setScope(row.key)} />
          ))}
        </View>
      </View>

      {searching ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.edge }}>
          <SkeletonRail count={3} height={120} cardWidth={200} />
          <SkeletonList rows={4} thumb={52} />
        </View>
      ) : results.error ? (
        <EmptyState icon="wifiOff" title="Search failed" subtitle={results.error.message} actionLabel="Try again" onAction={results.refresh} />
      ) : submitted.trim().length < 2 ? (
        <View style={{ paddingHorizontal: spacing.edge, gap: spacing.md, paddingTop: spacing.sm }}>
          {recentSearches.length > 0 ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="overline" tone="faint" style={{ flex: 1 }}>
                  RECENT SEARCHES
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void (async () => {
                      const ok = await sheet.confirm({ title: 'Clear recent searches?', message: 'This only affects this device.', confirmLabel: 'Clear', destructive: true, icon: 'trash' });
                      if (ok) clearRecentSearches();
                    })();
                  }}
                  hitSlop={8}
                >
                  <Text variant="caption" weight="semibold" color={c.primary}>
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View style={{ gap: 0, marginTop: spacing.xs, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                {recentSearches.map((term, index) => (
                  <Pressable
                    key={term}
                    accessibilityRole="button"
                    onPress={() => run(term)}
                    style={({ pressed }) => [styles.recentRow, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}
                  >
                    <Icon name="history" size={16} color={c.textTertiary} />
                    <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                      {term}
                    </Text>
                    <Icon name="chevronRight" size={14} color={c.textTertiary} />
                    {index < recentSearches.length - 1 ? <View style={styles.hair} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <Text variant="overline" tone="faint" style={{ paddingBottom: 6 }}>
              POPULAR SEARCHES
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTIONS[module].map((term) => (
                <Chip key={term} label={term} icon="search" size="sm" onPress={() => run(term)} />
              ))}
            </View>
          </View>

          <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.surfaceHi, gap: 4 }}>
            <Icon name="info" size={16} color={c.primary} />
            <Text variant="caption" tone="muted">
              Search covers {module === 'food' ? 'dishes, cuisines and restaurant names' : 'products, brands and store names'} in the {module === 'food' ? 'Food' : 'Shop'} catalogue. Switch the module in the home header to search the other one.
            </Text>
          </View>
        </View>
      ) : total === 0 ? (
        <EmptyState
          icon="search"
          title={`Nothing matches “${submitted}”`}
          subtitle="Check the spelling, or try a shorter word like “pizza” or “milk”."
          actionLabel="Clear search"
          onAction={() => { setText(''); setSubmitted(''); }}
        />
      ) : (
        <View style={{ paddingBottom: spacing.xxl }}>
          {(scope === 'all' || scope === 'stores') && stores.length > 0 ? (
            <>
              <SectionHeader title={module === 'food' ? `${stores.length} restaurant${stores.length === 1 ? '' : 's'}` : `${stores.length} store${stores.length === 1 ? '' : 's'}`} subtitle="Tap to open the menu" icon="store" />
              <View style={{ paddingHorizontal: spacing.edge }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {stores.slice(0, 4).map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      variant="row"
                      onPress={() => navigation.navigate('Outlet', { module, id: store.id, name: store.name })}
                      favorite={isFavorite(module, store.id)}
                      onFavorite={() => void toggleFavorite(module, store.id)}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {(scope === 'all' || scope === 'items') && items.length > 0 ? (
            <>
              <SectionHeader title={`${items.length} ${module === 'food' ? 'dish' : 'product'}${items.length === 1 ? '' : 'es'}`} subtitle="Add straight from here" icon={module === 'food' ? 'utensils' : 'bag'} />
              <View style={{ backgroundColor: c.surface }}>
                {items.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    module={module}
                    last={index === items.length - 1}
                    qty={cart.qtyOf(module, item.id)}
                    favorite={isFavorite(module, item.id)}
                    onFavorite={() => void toggleFavorite(module, item.id)}
                    onOpen={() => navigation.navigate('Item', { module, id: item.id })}
                    onAdd={() => {
                      const outletId = module === 'food' ? item.restaurantId ?? '' : item.storeId ?? '';
                      void actions.quickAdd(module, item, { id: outletId, name: '', deliveryFee: 0, minOrder: 0, etaMinutes: 30 });
                    }}
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
            </>
          ) : null}

          <View style={{ paddingHorizontal: spacing.edge, paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Tag label={`${total} result${total === 1 ? '' : 's'}`} icon="search" tone="muted" />
              <Tag label={`from ${money(0)}+`} icon="tag" tone="muted" />
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 12 },
  hair: { position: 'absolute', left: 40, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(120,100,118,0.12)' },
});
