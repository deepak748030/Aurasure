import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StorageKey, readJson, writeJson } from '@/lib/storage';
import { useSession } from './SessionContext';
import { couponDiscount, isCouponUsable } from '@/api/rewards';
import type { CartLine, CatalogItem, ModuleKey, PayBy } from '@/types';
import { feedback } from '@/theme/tokens';

/**
 * Cart lives on the phone (the API has no cart resource - `POST /orders` takes
 * the lines directly), so it is persisted to AsyncStorage and mirrored per
 * module. One outlet per module is enforced because the server stamps
 * `outletId` from the first line: mixing kitchens would silently drop items.
 */

export interface Selection {
  item: CatalogItem;
  variant?: string;
  addons?: string[];
  color?: string;
  size?: string;
  qty?: number;
  /** Name shown on the cart + coupon bar ("Aurora Bistro"). */
  outletName?: string;
}

/** Snapshot of the outlet the cart belongs to (the server allows one per order). */
export interface OutletSnapshot {
  id: string;
  name: string;
  deliveryFee: number;
  minOrder: number;
  etaMinutes: number;
  image?: import('@/types').ImageRef | null;
}

export interface SlotChoice {
  id: string;
  label: string;
  sub: string;
  etaMinutes: number | null;
}

interface CartState {
  lines: Record<ModuleKey, CartLine[]>;
  outlets: Record<ModuleKey, OutletSnapshot | null>;
  couponCode: Record<ModuleKey, string | null>;
  payBy: PayBy;
  deliveryType: 'delivery' | 'pickup';
  slotId: string | null;
  note: Record<ModuleKey, string>;
  unavailablePref: Record<ModuleKey, string | null>;
  tip: Record<ModuleKey, number>;
  contactless: Record<ModuleKey, boolean>;
}

const EMPTY: CartState = {
  lines: { food: [], shop: [] },
  outlets: { food: null, shop: null },
  couponCode: { food: null, shop: null },
  payBy: 'cod',
  deliveryType: 'delivery',
  slotId: null,
  note: { food: '', shop: '' },
  unavailablePref: { food: null, shop: null },
  tip: { food: 0, shop: 0 },
  contactless: { food: false, shop: false },
};

interface CartValue extends CartState {
  hydrated: boolean;
  countFor: (module: ModuleKey) => number;
  totalFor: (module: ModuleKey) => number;
  /** Discount preview from the wallet coupon — the server recalculates on submit. */
  discountFor: (module: ModuleKey) => number;
  /** Coupon object behind the saved code (null when nothing is applied). */
  couponFor: (module: ModuleKey) => import('@/types').UserCoupon | null;
  linesFor: (module: ModuleKey) => CartLine[];
  outletFor: (module: ModuleKey) => OutletSnapshot | null;
  /** Server repricing can differ from the cached price; checkout compares these. */
  addFromSelection: (module: ModuleKey, selection: Selection, outlet?: OutletSnapshot | null) => CartLine;
  /** Returns 'added' | 'needs-switch' (different outlet, cart not empty). */
  add: (module: ModuleKey, line: CartLine, outlet?: OutletSnapshot | null) => 'added' | 'needs-switch';
  replaceCartWithLine: (module: ModuleKey, line: CartLine, outlet?: OutletSnapshot | null) => void;
  setQty: (module: ModuleKey, lineId: string, qty: number) => void;
  remove: (module: ModuleKey, lineId: string) => void;
  clear: (module: ModuleKey) => void;
  clearAll: () => void;
  qtyOf: (module: ModuleKey, refId: string) => number;
  setCoupon: (module: ModuleKey, code: string | null) => void;
  setPayBy: (value: PayBy) => void;
  setDeliveryType: (value: 'delivery' | 'pickup') => void;
  setSlot: (id: string | null) => void;
  setNote: (module: ModuleKey, value: string) => void;
  setUnavailablePref: (module: ModuleKey, key: string | null) => void;
  setTip: (module: ModuleKey, value: number) => void;
  setContactless: (module: ModuleKey, value: boolean) => void;
  /** Combined text written to `Order.instructions` (max 200 chars on the server). */
  buildInstructions: (module: ModuleKey) => string;
  etaMinutesFor: () => number | undefined;
  cartHasItems: boolean;
  totalCartCount: number;
}

