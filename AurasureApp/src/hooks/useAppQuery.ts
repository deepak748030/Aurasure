'use strict';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiEnabled } from '@/api/config';

export interface QueryState<T> {
  data: T;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  /** Which source produced the current data: live server or mock fallback. */
  source: 'api' | 'mock';
}

export interface UseAppQueryOptions {
  /** Skeleton delay in mock mode (kept identical to the old useMockQuery). */
  delay?: number;
  /** Re-run the data load when these change (e.g. active module). */
  deps?: readonly unknown[];
}

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Hybrid data hook:
 *  - No `EXPO_PUBLIC_API_URL`  → identical to the old mock query behaviour
 *    (sync producer + simulated delay), so the app is fully usable offline.
 *  - URL configured            → fetches from the Aurasure server; on any
 *    failure (network, 503, 404...) it silently falls back to mock data,
 *    so the screens never break.
 */
export function useAppQuery<T>(
  fetcher: () => Promise<T>,
  fallback: () => T,
  options: UseAppQueryOptions = {},
): QueryState<T> {
  const { delay = 900, deps = [] } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const [data, setData] = useState<T>(() => fallbackRef.current());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<'api' | 'mock'>('mock');

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      abort.current?.abort();
    };
  }, []);

  const load = useCallback(
    (isRefresh: boolean): void => {
      if (timer.current) clearTimeout(timer.current);

      // Mock mode: simulate an async source exactly like `useMockQuery`.
      if (!isApiEnabled) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        timer.current = setTimeout(() => {
          setData(fallbackRef.current());
          setSource('mock');
          if (isRefresh) setRefreshing(false);
          else setLoading(false);
        }, isRefresh ? 650 : delay);
        return;
      }

      // Server mode: fetch with a hard timeout + graceful mock fallback.
      if (isRefresh) setRefreshing(true);
      else {
        setLoading(true);
        // When the screen re-mounts (or its deps change), swap immediately to
        // the matching mock so a previous module's data never flashes.
        setData(fallbackRef.current());
      }

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      (async () => {
        try {
          const result = await fetcherRef.current();
          if (!alive.current || controller.signal.aborted) return;
          if (result == null) throw new Error('Remote data unavailable');
          setData(result);
          setSource('api');
        } catch (err) {
          if (!alive.current) return;
          console.warn('[aurasure-api] server unavailable, using mock data:', err instanceof Error ? err.message : err);
          setData(fallbackRef.current());
          setSource('mock');
        } finally {
          clearTimeout(timeout);
          if (alive.current) {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
          }
        }
      })();
    },
    [delay],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(false);
    // `deps` lets module-dependent screens re-fetch on module switch.
  }, [load, ...deps]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, refreshing, refresh, source };
}
