import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Radio,
  ShoppingBag,
  Users,
  UserCheck,
  UtensilsCrossed,
  Store,
  Boxes,
  LayoutList,
  Sparkles,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Tags,
  ClipboardList,
  ShoppingCart,
  Ticket,
  Bike,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match child routes too (e.g. /orders/ord_1). */
  exact?: boolean;
  badge?: 'liveOrders' | 'pendingPartners' | 'pendingVendors' | 'pendingRiders';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Sidebar map. Every feature the panel ships is reachable from here - the
 * structure mirrors the reference admin (order management → promotions →
 * catalogue → users → reports → settings) mapped onto Aurasure's own data.
 */
export const NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      { label: 'Live Ops board', href: '/live-ops', icon: Radio, badge: 'liveOrders' },
    ],
  },
  {
    title: 'Order management',
    items: [
      { label: 'All orders', href: '/orders', icon: ShoppingBag },
      { label: 'Food orders', href: '/orders?module=food', icon: UtensilsCrossed },
      { label: 'Shop orders', href: '/orders?module=shop', icon: ShoppingCart },
      { label: 'Delivery tasks', href: '/delivery', icon: Bike },
    ],
  },
  {
    title: 'Food management',
    items: [
      { label: 'Restaurants', href: '/food/restaurants', icon: Store },
      { label: 'Food items', href: '/food/items', icon: UtensilsCrossed },
      { label: 'Food categories', href: '/food/categories', icon: LayoutList },
      { label: 'Collections', href: '/food/collections', icon: Sparkles },
    ],
  },
  {
    title: 'Shop management',
    items: [
      { label: 'Stores', href: '/shop/stores', icon: Store },
      { label: 'Products', href: '/shop/products', icon: Boxes },
      { label: 'Shop categories', href: '/shop/categories', icon: Tags },
    ],
  },
  {
    title: 'Promotions',
    items: [
      { label: 'Banners', href: '/banners', icon: ImageIcon },
      { label: 'Promo codes', href: '/promos', icon: Ticket },
    ],
  },
  {
    title: 'User management',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Vendors (KYC)', href: '/vendors', icon: Store, badge: 'pendingVendors' },
      { label: 'Delivery partners (KYC)', href: '/riders', icon: Bike, badge: 'pendingRiders' },
      { label: 'Partner applications', href: '/partners', icon: UserCheck, badge: 'pendingPartners' },
    ],
  },
  {
    title: 'Reports & system',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Activity log', href: '/activity', icon: ClipboardList },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

/** Flat list used by the sidebar search box and the topbar breadcrumb. */
export const NAV_FLAT: NavItem[] = NAV.flatMap((section) => section.items);

export function titleForPath(pathname: string): string {
  const match = NAV_FLAT.filter((item) => {
    const base = item.href.split('?')[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  }).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? 'Admin';
}
