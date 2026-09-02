'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search, X, ShieldCheck } from 'lucide-react';
import { NAV } from '@/lib/nav';
import type { Stats } from '@/lib/types';

function useActive(pathname: string) {
  return useMemo(
    () => (href: string, exact?: boolean) => {
      const [base, query] = href.split('?');
      if (query) {
        // `/orders?module=food` only lights up when that query is active.
        return false;
      }
      if (exact) return pathname === base;
      return pathname === base || pathname.startsWith(`${base}/`);
    },
    [pathname],
  );
}

export function SidebarContent({
  stats,
  onNavigate,
}: {
  stats?: Stats;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = useActive(pathname);
  const [filter, setFilter] = useState('');

  const sections = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return NAV;
    return NAV.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(needle)),
    })).filter((section) => section.items.length > 0);
  }, [filter]);

  const badgeValue = (badge?: string): number => {
    if (!stats || !badge) return 0;
    if (badge === 'liveOrders') return stats.liveOrders ?? 0;
    if (badge === 'pendingPartners') return stats.pendingPartners ?? 0;
    if (badge === 'pendingVendors') return stats.pendingVendors ?? 0;
    return 0;
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-[15px] font-bold text-white">
          A
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] leading-tight font-semibold tracking-[-0.01em] text-ink-900">
            Aurasure
          </span>
          <span className="block truncate text-[11.5px] text-ink-500">Admin console</span>
        </span>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search menu…"
            className="h-9 w-full rounded-lg bg-ink-50 pl-9 text-[13px] text-ink-800 ring-1 ring-transparent transition-shadow placeholder:text-ink-400 focus:bg-white focus:ring-brand-500"
          />
          {filter ? (
            <button
              type="button"
              aria-label="Clear menu search"
              onClick={() => setFilter('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-ink-400 uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const count = badgeValue(item.badge);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={clsx(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                        active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      )}
                    >
                      <Icon size={17} className={active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 ? (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10.5px] font-semibold text-white tabular">
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {sections.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-ink-400">No menu item matches “{filter}”.</p>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2 text-[11.5px] text-ink-400">
          <ShieldCheck size={14} className="text-ink-300" />
          <span className="truncate">
            Aurasure Admin · v1.0.0 · {process.env.NEXT_PUBLIC_ADMIN_ENV ?? 'development'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  open,
  onClose,
  stats,
}: {
  open: boolean;
  onClose: () => void;
  stats?: Stats;
}) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-[var(--color-line)] lg:block">
        <SidebarContent stats={stats} />
      </aside>

      {/* Mobile / tablet drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-[80] lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className={clsx(
            'absolute inset-0 bg-[rgba(11,16,32,0.45)] transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={clsx(
            'absolute inset-y-0 left-0 w-[86%] max-w-[300px] shadow-[var(--shadow-pop)] transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent stats={stats} onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}
