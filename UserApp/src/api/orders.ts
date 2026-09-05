/**
 * Orders - `server/src/routes/order.routes.js`.
 *
 * IMPORTANT: the server reprices every line from the catalogue and resolves
 * the coupon itself, so the app sends intent (refId + qty + coupon code) and
 * renders the totals the server answers with.
 */

import { apiGetFull, apiPatch, apiPost, query, type Meta } from './client';
import type { CartLine, ModuleKey, Order, OrderStatus, PayBy } from '@/types';

export interface CreateOrderInput {
  module: ModuleKey;
  items: CartLine[];
  address: string;
  deliveryFee: number;
  payBy: PayBy;
  couponCode?: string;
  etaMinutes?: number;
  instructions?: string;
}

export interface CreateOrderResult {
  order: Order;
  wallet: number;
  loyaltyPoints: number;
}

export function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  return apiPost<CreateOrderResult>(
    '/orders',
    {
      module: input.module,
      address: input.address,
      deliveryFee: input.deliveryFee,
      payBy: input.payBy,
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      ...(typeof input.etaMinutes === 'number' ? { etaMinutes: input.etaMinutes } : {}),
      ...(input.instructions ? { instructions: input.instructions } : {}),
      items: input.items.map((line) => ({
        id: line.id,
        refId: line.refId,
        kind: line.kind,
        name: line.name,
        unitPrice: line.unitPrice,
        qty: line.qty,
        meta: line.meta || undefined,
        image: line.image ?? null,
      })),
    },
    { auth: true },
  );
}

export function listOrders(
  params: { module?: ModuleKey; status?: OrderStatus | 'running'; page?: number; limit?: number } = {},
): Promise<{ orders: Order[]; meta?: Meta }> {
  return apiGetFull<{ orders: Order[] }>(`/orders${query({ ...params, limit: params.limit ?? 20 })}`, {
    auth: true,
  }).then((r) => ({ orders: r.data.orders ?? [], meta: r.meta }));
}

export function getOrder(id: string): Promise<Order> {
  return apiGetFull<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, { auth: true }).then((r) => r.data.order);
}

/** Only `cancelled` is accepted from a customer - the server enforces that. */
export function cancelOrder(id: string, cancelReason: string): Promise<Order> {
  return apiPatch<{ order: Order }>(
    `/orders/${encodeURIComponent(id)}/status`,
    { status: 'cancelled', cancelReason },
    { auth: true },
  ).then((r) => r.order);
}

/* ------------------------------ status helpers ---------------------------- */

export const ORDER_STEPS = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'] as const;

export function stepIndex(status: OrderStatus): number {
  const index = (ORDER_STEPS as readonly string[]).indexOf(status);
  if (index >= 0) return index;
  return status === 'cancelled' ? -1 : 0;
}

export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case 'placed':
      return 'Order placed';
    case 'confirmed':
      return 'Restaurant confirmed';
    case 'preparing':
      return 'Preparing your food';
    case 'out_for_delivery':
      return 'Out for delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function statusMessage(status: OrderStatus): string {
  switch (status) {
    case 'placed':
      return 'We have sent your order to the kitchen. They will confirm in a moment.';
    case 'confirmed':
      return 'The kitchen accepted your order and started cooking.';
    case 'preparing':
      return 'Your food is being prepared fresh right now.';
    case 'out_for_delivery':
      return 'Your rider is on the way with your order.';
    case 'delivered':
      return 'Order delivered. Enjoy your meal!';
    case 'cancelled':
      return 'This order was cancelled. Any wallet money used is refunded instantly.';
    default:
      return '';
  }
}

export const RUNNING_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'out_for_delivery'];

export function isRunning(order: Order): boolean {
  return RUNNING_STATUSES.includes(order.status);
}

export function canCancel(order: Order): boolean {
  return order.status === 'placed' || order.status === 'confirmed';
}

/** ETA as a Date, derived from the server's `etaMinutes` at placement time. */
export function etaAt(order: Order): Date | null {
  if (!order.etaMinutes || order.status === 'cancelled' || order.status === 'delivered') return null;
  return new Date(new Date(order.placedAt).getTime() + order.etaMinutes * 60_000);
}
