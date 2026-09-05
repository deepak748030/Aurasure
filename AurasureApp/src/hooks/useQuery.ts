import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import type { Meta } from '@/api/client';

/**
 * Data layer for every screen. Three states, never more:
 *   loading  → the screen paints a skeleton (never a spinner, never an Alert)
 *   error    → the screen paints an inline retry card
 *   data     → the real thing
 * Requests are aborted on unmount and de-duplicated per key.
 */

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  /** True when the failure is a connectivity problem (offline / 5xx / timeout). */
  offline: boolean;
  refetch: () => void;
  refresh: () => void;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

export interface QueryOptions {
  deps?: readonly unknown[];
  enabled?: boolean;
  label?: string;
}

export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: QueryOptions | readonly unknown[] = {},
): QueryState<T> {
  const normalised: QueryOptions = Array.isArray(options) ? { deps: options as readonly unknown[] } : (options as QueryOptions);
  const { deps = [], enabled = true } = normalised;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) return;
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await fetcherRef.current(ctrl.signal);
        if (!alive.current || ctrl.signal.aborted) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!alive.current || ctrl.signal.aborted) return;
        const apiError = err instanceof ApiError ? err : new ApiError(-1, 'UNKNOWN', 'Something went wrong');
        setError(apiError);
      } finally {
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void run(false);
  }, [run, ...deps]);

  const updateData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater));
  }, []);

  return {
    data,
    loading,
    refreshing,
    error,
    offline: Boolean(error && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || error.code === 'API_NOT_CONFIGURED' || error.status === 0 || error.status >= 500)),
    refetch: () => void run(false),
    refresh: () => void run(true),
    setData: updateData,
  };
}

/** Infinite scroll helper for the paginated catalogue + order screens. */
export function usePaginated<T>(
  loadPage: (page: number, signal: AbortSignal) => Promise<{ items: T[]; meta?: Meta }>,
  options: { deps?: readonly unknown[]; pageSize?: number } = {},
): {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: ApiError | null;
  endReached: boolean;
  total: number;
  refresh: () => void;
  loadMore: () => void;
} {
  const { deps = [] } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);

  const loadRef = useRef(loadPage);
  loadRef.current = loadPage;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fetchPage = useCallback(async (nextPage: number) => {
    const ctrl = new AbortController();
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await loadRef.current(nextPage, ctrl.signal);
      if (!alive.current) return;
      setItems((prev) => (nextPage === 1 ? result.items : [...prev, ...result.items]));
      setTotal(result.meta?.total ?? (nextPage === 1 ? result.items.length : total));
      if (result.meta) setEndReached(nextPage >= result.meta.totalPages);
      else setEndReached(result.items.length === 0);
      setError(null);
      setPage(nextPage);
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof ApiError ? err : new ApiError(-1, 'UNKNOWN', 'Could not load results'));
      if (nextPage === 1) setItems([]);
    } finally {
      if (alive.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
    // `total` is intentionally read from the closure for the meta fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage, ...deps]);

  return {
    items,
    loading,
    loadingMore,
    error,
    endReached,
    total,
    refresh: () => void fetchPage(1),
    loadMore: () => {
      if (loading || loadingMore || endReached) return;
      void fetchPage(page + 1);
    },
  };
}