const CartContext = createContext<CartValue | null>(null);

export function lineKey(refId: string, selection: { variant?: string; addons?: string[]; color?: string; size?: string }): string {
  const parts = [
    refId,
    selection.variant ?? '',
    (selection.addons ?? []).slice().sort().join('|'),
    selection.color ?? '',
    selection.size ?? '',
  ];
  return parts.join('__');
}

export function addonSurcharge(item: CatalogItem, selectedAddons: string[]): number {
  const groups = item.addonGroups ?? [];
  return groups.reduce((sum, group) => {
    const options = group.options ?? [];
    return (
      sum +
      options.reduce((inner, option) => {
        const label = option.label ?? option.name ?? option.title ?? '';
        if (!selectedAddons.includes(label)) return inner;
        return inner + (Number(option.optionPrice ?? option.price ?? 0) || 0);
      }, 0)
    );
  }, 0);
}

export function variantSurcharge(item: CatalogItem, variant: string | undefined): number {
  if (!variant) return 0;
  const options = item.variants ?? [];
  const found = options.find((option) => (option.label ?? option.name ?? option.title) === variant);
  return Number(found?.price ?? found?.optionPrice ?? 0) || 0;
}

export function unitPriceFor(item: CatalogItem, selection: { variant?: string; addons?: string[] }): number {
  return Math.max(0, (Number(item.price) || 0) + variantSurcharge(item, selection.variant) + addonSurcharge(item, selection.addons ?? []));
}

export function describeSelection(selection: { variant?: string; addons?: string[]; color?: string; size?: string }): string {
  return [selection.variant, selection.color ? `Colour: ${selection.color}` : null, selection.size ? `Size: ${selection.size}` : null, ...(selection.addons ?? [])]
    .filter(Boolean)
    .join(' · ');
}

