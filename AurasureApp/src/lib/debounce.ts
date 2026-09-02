'use strict';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Debounce + rate-control primitives used across the app so search/typeahead
 * and other chatty interactions behave like a production app (no request per
 * keystroke, no stale state after unmount).
 */

/** Trailing-edge debounce over a changing value (e.g. a search input). */
export function useDebouncedValue<T>(value: T, waitMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), waitMs);
    return () => clearTimeout(timer);
  }, [value, waitMs]);

  return debounced;
}

export interface DebouncedFn<A extends unknown[]> {
  (...args: A): void;
  /** Forget any pending invocation. */
  cancel: () => void;
  /** Run the latest callback immediately, dropping a pending timer. */
  flush: (...args: A) => void;
}

/**
 * Returns a stable, trailing-edge debounced callback. The latest callback is
 * always invoked (via ref), so callers never need to re-create the debounced
 * wrapper when their closure changes.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  waitMs = 300,
): DebouncedFn<A> {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const debounced = ((...args: A): void => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        cbRef.current(...args);
      }, waitMs);
    }) as DebouncedFn<A>;

    debounced.cancel = (): void => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
    debounced.flush = (...args: A): void => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      cbRef.current(...args);
    };
    return debounced;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitMs]);
}
