import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import type { CartItem, ModuleKey } from '@/types';

/**
 * The cart is shared across modules (a food order and a shop order can both
 * exist), but every screen only ever shows the selected module's line items.
 */
export function useModuleCart(): { module: ModuleKey; items: CartItem[]; count: number; subtotal: number } {
  const { module } = useApp();
  const { items, count, subtotal } = useCart();

  return useMemo(() => {
    const mine = items.filter((i) => i.kind === module);
    return {
      module,
      items: mine,
      count: mine.reduce((n, i) => n + i.qty, 0),
      subtotal: mine.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    };
  }, [items, count, subtotal, module]);
}