/** Time slots offered at checkout (mapped onto the server's `etaMinutes`). */
export function buildSlots(now = new Date()): SlotChoice[] {
  const slots: SlotChoice[] = [{ id: 'asap', label: 'Deliver as soon as possible', sub: 'Usually 20-35 min', etaMinutes: null }];
  const base = new Date(now.getTime() + 45 * 60_000);
  base.setMinutes(Math.ceil(base.getMinutes() / 15) * 15, 0, 0);
  for (let i = 0; i < 6; i += 1) {
    const start = new Date(base.getTime() + i * 45 * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    const fmt = (d: Date): string => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    slots.push({
      id: `slot-${start.getTime()}`,
      label: `${fmt(start)} - ${fmt(end)}`,
      sub: i === 0 ? 'Next available' : 'Scheduled',
      etaMinutes: Math.max(10, Math.round((start.getTime() - now.getTime()) / 60_000)),
    });
  }
  return slots;
}

export function CartProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user } = useSession();
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const lastWrite = useRef<string>('');

  useEffect(() => {
    void readJson<Partial<CartState>>(StorageKey.cart, {}).then((stored) => {
      if (stored && typeof stored === 'object') {
        setState((prev) => ({
          ...prev,
          ...stored,
          lines: { ...prev.lines, ...(stored.lines ?? {}) },
          outlets: { ...prev.outlets, ...(stored.outlets ?? {}) },
          couponCode: { ...prev.couponCode, ...(stored.couponCode ?? {}) },
          note: { ...prev.note, ...(stored.note ?? {}) },
          unavailablePref: { ...prev.unavailablePref, ...(stored.unavailablePref ?? {}) },
          tip: { ...prev.tip, ...(stored.tip ?? {}) },
          contactless: { ...prev.contactless, ...(stored.contactless ?? {}) },
        }));
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastWrite.current) return;
    lastWrite.current = serialized;
    void writeJson(StorageKey.cart, state);
  }, [state, hydrated]);

  const add = useCallback((module: ModuleKey, line: CartLine, outlet?: OutletSnapshot | null): 'added' | 'needs-switch' => {
    let outcome: 'added' | 'needs-switch' = 'added';
    setState((prev) => {
      const current = prev.lines[module];
      const existing = current.find((l) => l.id === line.id);
      if (existing) {
        return {
          ...prev,
          lines: { ...prev.lines, [module]: current.map((l) => (l.id === line.id ? { ...l, qty: l.qty + line.qty } : l)) },
          outlets: outlet ? { ...prev.outlets, [module]: outlet } : prev.outlets,
        };
      }
      const otherOutlet = current.find((l) => l.outletId !== line.outletId);
      if (otherOutlet) {
        outcome = 'needs-switch';
        return prev;
      }
      return {
        ...prev,
        lines: { ...prev.lines, [module]: [...current, line] },
        outlets: outlet ? { ...prev.outlets, [module]: outlet } : prev.outlets,
      };
    });
    return outcome;
  }, []);

  const replaceCartWithLine = useCallback((module: ModuleKey, line: CartLine, outlet?: OutletSnapshot | null) => {
    setState((prev) => ({
      ...prev,
      lines: { ...prev.lines, [module]: [line] },
      outlets: outlet ? { ...prev.outlets, [module]: outlet } : prev.outlets,
    }));
  }, []);

  const setQty = useCallback((module: ModuleKey, lineId: string, qty: number) => {
    setState((prev) => {
      const current = prev.lines[module];
      if (qty <= 0) return { ...prev, lines: { ...prev.lines, [module]: current.filter((l) => l.id !== lineId) } };
      return { ...prev, lines: { ...prev.lines, [module]: current.map((l) => (l.id === lineId ? { ...l, qty } : l)) } };
    });
  }, []);

  const remove = useCallback((module: ModuleKey, lineId: string) => {
    setState((prev) => ({ ...prev, lines: { ...prev.lines, [module]: prev.lines[module].filter((l) => l.id !== lineId) } }));
  }, []);

  const clear = useCallback((module: ModuleKey) => {
    setState((prev) => ({
      ...prev,
      lines: { ...prev.lines, [module]: [] },
      outlets: { ...prev.outlets, [module]: null },
      couponCode: { ...prev.couponCode, [module]: null },
      note: { ...prev.note, [module]: '' },
      tip: { ...prev.tip, [module]: 0 },
    }));
  }, []);

  const clearAll = useCallback(() => setState(EMPTY), []);

  const addFromSelection = useCallback((module: ModuleKey, selection: Selection, outlet?: OutletSnapshot | null): CartLine => {
    const line = buildLine(module, selection);
    add(module, line, outlet ?? null);
    return line;
  }, [add]);

  const countFor = useCallback((module: ModuleKey) => state.lines[module].reduce((sum, l) => sum + l.qty, 0), [state.lines]);
  const totalFor = useCallback((module: ModuleKey) => state.lines[module].reduce((sum, l) => sum + l.linePrice * l.qty, 0), [state.lines]);
  const qtyOf = useCallback(
    (module: ModuleKey, refId: string) =>
      state.lines[module].filter((l) => l.refId === refId).reduce((sum, l) => sum + l.qty, 0),
    [state.lines],
  );

  const outletFor = useCallback((module: ModuleKey) => state.outlets[module] ?? null, [state.outlets]);

  /** The user's own copy of the applied code, still usable for this cart. */
  const couponFor = useCallback(
    (module: ModuleKey): import('@/types').UserCoupon | null => {
      const code = state.couponCode[module];
      if (!code) return null;
      const owned = (user?.coupons ?? []).find((c) => String(c.code).toUpperCase() === code.toUpperCase());
      if (!owned) return null;
      const itemTotal = state.lines[module].reduce((sum, line) => sum + line.linePrice * line.qty, 0);
      return isCouponUsable(owned, itemTotal).ok ? owned : null;
    },
    [state.couponCode, state.lines, user],
  );

  // Discount preview mirrors `server/src/utils/coupons.js`; the invoice is still
  // computed by the server, so a mismatch can never cost the customer money.
  const discountFor = useCallback(
    (module: ModuleKey) => {
      const coupon = couponFor(module);
      if (!coupon) return 0;
      const itemTotal = state.lines[module].reduce((sum, line) => sum + line.linePrice * line.qty, 0);
      return couponDiscount(coupon, itemTotal);
    },
    [couponFor, state.lines],
  );

  const setCoupon = useCallback((module: ModuleKey, code: string | null) => {
    setState((prev) => ({ ...prev, couponCode: { ...prev.couponCode, [module]: code } }));
  }, []);
  const setPayBy = useCallback((value: PayBy) => setState((prev) => ({ ...prev, payBy: value })), []);
  const setDeliveryType = useCallback(
    (value: 'delivery' | 'pickup') => setState((prev) => ({ ...prev, deliveryType: value })),
    [],
  );
  const setSlot = useCallback((id: string | null) => setState((prev) => ({ ...prev, slotId: id })), []);
  const setNote = useCallback((module: ModuleKey, value: string) => {
    setState((prev) => ({ ...prev, note: { ...prev.note, [module]: value.slice(0, 160) } }));
  }, []);
  const setUnavailablePref = useCallback((module: ModuleKey, key: string | null) => {
    setState((prev) => ({ ...prev, unavailablePref: { ...prev.unavailablePref, [module]: key } }));
  }, []);
  const setTip = useCallback((module: ModuleKey, value: number) => {
    setState((prev) => ({ ...prev, tip: { ...prev.tip, [module]: Math.max(0, value) } }));
  }, []);
  const setContactless = useCallback((module: ModuleKey, value: boolean) => {
    setState((prev) => ({ ...prev, contactless: { ...prev.contactless, [module]: value } }));
  }, []);

  const buildInstructions = useCallback(
    (module: ModuleKey) => {
      const parts: string[] = [];
      const prefKey = state.unavailablePref[module];
      if (prefKey) {
        const option = feedback.unavailableOptions.find((o) => o.key === prefKey);
        if (option) parts.push(`If unavailable: ${option.label}`);
      }
      if (state.contactless[module]) parts.push('Contactless delivery');
      const tipValue = state.tip[module];
      if (tipValue > 0) parts.push(`Cash tip for the rider: ₹${tipValue}`);
      const note = state.note[module].trim();
      if (note) parts.push(note);
      return parts.join(' · ').slice(0, 200);
    },
    [state.unavailablePref, state.contactless, state.tip, state.note],
  );

  const etaMinutesFor = useCallback(() => {
    if (!state.slotId || state.slotId === 'asap') return undefined;
    const slot = buildSlots().find((s) => s.id === state.slotId);
    return slot?.etaMinutes ?? undefined;
  }, [state.slotId]);

  const totalCartCount = countFor('food') + countFor('shop');

  const value = useMemo<CartValue>(
    () => ({
      ...state,
      hydrated,
      countFor,
      totalFor,
      discountFor,
      couponFor,
      linesFor: (module: ModuleKey) => state.lines[module],
      outletFor,
      addFromSelection,
      add,
      replaceCartWithLine,
      setQty,
      remove,
      clear,
      clearAll,
      qtyOf,
      setCoupon,
      setPayBy,
      setDeliveryType,
      setSlot,
      setNote,
      setUnavailablePref,
      setTip,
      setContactless,
      buildInstructions,
      etaMinutesFor,
      cartHasItems: totalCartCount > 0,
      totalCartCount,
    }),
    [
      state,
      hydrated,
      countFor,
      totalFor,
      discountFor,
      couponFor,
      outletFor,
      addFromSelection,
      add,
      replaceCartWithLine,
      setQty,
      remove,
      clear,
      clearAll,
      qtyOf,
      setCoupon,
      setPayBy,
      setDeliveryType,
      setSlot,
      setNote,
      setUnavailablePref,
      setTip,
      setContactless,
      buildInstructions,
      etaMinutesFor,
      totalCartCount,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Pure line builder — also used by "reorder" on the order screens. */
export function buildLine(module: ModuleKey, selection: Selection): CartLine {
  const { item } = selection;
  const addons = selection.addons ?? [];
  const unitPrice = Number(item.price) || 0;
  const linePrice = unitPriceFor(item, { variant: selection.variant, addons });
  const outletId = module === 'food' ? (item.restaurantId ?? '') : (item.storeId ?? '');
  return {
    id: lineKey(item.id, { variant: selection.variant, addons, color: selection.color, size: selection.size }),
    refId: item.id,
    kind: module,
    name: item.name,
    image: item.image ?? null,
    unitPrice,
    linePrice,
    qty: selection.qty ?? 1,
    variant: selection.variant,
    addons,
    color: selection.color,
    size: selection.size,
    outletId,
    outletName: '',
    meta: describeSelection({ variant: selection.variant, addons, color: selection.color, size: selection.size }),
  };
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
