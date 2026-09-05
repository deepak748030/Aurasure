/**
 * Customer-app surface: settings, editorial content, cities, trending
 * searches, flash sales, brands, notifications and support tickets.
 * Mirrors `server/src/controllers/{app,flashSale,notification,support}.js`.
 */

import { apiGet, apiPost } from './client';
import type { CatalogItem, ImageRef, ModuleKey } from '@/types';
import type { IconName } from '@/lib/icons';

export interface LoyaltyTierRule {
  name: string;
  min: number;
  color: string;
}

export interface LoyaltyRules {
  earnPer100: number;
  redeemPoints: number;
  redeemValue: number;
  tiers: LoyaltyTierRule[];
}

export interface ReferralReward {
  wallet: number;
  points: number;
  referrerWallet: number;
}

export interface PaymentMethod {
  key: string;
  label: string;
  sub: string;
  icon: IconName;
  enabled: boolean;
}

export interface SupportChannels {
  phone: string;
  displayPhone: string;
  email: string;
  hours: string;
  slaMinutes: number;
}

export interface AppSettings {
  referral: { walletReward: number; pointsReward: number; referrerWallet: number; terms: string[] };
  loyalty: LoyaltyRules;
  wallet: { topupPresets: number[]; minTopup: number; maxTopup: number };
  support: SupportChannels;
  payments: PaymentMethod[];
  checkout: { tips: number[] };
  search: Record<'food' | 'shop', string[]>;
  delivery: { defaultEta: number; minEta: number; maxEta: number };
  cityCenters: Record<string, { lat: number; lng: number }>;
}

export function fetchAppSettings(signal?: AbortSignal): Promise<AppSettings> {
  return apiGet<{ settings: AppSettings }>('/app/settings', { signal }).then((r) => r.settings);
}

/* --------------------------------- content -------------------------------- */

export interface FaqItem {
  q: string;
  a: string;
  match: string[];
  icon: IconName;
}

export interface PolicySection {
  heading: string;
  body: string;
}

export interface PolicyDoc {
  title: string;
  icon: IconName;
  updated: string;
  intro: string;
  sections: PolicySection[];
}

export interface PartnerPerks {
  hero: { title: string; subtitle: string };
  perks: { icon: IconName; title: string; body: string }[];
}

export function fetchFaqs(signal?: AbortSignal): Promise<FaqItem[]> {
  return apiGet<{ content: { data: { items: FaqItem[] } } }>('/app/content/faqs', { signal }).then(
    (r) => r.content.data.items ?? [],
  );
}

export function fetchPolicy(kind: 'cancellation' | 'refund' | 'privacy' | 'terms', signal?: AbortSignal): Promise<PolicyDoc> {
  return apiGet<{ content: { data: PolicyDoc } }>(`/app/content/policy-${kind}`, { signal }).then((r) => r.content.data);
}

export function fetchPartnerPerks(signal?: AbortSignal): Promise<PartnerPerks> {
  return apiGet<{ content: { data: PartnerPerks } }>('/app/content/partner-perks', { signal }).then((r) => r.content.data);
}

/* --------------------------------- cities --------------------------------- */

export interface ServiceCity {
  name: string;
  outlets: number;
  lat: number | null;
  lng: number | null;
}

export function fetchCities(signal?: AbortSignal): Promise<ServiceCity[]> {
  return apiGet<{ cities: ServiceCity[] }>('/app/cities', { signal }).then((r) => r.cities ?? []);
}

/* --------------------------------- search --------------------------------- */

export function fetchTrending(module: ModuleKey, signal?: AbortSignal): Promise<string[]> {
  return apiGet<{ module: ModuleKey; trending: string[] }>(
    `/search/trending?module=${module}`,
    { signal },
  ).then((r) => r.trending ?? []);
}

/* ------------------------------- flash sales ------------------------------ */

export interface FlashSale {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  badge: string;
  startsAt: string;
  endsAt: string;
  itemIds: string[];
  active: boolean;
}

export interface OutletSnapshot {
  id: string;
  name: string;
  deliveryFee: number;
  minOrder: number;
  etaMinutes: number;
}

export interface FlashSalePayload {
  sale: FlashSale | null;
  items: CatalogItem[];
  outlets: Record<string, OutletSnapshot>;
}

export function fetchActiveFlashSale(module: ModuleKey, signal?: AbortSignal): Promise<FlashSalePayload> {
  return apiGet<FlashSalePayload>(`/flash-sales/active?module=${module}`, { signal });
}

/* --------------------------------- brands --------------------------------- */

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  image: ImageRef | null;
  featured: boolean;
  sortOrder: number;
  active: boolean;
  items: number;
}

export function fetchBrands(signal?: AbortSignal): Promise<Brand[]> {
  return apiGet<{ brands: Brand[] }>('/shop/brands', { signal }).then((r) => r.brands ?? []);
}

export function fetchBrand(
  id: string,
  signal?: AbortSignal,
): Promise<{ brand: Brand; products: CatalogItem[]; stores: Record<string, OutletSnapshot> }> {
  return apiGet<{ brand: Brand; products: CatalogItem[]; stores: Record<string, OutletSnapshot> }>(
    `/shop/brands/${encodeURIComponent(id)}`,
    { signal },
  );
}

/* ------------------------------ notifications ----------------------------- */

export type NoticeKind = 'orders' | 'money' | 'promo' | 'support';

export interface Notice {
  id: string;
  title: string;
  body: string;
  when: string;
  icon: IconName;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  kind: NoticeKind;
  orderId: string | null;
  link: string | null;
  unread: boolean;
}

export function fetchNotifications(signal?: AbortSignal): Promise<{ notifications: Notice[]; unread: number }> {
  return apiGet<{ notifications: Notice[]; unread: number }>('/users/me/notifications', { auth: true, signal });
}

export function markNotificationsRead(ids?: string[]): Promise<{ unread: number; readAt: string }> {
  return apiPost<{ unread: number; readAt: string }>('/users/me/notifications/read', ids ? { ids } : {}, { auth: true });
}

/* ----------------------------- support tickets ---------------------------- */

export interface SupportTicket {
  id: string;
  message: string;
  orderCode: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  response: string;
  createdAt: string;
  updatedAt: string;
}

export function createSupportTicket(message: string, orderCode?: string): Promise<SupportTicket> {
  return apiPost<{ ticket: SupportTicket }>(
    '/users/me/support-tickets',
    { message, ...(orderCode ? { orderCode } : {}) },
    { auth: true },
  ).then((r) => r.ticket);
}

export function fetchMyTickets(signal?: AbortSignal): Promise<SupportTicket[]> {
  return apiGet<{ tickets: SupportTicket[] }>('/users/me/support-tickets', { auth: true, signal }).then(
    (r) => r.tickets ?? [],
  );
}

/* ---------------------------- delivery estimate --------------------------- */

export interface DeliveryEstimate {
  module: ModuleKey;
  city: string | null;
  etaMinutes: number;
  label: string;
  outlets: { id: string; name: string; city: string | null }[];
}

export function fetchDeliveryEstimate(module: ModuleKey, city?: string, signal?: AbortSignal): Promise<DeliveryEstimate> {
  const params = new URLSearchParams({ module });
  if (city) params.set('city', city);
  return apiGet<DeliveryEstimate>(`/users/me/delivery-estimate?${params.toString()}`, { auth: true, signal });
}
