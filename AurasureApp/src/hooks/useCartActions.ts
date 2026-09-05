import { useCallback } from 'react';
import { buildLine, useCart, type OutletSnapshot, type Selection } from '@/context/CartContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { haptic } from '@/lib/haptics';
import { money } from '@/lib/format';
import type { CatalogItem, ModuleKey } from '@/types';

/**
 * One place that decides what happens when a + / ADD is tapped:
 *  - simple item → straight into the cart (with a success haptic)
 *  - item with variants / add-ons / colours / sizes → bottom sheet first
 *  - different outlet than the current cart → confirm before replacing it
 * Everything here uses the bottom sheet; this app has no alert() anywhere.
 */

export type CartOutlet = Omit<OutletSnapshot, 'name'> & { name?: string };

export interface CartActions {
  quickAdd: (module: ModuleKey, item: CatalogItem, outlet?: CartOutlet) => Promise<void>;
  addSelection: (module: ModuleKey, selection: Omit<Selection, 'item'> & { item: CatalogItem }, outlet?: CartOutlet) => Promise<void>;
  inc: (module: ModuleKey, lineId: string, qty: number) => void;
  dec: (module: ModuleKey, lineId: string, qty: number) => void;
  removeLine: (module: ModuleKey, lineId: string, name: string) => Promise<void>;
}

export function needsChoices(item: CatalogItem): boolean {
  return (item.variants?.length ?? 0) > 0 || (item.addonGroups?.length ?? 0) > 0 || (item.colors?.length ?? 0) > 0 || (item.sizes?.length ?? 0) > 0;
}

function snapshot(outlet: CartOutlet | undefined, fallbackName: string): OutletSnapshot | null {
  if (!outlet) return { id: '', name: fallbackName, deliveryFee: 0, minOrder: 0, etaMinutes: 0 };
  return { ...outlet, name: outlet.name ?? fallbackName };
}

export function useCartActions(): CartActions {
  const cart = useCart();
  const sheet = useSheet();

  const commit = useCallback(
    async (module: ModuleKey, selection: Selection, outlet?: CartOutlet) => {
      const outletName = outlet?.name ?? selection.outletName ?? '';
      const line = { ...buildLine(module, selection), outletName };
      const snap = snapshot(outlet, outletName);
      if (cart.add(module, line, snap) === 'added') {
        haptic.success();
        return;
      }
      const current = cart.outletFor(module);
      const replace = await sheet.confirm({
        title: 'Start a new cart?',
        message: `Your ${module === 'food' ? 'cart' : 'bag'} has items from ${current?.name || 'another store'}, and one order can only come from one outlet. Empty it and add ${selection.item.name} from ${outletName || 'this store'}?`,
        confirmLabel: 'Replace cart',
        cancelLabel: 'Keep current cart',
        icon: 'cart',
      });
      if (!replace) return;
      cart.clear(module);
      cart.replaceCartWithLine(module, line, snap);
      haptic.warning();
      sheet.show({
        title: 'Cart switched',
        message: `The previous items were removed. ${selection.item.name} from ${outletName || 'this store'} is ready to check out.`,
        icon: 'check',
        tone: 'success',
        dismissLabel: 'Got it',
      });
    },
    [cart, sheet],
  );

  const quickAdd = useCallback(
    async (module: ModuleKey, item: CatalogItem, outlet?: CartOutlet) => {
      const already = cart.linesFor(module).some((line) => line.refId === item.id);
      if (needsChoices(item) && !already) {
        const options = [
          ...(item.variants ?? []).map((variant) => ({
            label: String(variant.label ?? variant.name ?? 'Option'),
            value: `variant:${String(variant.label ?? variant.name ?? '')}`,
            description: Number(variant.price ?? variant.optionPrice ?? 0) > 0 ? `Add ${money(Number(variant.price ?? variant.optionPrice ?? 0))}` : undefined,
            icon: 'circleCheck' as const,
          })),
          ...(item.colors ?? []).map((color) => ({ label: `${color}`, value: `color:${color}`, icon: 'palette' as const, description: 'Colour' })),
          ...(item.sizes ?? []).map((size) => ({ label: `${size}`, value: `size:${size}`, icon: 'ruler' as const, description: 'Size' })),
        ];
        if (options.length === 0) {
          await commit(module, { item }, outlet);
          return;
        }
        const picked = await sheet.pick({ title: item.name, subtitle: 'Pick one first', options });
        if (!picked) return;
        const [kind, ...rest] = picked.split(':');
        const value = rest.join(':');
        await commit(
          module,
          { item, ...(kind === 'color' ? { color: value } : kind === 'size' ? { size: value } : { variant: value }) },
          outlet,
        );
        return;
      }
      await commit(module, { item }, outlet);
    },
    [cart, commit, sheet],
  );

  const addSelection = useCallback(
    async (module: ModuleKey, selection: Omit<Selection, 'item'> & { item: CatalogItem }, outlet?: CartOutlet) => {
      await commit(module, { ...selection, outletName: selection.outletName ?? outlet?.name ?? '' }, outlet);
    },
    [commit],
  );

  const inc = useCallback(
    (module: ModuleKey, lineId: string, qty: number) => {
      haptic.selection();
      cart.setQty(module, lineId, Math.min(20, qty + 1));
    },
    [cart],
  );

  const dec = useCallback(
    (module: ModuleKey, lineId: string, qty: number) => {
      haptic.selection();
      cart.setQty(module, lineId, qty - 1);
    },
    [cart],
  );

  const removeLine = useCallback(
    async (module: ModuleKey, lineId: string, name: string) => {
      const ok = await sheet.confirm({
        title: 'Remove from cart?',
        message: `${name} will be taken out of your ${module === 'food' ? 'cart' : 'bag'}.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep it',
        destructive: true,
        icon: 'trash',
      });
      if (!ok) return;
      cart.remove(module, lineId);
      haptic.warning();
    },
    [cart, sheet],
  );

  return { quickAdd, addSelection, inc, dec, removeLine };
}
