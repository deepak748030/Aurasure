import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { riderApi, type Rider } from '@/api/rider';
import { logoutSession, restoreRiderSession } from '@/api/session';

interface Ctx {
  ready: boolean;
  rider: Rider | null;
  setRider: (r: Rider | null) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const C = createContext<Ctx | null>(null);

export function RiderProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [rider, setRider] = useState<Rider | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void restoreRiderSession()
      .then((r) => setRider(r))
      .finally(() => setReady(true));
  }, []);

  const refresh = useCallback(async () => {
    const data = await riderApi.me();
    setRider(data.rider);
  }, []);

  const logout = useCallback(() => {
    logoutSession();
    setRider(null);
  }, []);

  const value = useMemo(() => ({ ready, rider, setRider, refresh, logout }), [ready, rider, refresh, logout]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useRider(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useRider');
  return ctx;
}
