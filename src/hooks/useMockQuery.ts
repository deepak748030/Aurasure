import { useCallback, useEffect, useRef, useState } from 'react';

export interface QueryState<T> {
  data: T;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

// Simulates an async data source backed by mock data: shows an initial skeleton
// state, and supports pull-to-refresh.
export function useMockQuery<T>(producer: () => T, delay = 900): QueryState<T> {
  const producerRef = useRef(producer);
  producerRef.current = producer;

  const [data, setData] = useState<T>(() => producerRef.current());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(
    (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setData(producerRef.current());
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }, isRefresh ? 650 : delay);
    },
    [delay],
  );

  useEffect(() => {
    load(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, refreshing, refresh };
}
