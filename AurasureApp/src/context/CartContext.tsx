import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { CartItem, ModuleKey } from '@/types';

interface CartState {
  items: CartItem[];
  /** Per-module instruction for "if any product is not available" (rides with the order). */
  availPref: Record<ModuleKey, string | null>;
}

type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'setQty'; id: string; qty: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'setAvailPref'; module: ModuleKey; value: string | null };

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: i.qty + action.item.qty } : i,
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case 'setQty': {
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter((i) => i.id !== action.id) };
      }
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)) };
    }
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'clear':
      return { ...state, items: [] };
    case 'setAvailPref':
      return { ...state, availPref: { ...state.availPref, [action.module]: action.value } };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Chosen "if any product is not available" instruction for a module. */
  availPrefFor: (module: ModuleKey) => string | null;
  setAvailPref: (module: ModuleKey, value: string | null) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    availPref: { food: null, shop: null },
  });

  const add = useCallback((item: CartItem) => dispatch({ type: 'add', item }), []);
  const setQty = useCallback((id: string, qty: number) => dispatch({ type: 'setQty', id, qty }), []);
  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const setAvailPref = useCallback(
    (module: ModuleKey, value: string | null) => dispatch({ type: 'setAvailPref', module, value }),
    [],
  );
  const availPrefFor = useCallback(
    (module: ModuleKey) => state.availPref[module] ?? null,
    [state.availPref],
  );

  const count = useMemo(() => state.items.reduce((n, i) => n + i.qty, 0), [state.items]);
  const subtotal = useMemo(
    () => state.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0),
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items: state.items, count, subtotal, add, setQty, remove, clear, availPrefFor, setAvailPref }),
    [state.items, count, subtotal, add, setQty, remove, clear, availPrefFor, setAvailPref],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
