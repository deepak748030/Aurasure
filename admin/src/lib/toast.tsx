'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info } as const;

const TONE: Record<ToastKind, string> = {
  success: 'border-l-[3px] border-l-[var(--color-success)] text-ink-800',
  error: 'border-l-[3px] border-l-[var(--color-danger)] text-ink-800',
  info: 'border-l-[3px] border-l-brand-500 text-ink-800',
};

const ICON_TONE: Record<ToastKind, string> = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-danger)]',
  info: 'text-brand-600',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      seq.current += 1;
      const id = seq.current;
      setToasts((list) => [...list.slice(-3), { id, kind, message }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo<ToastApi>(
    () => ({
      push,
      success: (m: string) => push('success', m),
      error: (m: string) => push('error', m),
      info: (m: string) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind];
          return (
            <div
              key={toast.id}
              role="status"
              className={`fade-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 text-sm shadow-[var(--shadow-pop)] ring-1 ring-[var(--color-line)] ${TONE[toast.kind]}`}
            >
              <Icon size={17} className={`mt-0.5 shrink-0 ${ICON_TONE[toast.kind]}`} />
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => remove(toast.id)}
                className="text-ink-400 transition-colors hover:text-ink-700"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
