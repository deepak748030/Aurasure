'use client';

/**
 * Session activity log.
 *
 * The Node API has no audit-log collection yet (see docs/06-admin-panel.md
 * §6.4), so the panel keeps a local, per-browser trail of every mutating
 * action it performs. It is explicitly labelled as local-only in the UI.
 */

const KEY = 'aurasure.admin.activity';
const MAX = 200;

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

type Listener = (entries: ActivityEntry[]) => void;
const listeners = new Set<Listener>();

export function readActivity(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'at'>): void {
  if (typeof window === 'undefined') return;
  const next: ActivityEntry[] = [
    { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString() },
    ...readActivity(),
  ].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
}

export function clearActivity(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn([]));
}

export function subscribeActivity(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
