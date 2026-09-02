'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, RefreshCw, LogOut, ChevronDown, Radio, CircleUser } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';
import { titleForPath } from '@/lib/nav';
import { initials } from '@/lib/format';
import { Button } from '@/components/ui/Button';

export function Topbar({ onMenu, live }: { onMenu: () => void; live?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-[var(--color-line)] bg-white/95 px-3 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
      >
        <Menu size={19} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-900 sm:text-base">
          {titleForPath(pathname)}
        </h1>
        <p className="hidden truncate text-[12px] text-ink-500 sm:block">
          Connected to the Aurasure Node.js API
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push('/live-ops')}
        className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100 sm:inline-flex"
      >
        <Radio size={16} className="text-brand-600" />
        Live
        {typeof live === 'number' && live > 0 ? (
          <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10.5px] font-semibold text-white tabular">
            {live}
          </span>
        ) : null}
      </button>

      <Button variant="ghost" size="icon" aria-label="Refresh data" onClick={refresh}>
        <RefreshCw size={17} className={clsx(refreshing && 'spin')} />
      </Button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 transition-colors hover:bg-ink-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[12.5px] font-semibold text-white">
            {user ? initials(user.name) : <CircleUser size={16} />}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[140px] truncate text-[13px] leading-tight font-medium text-ink-800">
              {user?.name ?? 'Admin'}
            </span>
            <span className="block text-[11px] text-ink-400">Administrator</span>
          </span>
          <ChevronDown size={15} className="hidden text-ink-400 sm:block" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="fade-up absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white shadow-[var(--shadow-pop)] ring-1 ring-[var(--color-line)]"
          >
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <p className="truncate text-[13.5px] font-medium text-ink-900">{user?.name}</p>
              <p className="truncate text-[12px] text-ink-500">{user?.phone}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                router.push('/settings');
              }}
              className="block w-full px-4 py-2.5 text-left text-[13.5px] text-ink-700 transition-colors hover:bg-ink-50"
            >
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13.5px] text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)]"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
