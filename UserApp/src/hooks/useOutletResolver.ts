import { useCallback, useRef } from 'react';
import { fetchOutletSnapshot, type OutletSnapshot } from '@/api/catalog';
import type { CatalogItem, ModuleKey } from '@/types';

/**
 * Resolves the real outlet snapshot for an item, memoised per outlet id so a
 * list that mixes ten items from two stores fires two requests, not ten.
 * Falls back to the item's own ETA hints when the outlet cannot be loaded
 * (offline, deleted) — the server still reprices and validates at checkout.
 */
export function useOutletResolver(module: ModuleKey): (item: CatalogItem) => Promise<OutletSnapshot> {
  const cache = useRef(new Map<string, Promise<OutletSnapshot | null>>());

  return useCallback(
    async (item: CatalogItem): Promise<OutletSnapshot> => {
      const outletId = (module === 'food' ? item.restaurantId : item.storeId) ?? '';
      const fallback: OutletSnapshot = {
        id: outletId,
        name: '',
        deliveryFee: 0,
        minOrder: 0,
        etaMinutes: module === 'food' ? (item.prepTime ?? 30) : (item.deliveryMins ?? 40),
      };
      if (!outletId) return fallback;
      let pending = cache.current.get(outletId);
      if (!pending) {
        pending = fetchOutletSnapshot(module, outletId);
        cache.current.set(outletId, pending);
      }
      return (await pending) ?? fallback;
    },
    [module],
  );
}
